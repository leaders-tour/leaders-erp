import type { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import {
  consultationExtractionSchema,
  parseConsultationTemplatePick,
  type ConsultationExtraction,
} from '@tour/validation';
import { buildExtractionPrompt } from './consultation.prompt';
import {
  applyYearlessSlashDateFallback,
  formatReferenceDateKst,
} from './consultation-yearless-dates';
import { buildTemplateRecommendationPrompt } from './consultation.template-prompt';

/** gpt-4o-mini: Input $0.15/M, Output $0.60/M — 상담 추출용으로 충분하고 비용 효율적 */
const DEFAULT_MODEL = 'gpt-4o-mini';

function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON object not found in model response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const m = /^(\d{1,2})시\s*(\d{1,2})분?$|^(\d{1,2}):(\d{2})$|^새벽\s*(\d{1,2})시\s*(\d{1,2})분?$/i.exec(
    value.trim(),
  );
  if (m) {
    let h: number;
    let min: number;
    if (m[5] != null) {
      h = Number(m[5]);
      if (h >= 1 && h <= 5) h += 0; // 새벽 4시 = 04
      min = Number(m[6] ?? 0);
    } else if (m[3] != null) {
      h = Number(m[3]);
      min = Number(m[4] ?? 0);
    } else {
      h = Number(m[1]);
      min = Number(m[2] ?? 0);
    }
    if (value.toLowerCase().includes('오후') && h < 12) h += 12;
    if (value.toLowerCase().includes('오전') && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  if (/^([01]?\d|2[0-3]):([0-5]\d)$/.test(value.trim())) {
    return value.trim();
  }
  return null;
}

/** 빌더에 바로 넣을 수 있는 초안 타입 */
export interface ConsultationDraft {
  leaderName: string;
  headcountTotal: number;
  headcountMale: number;
  headcountFemale: number;
  regionSetId: string | null;
  regionName: string | null;
  travelStartDate: string;
  travelEndDate: string;
  totalDays: number;
  vehicleType: string | null;
  flightInDate: string | null;
  flightInTime: string | null;
  flightOutDate: string | null;
  flightOutTime: string | null;
  movementIntensity: string | null;
  lodgingLevel: string | null;
  specialNote: string;
  remark: string;
  warnings: string[];
  recommendedTemplateId: string | null;
  recommendedTemplateName: string | null;
  recommendedTemplateReason: string | null;
}

const FLIGHT_IN_TIMES = ['00:05', '00:30', '00:50', '02:45', '04:30', '13:20', '17:00', '23:05', '23:30'];
const FLIGHT_OUT_TIMES = ['00:25', '00:50', '01:30', '01:50', '02:05', '08:40', '13:00', '18:15', '20:30'];
const VEHICLES = ['스타렉스', '푸르공', '벨파이어', '하이에이스'] as const;

function pickClosestTime(options: readonly string[], target: string): string {
  if (!target || target.length < 4) return options[0] ?? '02:45';
  const [th, tm] = target.split(':').map(Number);
  const targetMin = (th ?? 0) * 60 + (tm ?? 0);
  let best = options[0] ?? '02:45';
  let bestDiff = Infinity;
  for (const opt of options) {
    const [oh, om] = opt.split(':').map(Number);
    const optMin = (oh ?? 0) * 60 + (om ?? 0);
    const diff = Math.abs(optMin - targetMin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt;
    }
  }
  return best;
}

export class ConsultationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly openai: OpenAI | null,
  ) {}

  async extract(rawText: string): Promise<ConsultationExtraction> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const referenceDateIso = formatReferenceDateKst();
    const prompt = buildExtractionPrompt(rawText, referenceDateIso);
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content) as unknown;
    const extraction = consultationExtractionSchema.parse(parsed);
    return applyYearlessSlashDateFallback(rawText, extraction, referenceDateIso);
  }

  async toDraft(rawText: string): Promise<ConsultationDraft> {
    const extraction = await this.extract(rawText);
    const base = await this.extractionToDraft(extraction);
    const templateRec = await this.recommendPlanTemplate(rawText, extraction, base);
    return { ...base, ...templateRec };
  }

  async extractionToDraft(extraction: ConsultationExtraction): Promise<ConsultationDraft> {
    const warnings: string[] = [];

    const leaderName = extraction.contact.name?.trim() ?? '';

    const total = extraction.headcount.total ?? 6;
    let male = extraction.headcount.male;
    let female = extraction.headcount.female;
    if (male == null && female == null) {
      male = Math.ceil(total / 2);
      female = total - male;
    } else if (male == null) {
      male = Math.max(0, total - (female ?? 0));
    } else if (female == null) {
      female = Math.max(0, total - male);
    }

    const region = await this.resolveRegion(extraction.destinationPreference.rawText);
    const regionSetId = region?.defaultRegionSetId ?? null;
    const regionName = (region?.name ?? extraction.destinationPreference.rawText) || null;
    if (!region && extraction.destinationPreference.rawText?.trim()) {
      warnings.push(`지역 "${extraction.destinationPreference.rawText}" 매칭 실패. 수동 선택 필요.`);
    }

    const inbound = extraction.flightOrBorder?.inbound;
    const outbound = extraction.flightOrBorder?.outbound;

    let startDate = extraction.tourDates.startDate?.trim() ?? '';
    let endDate = extraction.tourDates.endDate?.trim() ?? '';
    if (!startDate && inbound?.date?.trim()) {
      startDate = inbound.date.trim();
    }
    if (!endDate && outbound?.date?.trim()) {
      endDate = outbound.date.trim();
    }

    const totalDays =
      startDate && endDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000),
            ) + 1,
          )
        : 6;

    let vehicleType: string | null = null;
    const mentioned = extraction.vehicle.mentionedTypes ?? [];
    for (const v of VEHICLES) {
      if (mentioned.some((m) => m.includes(v) || v.includes(m))) {
        vehicleType = v;
        break;
      }
    }
    if (!vehicleType && extraction.vehicle.wantsVehicle && mentioned.length > 0) {
      vehicleType = '스타렉스';
    }
    const flightInDate = (inbound?.date ?? startDate) || null;
    const flightOutDate = (outbound?.date ?? endDate) || null;
    const rawInTime = inbound?.time ?? null;
    const rawOutTime = outbound?.time ?? null;
    const flightInTime = rawInTime
      ? pickClosestTime(FLIGHT_IN_TIMES, normalizeTime(rawInTime) ?? rawInTime)
      : '02:45';
    const flightOutTime = rawOutTime
      ? pickClosestTime(FLIGHT_OUT_TIMES, normalizeTime(rawOutTime) ?? rawOutTime)
      : '18:15';

    const movementIntensity = extraction.movementIntensity.level1to5
      ? `LEVEL_${extraction.movementIntensity.level1to5}` as const
      : null;

    const lodgingLevel = extraction.lodgingPreference.suggestedLevel ?? null;

    const finalMale = male ?? Math.ceil(total / 2);
    const finalFemale = female ?? total - finalMale;

    return {
      leaderName,
      headcountTotal: total,
      headcountMale: finalMale,
      headcountFemale: finalFemale,
      regionSetId,
      regionName,
      travelStartDate: startDate,
      travelEndDate: endDate,
      totalDays,
      vehicleType,
      flightInDate,
      flightInTime,
      flightOutDate,
      flightOutTime,
      movementIntensity,
      lodgingLevel,
      specialNote: extraction.specialRequests?.trim() ?? '',
      remark: '',
      warnings,
      recommendedTemplateId: null,
      recommendedTemplateName: null,
      recommendedTemplateReason: null,
    };
  }

  private async listActiveTemplateCandidates(
    regionSetId: string,
    totalDays: number,
  ): Promise<Array<{ id: string; name: string; description: string | null }>> {
    return this.prisma.planTemplate.findMany({
      where: { regionSetId, totalDays, isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  private async recommendPlanTemplate(
    rawText: string,
    extraction: ConsultationExtraction,
    base: ConsultationDraft,
  ): Promise<{
    recommendedTemplateId: string | null;
    recommendedTemplateName: string | null;
    recommendedTemplateReason: string | null;
  }> {
    const empty = {
      recommendedTemplateId: null,
      recommendedTemplateName: null,
      recommendedTemplateReason: null,
    };
    if (!base.regionSetId || base.totalDays < 1) {
      return empty;
    }

    const candidates = await this.listActiveTemplateCandidates(base.regionSetId, base.totalDays);
    if (candidates.length === 0) {
      return empty;
    }

    if (candidates.length === 1) {
      const only = candidates[0]!;
      return {
        recommendedTemplateId: only.id,
        recommendedTemplateName: only.name,
        recommendedTemplateReason:
          '이 지역과 일정 일수에 맞는 활성 템플릿이 하나뿐이라 자동으로 선택되었습니다.',
      };
    }

    if (!this.openai) {
      return empty;
    }

    const allowedIds = new Set(candidates.map((c) => c.id));
    const movementIntensityLabel =
      extraction.movementIntensity.rawLabel?.trim() ||
      (base.movementIntensity ? base.movementIntensity.replace('LEVEL_', '레벨') : null);

    const prompt = buildTemplateRecommendationPrompt({
      rawText,
      destinationRaw: extraction.destinationPreference.rawText,
      movementIntensityLabel,
      lodgingLevel: base.lodgingLevel,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })),
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });
      const content = response.choices[0]?.message?.content ?? '';
      const parsed = extractJsonObject(content) as unknown;
      const { chosenId, reason } = parseConsultationTemplatePick(parsed, allowedIds);
      if (!chosenId) {
        return empty;
      }
      const chosen = candidates.find((c) => c.id === chosenId);
      if (!chosen) {
        return empty;
      }
      return {
        recommendedTemplateId: chosen.id,
        recommendedTemplateName: chosen.name,
        recommendedTemplateReason:
          reason ??
          `고객 상담 내용과 가장 잘 맞는 것으로 "${chosen.name}" 템플릿을 선택했습니다.`,
      };
    } catch {
      return empty;
    }
  }

  private async resolveRegion(
    keyword: string,
  ): Promise<{ id: string; name: string; defaultRegionSetId: string | null } | null> {
    const k = keyword?.trim();
    if (!k) return null;

    const regions = await this.prisma.region.findMany({
      select: { id: true, name: true, defaultRegionSetId: true },
    });

    const lower = k.toLowerCase();
    const exact = regions.find((r) => r.name.toLowerCase() === lower);
    if (exact) return exact;

    const contains = regions.find((r) => r.name.toLowerCase().includes(lower) || lower.includes(r.name.toLowerCase()));
    if (contains) return contains;

    const tokenMatch = regions.find((r) => {
      const tokens = k.replace(/[^\p{L}\p{N}]/gu, ' ').split(/\s+/).filter(Boolean);
      return tokens.some((t) => r.name.toLowerCase().includes(t));
    });
    return tokenMatch ?? null;
  }
}
