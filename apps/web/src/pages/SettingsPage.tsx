import { useMutation, useQuery } from '@apollo/client';
import {
  APP_SETTINGS_DEFAULT,
  DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
  DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK,
  TOUR_LIST_RENTAL_ITEM_LABELS,
  collectFlightTimeSettingsIssues,
  evaluateRentalItemQuantityFormula,
  getSharedRentalItemCount,
  getCurrentRentalItemPreset,
  renderRentalItemPresetText,
  tourListRentalItemTypes,
  validateRentalItemSharedQuantityRules,
  type FlightTimeSettings,
  type RentalItemPreset,
  type RentalItemPresetItem,
  type RentalItemSharedQuantityRule,
  type TourListRentalItemStock,
  type TourListRentalItemType,
} from '@tour/validation';
import { Button, Card } from '@tour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createFlightTimeSettingsDraft,
  FlightTimeSettingsEditor,
} from '../features/app-settings/FlightTimeSettingsEditor';
import {
  AppSettingsDocument,
  UpdateAppSettingsDocument,
  type AppSettingsInput,
} from '../generated/graphql';
import {
  MOVEMENT_INTENSITY_ORDER,
  getMovementIntensityMeta,
  normalizeMovementIntensityColorSettings,
  type MovementIntensityColorSetting,
  type MovementIntensityValue,
} from '../features/estimate/model/movement-intensity';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const CUSTOM_FORMULA_OPTION_VALUE = '__custom__';
const RENTAL_ITEM_FORMULA_OPTIONS = [
  { value: '1', label: '고정 1개' },
  { value: '전체인원', label: '전체인원만큼' },
  { value: '공용수량', label: '공용수량 사용' },
  { value: '올림(전체인원 / 2)', label: '전체인원 절반(올림)' },
] as const;

function getFormulaSelectValue(formula: string): string {
  return RENTAL_ITEM_FORMULA_OPTIONS.some((option) => option.value === formula)
    ? formula
    : CUSTOM_FORMULA_OPTION_VALUE;
}

function toDraftFromSettings(colors: readonly MovementIntensityColorSetting[] | null | undefined): MovementIntensityColorSetting[] {
  return normalizeMovementIntensityColorSettings(colors);
}

function toRentalPresetDraft(presets: readonly RentalItemPreset[] | null | undefined): RentalItemPreset[] {
  const source = presets && presets.length > 0 ? presets : APP_SETTINGS_DEFAULT.rentalItemPresets;
  const currentId = getCurrentRentalItemPreset(source).id;
  return source.map((preset) => ({
    ...preset,
    current: preset.id === currentId,
    sharedQuantityRules: (preset.sharedQuantityRules?.length ? preset.sharedQuantityRules : DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES)
      .map((rule) => ({ ...rule })),
    items: preset.items.map((item) => ({ ...item })),
  }));
}

function toTourListRentalStockDraft(
  stock: { drone: number; starlink: number; powerbank: number } | null | undefined,
): TourListRentalItemStock {
  if (!stock) {
    return { ...DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK };
  }
  return {
    DRONE: stock.drone,
    STARLINK: stock.starlink,
    POWERBANK: stock.powerbank,
  };
}

function toMutationInput(
  colors: readonly MovementIntensityColorSetting[],
  rentalItemPresets: readonly RentalItemPreset[],
  tourListRentalItemStock: TourListRentalItemStock,
  flightTimeSettings: FlightTimeSettings,
): AppSettingsInput {
  return {
    movementIntensityColors: colors.map((item) => ({
      level: item.level as AppSettingsInput['movementIntensityColors'][number]['level'],
      color: item.color,
    })),
    rentalItemPresets: rentalItemPresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      current: preset.current,
      sharedQuantityRules: preset.sharedQuantityRules.map((rule) => ({
        id: rule.id,
        minHeadcount: rule.minHeadcount,
        maxHeadcount: rule.maxHeadcount,
        quantity: rule.quantity,
      })),
      items: preset.items.map((item) => ({
        id: item.id,
        label: item.label,
        unit: item.unit,
        quantityFormula: item.quantityFormula,
      })),
    })),
    tourListRentalItemStock: {
      drone: tourListRentalItemStock.DRONE,
      starlink: tourListRentalItemStock.STARLINK,
      powerbank: tourListRentalItemStock.POWERBANK,
    },
    flightTimeSettings: {
      inTimeShortcuts: [...flightTimeSettings.inTimeShortcuts],
      outTimeShortcuts: [...flightTimeSettings.outTimeShortcuts],
      defaultInTime: flightTimeSettings.defaultInTime,
      defaultOutTime: flightTimeSettings.defaultOutTime,
    },
  };
}

function formatUpdatedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleString('ko-KR');
}

function createId(prefix: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function createRentalPreset(): RentalItemPreset {
  return {
    id: createId('rental-preset'),
    name: '새 프리셋',
    current: false,
    sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES.map((rule) => ({
      ...rule,
      id: createId('shared-rule'),
    })),
    items: [
      {
        id: createId('rental-item'),
        label: '새 항목',
        unit: '개',
        quantityFormula: '1',
      },
    ],
  };
}

function createSharedQuantityRule(): RentalItemSharedQuantityRule {
  return {
    id: createId('shared-rule'),
    minHeadcount: 1,
    maxHeadcount: null,
    quantity: 1,
  };
}

function createRentalPresetItem(): RentalItemPresetItem {
  return {
    id: createId('rental-item'),
    label: '새 항목',
    unit: '개',
    quantityFormula: '1',
  };
}

type AppSettingsSection = 'movement-intensity' | 'rental-items' | 'tour-list-rental-stock' | 'flight-times';

const settingsMenuItems: Array<{
  path: string;
  title: string;
  description: string;
}> = [
  {
    path: '/settings/movement-intensity',
    title: '이동강도',
    description: '일정표와 견적서에 표시되는 이동강도 색상을 관리합니다.',
  },
  {
    path: '/settings/flight-times',
    title: '항공 시간',
    description: '일정빌더·견적·상담에 공통 적용되는 항공 IN/OUT 단축키와 자동 초기값을 관리합니다.',
  },
  {
    path: '/settings/rental-items',
    title: '물품대여',
    description: '일정빌더 기본 대여물품 프리셋과 수량 계산 조건을 관리합니다.',
  },
  {
    path: '/settings/tour-list-rental-stock',
    title: '투어리스트 장비 재고',
    description: '드론, 스타링크, 파워뱅크의 최대 보유 수량을 관리합니다.',
  },
];

export function SettingsPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">설정</h1>
        <p className="mt-2 text-sm text-slate-500">관리할 설정 메뉴를 선택해 주세요.</p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-3">
        <nav className="grid gap-2 md:grid-cols-2" aria-label="설정 메뉴">
        {settingsMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="block rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
          >
              <div className="text-base font-medium text-slate-900">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              <div className="mt-4 text-sm font-medium text-blue-700">설정하기</div>
          </Link>
        ))}
        </nav>
      </Card>
    </div>
  );
}

function AppSettingsSectionPage({ section }: { section: AppSettingsSection }): JSX.Element {
  const { data, loading, refetch } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateSettings, { loading: saving }] = useMutation(UpdateAppSettingsDocument);
  const [colorDraft, setColorDraft] = useState<MovementIntensityColorSetting[]>(
    () => APP_SETTINGS_DEFAULT.movementIntensityColors,
  );
  const [rentalPresetDraft, setRentalPresetDraft] = useState<RentalItemPreset[]>(
    () => toRentalPresetDraft(APP_SETTINGS_DEFAULT.rentalItemPresets),
  );
  const [tourListRentalStockDraft, setTourListRentalStockDraft] = useState<TourListRentalItemStock>(
    () => ({ ...DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK }),
  );
  const [flightTimeDraft, setFlightTimeDraft] = useState<FlightTimeSettings>(() =>
    createFlightTimeSettingsDraft(),
  );
  const [customFormulaItemIds, setCustomFormulaItemIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      setColorDraft(toDraftFromSettings(
        data.appSettings.movementIntensityColors.map((item) => ({
          level: item.level as MovementIntensityValue,
          color: item.color,
        })),
      ));
      setRentalPresetDraft(toRentalPresetDraft(data.appSettings.rentalItemPresets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        current: preset.current,
        sharedQuantityRules: preset.sharedQuantityRules.map((rule) => ({
          id: rule.id,
          minHeadcount: rule.minHeadcount,
          maxHeadcount: rule.maxHeadcount ?? null,
          quantity: rule.quantity,
        })),
        items: preset.items.map((item) => ({
          id: item.id,
          label: item.label,
          unit: item.unit,
          quantityFormula: item.quantityFormula,
        })),
      }))));
      setTourListRentalStockDraft(toTourListRentalStockDraft(data.appSettings.tourListRentalItemStock));
      setFlightTimeDraft(createFlightTimeSettingsDraft(data.appSettings.flightTimeSettings));
      setCustomFormulaItemIds(new Set());
    }
  }, [data]);

  const invalidLevels = useMemo(
    () => colorDraft.filter((item) => !HEX_COLOR_PATTERN.test(item.color)).map((item) => item.level),
    [colorDraft],
  );
  const invalidRentalFormulaIds = useMemo(
    () =>
      rentalPresetDraft.flatMap((preset) =>
        preset.items
          .filter((item) => {
            try {
              evaluateRentalItemQuantityFormula(item.quantityFormula, 6, preset);
              return false;
            } catch {
              return true;
            }
          })
          .map((item) => item.id),
      ),
    [rentalPresetDraft],
  );
  const sharedRuleIssuesByPresetId = useMemo(
    () =>
      new Map(
        rentalPresetDraft.map((preset) => [
          preset.id,
          validateRentalItemSharedQuantityRules(preset.sharedQuantityRules),
        ] as const),
      ),
    [rentalPresetDraft],
  );
  const hasInvalidRentalPreset = useMemo(
    () =>
      rentalPresetDraft.length === 0 ||
      rentalPresetDraft.some(
        (preset) =>
          !preset.name.trim() ||
          (sharedRuleIssuesByPresetId.get(preset.id)?.length ?? 0) > 0 ||
          preset.items.length === 0 ||
          preset.items.some((item) => !item.label.trim() || !item.quantityFormula.trim()),
      ) ||
      rentalPresetDraft.filter((preset) => preset.current).length !== 1 ||
      invalidRentalFormulaIds.length > 0,
    [invalidRentalFormulaIds.length, rentalPresetDraft, sharedRuleIssuesByPresetId],
  );
  const hasInvalidTourListRentalStock = useMemo(
    () =>
      tourListRentalItemTypes.some((item) => {
        const value = tourListRentalStockDraft[item];
        return !Number.isInteger(value) || value < 0 || value > 1000;
      }),
    [tourListRentalStockDraft],
  );
  const flightTimeIssues = useMemo(() => collectFlightTimeSettingsIssues(flightTimeDraft), [flightTimeDraft]);
  const canSave =
    invalidLevels.length === 0 &&
    !hasInvalidRentalPreset &&
    !hasInvalidTourListRentalStock &&
    flightTimeIssues.length === 0 &&
    !saving;

  const colorByLevel = useMemo(
    () => new Map(colorDraft.map((item) => [item.level, item.color] as const)),
    [colorDraft],
  );
  const currentRentalPreset = useMemo(
    () => getCurrentRentalItemPreset(rentalPresetDraft),
    [rentalPresetDraft],
  );
  const rentalPresetPreview = useMemo(
    () => renderRentalItemPresetText(currentRentalPreset, 6),
    [currentRentalPreset],
  );
  const sharedRulePreview = useMemo(
    () =>
      [1, 4, 5, 8, 9, 10].map((headcount) => ({
        headcount,
        quantity: getSharedRentalItemCount(headcount, currentRentalPreset.sharedQuantityRules),
      })),
    [currentRentalPreset],
  );

  const updateColor = useCallback((level: MovementIntensityValue, color: string) => {
    setColorDraft((current) => {
      const currentColorByLevel = new Map(current.map((item) => [item.level, item.color] as const));
      return MOVEMENT_INTENSITY_ORDER.map((itemLevel) => ({
        level: itemLevel,
        color: itemLevel === level
          ? color
          : currentColorByLevel.get(itemLevel) ??
            APP_SETTINGS_DEFAULT.movementIntensityColors.find((item) => item.level === itemLevel)!.color,
      }));
    });
    setFeedback(null);
  }, []);

  const handleResetMovementIntensityDefaults = useCallback(() => {
    setColorDraft(APP_SETTINGS_DEFAULT.movementIntensityColors.map((item) => ({ ...item })));
    setFeedback({ type: 'ok', message: '이동강도 색상을 기본값으로 채웠습니다. 저장하면 반영됩니다.' });
  }, []);

  const handleResetTourListRentalStockDefaults = useCallback(() => {
    setTourListRentalStockDraft({ ...DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK });
    setFeedback({ type: 'ok', message: '투어리스트 장비 재고를 기본값으로 채웠습니다. 저장하면 반영됩니다.' });
  }, []);

  const updateTourListRentalStock = useCallback((item: TourListRentalItemType, total: number) => {
    setTourListRentalStockDraft((current) => ({ ...current, [item]: total }));
    setFeedback(null);
  }, []);

  const handleResetRentalItemDefaults = useCallback(() => {
    setRentalPresetDraft(toRentalPresetDraft(APP_SETTINGS_DEFAULT.rentalItemPresets));
    setCustomFormulaItemIds(new Set());
    setFeedback({ type: 'ok', message: '대여물품 프리셋을 기본값으로 채웠습니다. 저장하면 반영됩니다.' });
  }, []);

  const updateRentalPreset = useCallback((presetId: string, patch: Partial<Pick<RentalItemPreset, 'name'>>) => {
    setRentalPresetDraft((current) =>
      current.map((preset) => (preset.id === presetId ? { ...preset, ...patch } : preset)),
    );
    setFeedback(null);
  }, []);

  const setCurrentRentalPreset = useCallback((presetId: string) => {
    setRentalPresetDraft((current) =>
      current.map((preset) => ({ ...preset, current: preset.id === presetId })),
    );
    setFeedback(null);
  }, []);

  const addRentalPreset = useCallback(() => {
    setRentalPresetDraft((current) => [...current, createRentalPreset()]);
    setFeedback(null);
  }, []);

  const deleteRentalPreset = useCallback((presetId: string) => {
    setRentalPresetDraft((current) => {
      if (current.length <= 1) {
        return current;
      }
      const next = current.filter((preset) => preset.id !== presetId);
      if (next.some((preset) => preset.current)) {
        return next;
      }
      return next.map((preset, index) => ({ ...preset, current: index === 0 }));
    });
    setFeedback(null);
  }, []);

  const updateSharedQuantityRule = useCallback(
    (
      presetId: string,
      ruleId: string,
      patch: Partial<Pick<RentalItemSharedQuantityRule, 'minHeadcount' | 'maxHeadcount' | 'quantity'>>,
    ) => {
      setRentalPresetDraft((current) =>
        current.map((preset) =>
          preset.id === presetId
            ? {
                ...preset,
                sharedQuantityRules: preset.sharedQuantityRules.map((rule) =>
                  rule.id === ruleId ? { ...rule, ...patch } : rule,
                ),
              }
            : preset,
        ),
      );
      setFeedback(null);
    },
    [],
  );

  const addSharedQuantityRule = useCallback((presetId: string) => {
    setRentalPresetDraft((current) =>
      current.map((preset) =>
        preset.id === presetId
          ? { ...preset, sharedQuantityRules: [...preset.sharedQuantityRules, createSharedQuantityRule()] }
          : preset,
      ),
    );
    setFeedback(null);
  }, []);

  const deleteSharedQuantityRule = useCallback((presetId: string, ruleId: string) => {
    setRentalPresetDraft((current) =>
      current.map((preset) =>
        preset.id === presetId && preset.sharedQuantityRules.length > 1
          ? { ...preset, sharedQuantityRules: preset.sharedQuantityRules.filter((rule) => rule.id !== ruleId) }
          : preset,
      ),
    );
    setFeedback(null);
  }, []);

  const updateRentalPresetItem = useCallback(
    (presetId: string, itemId: string, patch: Partial<Pick<RentalItemPresetItem, 'label' | 'unit' | 'quantityFormula'>>) => {
      setRentalPresetDraft((current) =>
        current.map((preset) =>
          preset.id === presetId
            ? {
                ...preset,
                items: preset.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
              }
            : preset,
        ),
      );
      setFeedback(null);
    },
    [],
  );

  const addRentalPresetItem = useCallback((presetId: string) => {
    setRentalPresetDraft((current) =>
      current.map((preset) =>
        preset.id === presetId ? { ...preset, items: [...preset.items, createRentalPresetItem()] } : preset,
      ),
    );
    setFeedback(null);
  }, []);

  const deleteRentalPresetItem = useCallback((presetId: string, itemId: string) => {
    setRentalPresetDraft((current) =>
      current.map((preset) =>
        preset.id === presetId && preset.items.length > 1
          ? { ...preset, items: preset.items.filter((item) => item.id !== itemId) }
          : preset,
      ),
    );
    setFeedback(null);
  }, []);

  const moveRentalPresetItem = useCallback((presetId: string, itemId: string, direction: -1 | 1) => {
    setRentalPresetDraft((current) =>
      current.map((preset) => {
        if (preset.id !== presetId) {
          return preset;
        }
        const index = preset.items.findIndex((item) => item.id === itemId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= preset.items.length) {
          return preset;
        }
        const items = [...preset.items];
        const [item] = items.splice(index, 1);
        if (!item) {
          return preset;
        }
        items.splice(nextIndex, 0, item);
        return { ...preset, items };
      }),
    );
    setFeedback(null);
  }, []);

  const handleResetFlightTimeDefaults = useCallback(() => {
    setFlightTimeDraft(createFlightTimeSettingsDraft(APP_SETTINGS_DEFAULT.flightTimeSettings));
    setFeedback({ type: 'ok', message: '항공 시간 설정을 기본값으로 채웠습니다. 저장하면 반영됩니다.' });
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      setFeedback({ type: 'err', message: '입력값을 확인해 주세요. 색상, 프리셋 이름, 항목명, 수식이 모두 유효해야 합니다.' });
      return;
    }

    setFeedback(null);
    try {
      await updateSettings({
        variables: {
          input: toMutationInput(colorDraft, rentalPresetDraft, tourListRentalStockDraft, flightTimeDraft),
        },
      });
      await refetch();
      setFeedback({ type: 'ok', message: '저장했습니다.' });
    } catch (error) {
      setFeedback({
        type: 'err',
        message: error instanceof Error ? error.message : '저장에 실패했습니다.',
      });
    }
  }, [canSave, colorDraft, flightTimeDraft, refetch, rentalPresetDraft, tourListRentalStockDraft, updateSettings]);

  const updatedAt = formatUpdatedAt(data?.appSettings.updatedAt);
  const pageTitle =
    section === 'movement-intensity'
      ? '이동강도 설정'
      : section === 'rental-items'
        ? '물품대여 설정'
        : section === 'flight-times'
          ? '항공 시간 설정'
        : '투어리스트 장비 재고 설정';
  const pageDescription =
    section === 'movement-intensity'
      ? '내부 배지와 견적서 일정표 칩에 적용되는 이동강도 색상을 관리합니다.'
      : section === 'rental-items'
        ? '일정빌더 기본 대여물품 프리셋과 인원별 수량 계산 조건을 관리합니다.'
        : section === 'flight-times'
          ? '일정빌더·견적 편집·상담 시간 보정에 사용되는 항공 IN/OUT 단축키와 자동 초기값을 관리합니다.'
        : '드론, 스타링크, 파워뱅크의 최대 보유 수량을 관리합니다. 투어리스트 잔여 수량 계산에 사용됩니다.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link to="/settings" className="text-sm font-medium text-blue-700">
          설정 메뉴
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">{pageDescription}</p>
        {updatedAt ? (
          <p className="mt-2 text-xs text-slate-500">마지막 수정: {updatedAt}</p>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {section === 'movement-intensity' ? (
      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">이동강도 색상</h2>
            <p className="mt-1 text-xs text-slate-500">내부 배지와 견적서 일정표 칩에 적용됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleResetMovementIntensityDefaults} disabled={saving}>
              기본값 복원
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {MOVEMENT_INTENSITY_ORDER.map((level) => {
            const color = colorByLevel.get(level) ?? '#000000';
            const meta = getMovementIntensityMeta(level, colorDraft);
            const isInvalid = !HEX_COLOR_PATTERN.test(color);

            return (
              <div
                key={level}
                className="grid gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-[minmax(120px,1fr)_auto_minmax(150px,180px)] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 min-w-[6rem] items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      backgroundColor: meta?.backgroundColor,
                      borderColor: meta?.borderColor,
                      color: meta?.textColor,
                    }}
                  >
                    {meta?.label ?? level}
                  </span>
                  <span className="text-sm text-slate-600">{level}</span>
                </div>

                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(color) ? color : '#000000'}
                  aria-label={`${meta?.label ?? level} 색상`}
                  onChange={(event) => updateColor(level, event.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />

                <div>
                  <input
                    value={color}
                    onChange={(event) => updateColor(level, event.target.value)}
                    className={`h-10 w-full rounded-lg border px-3 text-sm font-mono uppercase ${
                      isInvalid ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 text-slate-900'
                    }`}
                  />
                  {isInvalid ? <p className="mt-1 text-xs text-red-600">#RRGGBB 형식</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      ) : null}

      {section === 'rental-items' ? (
      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">기본 대여물품 프리셋</h2>
            <p className="mt-1 text-xs text-slate-500">기본 프리셋이 일정빌더 기본 텍스트로 사용됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleResetRentalItemDefaults} disabled={saving}>
              기본값 복원
            </Button>
            <Button type="button" variant="outline" onClick={addRentalPreset} disabled={saving}>
              프리셋 추가
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
              {saving ? '저장 중...' : '대여물품 저장'}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium text-slate-600">6인 기준 미리보기</div>
          <div className="mt-1 text-sm text-slate-900">{rentalPresetPreview}</div>
          <div className="mt-2 text-xs text-slate-500">
            공용수량: {sharedRulePreview.map((item) => `${item.headcount}명 ${item.quantity}개`).join(' / ')}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {rentalPresetDraft.map((preset) => (
            <div key={preset.id} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_auto_auto] md:items-center">
                <label className="grid gap-1 text-xs text-slate-600">
                  프리셋명
                  <input
                    value={preset.name}
                    onChange={(event) => updateRentalPreset(preset.id, { name: event.target.value })}
                    className={`h-10 rounded-lg border px-3 text-sm text-slate-900 ${
                      preset.name.trim() ? 'border-slate-200' : 'border-red-300 bg-red-50'
                    }`}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="currentRentalPreset"
                    checked={preset.current}
                    onChange={() => setCurrentRentalPreset(preset.id)}
                  />
                  기본 프리셋
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => deleteRentalPreset(preset.id)}
                  disabled={saving || rentalPresetDraft.length <= 1}
                >
                  삭제
                </Button>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="hidden grid-cols-[minmax(120px,1fr)_90px_minmax(150px,1fr)_auto] gap-2 px-1 text-xs text-slate-500 md:grid">
                  <span>항목명</span>
                  <span>단위</span>
                  <span>수량 계산식</span>
                  <span>관리</span>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  자주 쓰는 계산식을 선택하세요. 별도 계산이 필요하면 직접 입력에서 전체인원, 공용수량, 올림(), 내림(), 반올림(), 최소(), 최대()를 사용할 수 있습니다.
                </div>
                {preset.items.map((item, index) => {
                  const formulaInvalid = invalidRentalFormulaIds.includes(item.id);
                  const formulaSelectValue = customFormulaItemIds.has(item.id)
                    ? CUSTOM_FORMULA_OPTION_VALUE
                    : getFormulaSelectValue(item.quantityFormula);
                  return (
                    <div
                      key={item.id}
                      className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-[minmax(120px,1fr)_90px_minmax(150px,1fr)_auto] md:items-center"
                    >
                      <input
                        value={item.label}
                        aria-label="항목명"
                        onChange={(event) =>
                          updateRentalPresetItem(preset.id, item.id, { label: event.target.value })
                        }
                        className={`h-10 rounded-lg border px-3 text-sm ${
                          item.label.trim() ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50'
                        }`}
                      />
                      <input
                        value={item.unit}
                        aria-label="단위"
                        onChange={(event) =>
                          updateRentalPresetItem(preset.id, item.id, { unit: event.target.value })
                        }
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      />
                      <div className="grid gap-2">
                        <select
                          value={formulaSelectValue}
                          aria-label="수량 계산식"
                          onChange={(event) => {
                            if (event.target.value === CUSTOM_FORMULA_OPTION_VALUE) {
                              setCustomFormulaItemIds((current) => new Set(current).add(item.id));
                              return;
                            }
                            setCustomFormulaItemIds((current) => {
                              const next = new Set(current);
                              next.delete(item.id);
                              return next;
                            });
                            updateRentalPresetItem(preset.id, item.id, { quantityFormula: event.target.value });
                          }}
                          className={`h-10 rounded-lg border px-3 text-sm ${
                            formulaInvalid || !item.quantityFormula.trim()
                              ? 'border-red-300 bg-red-50 text-red-900'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        >
                          {RENTAL_ITEM_FORMULA_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          <option value={CUSTOM_FORMULA_OPTION_VALUE}>직접 입력</option>
                        </select>
                        {formulaSelectValue === CUSTOM_FORMULA_OPTION_VALUE ? (
                          <input
                            value={item.quantityFormula}
                            aria-label="직접 입력 수량 계산식"
                            placeholder="예: 최대(공용수량, 올림(전체인원 / 3))"
                            onChange={(event) =>
                              updateRentalPresetItem(preset.id, item.id, { quantityFormula: event.target.value })
                            }
                            className={`h-10 rounded-lg border px-3 font-mono text-sm ${
                              formulaInvalid || !item.quantityFormula.trim()
                                ? 'border-red-300 bg-red-50 text-red-900'
                                : 'border-slate-200 bg-white text-slate-900'
                            }`}
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => moveRentalPresetItem(preset.id, item.id, -1)}
                          disabled={index === 0}
                        >
                          위
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => moveRentalPresetItem(preset.id, item.id, 1)}
                          disabled={index === preset.items.length - 1}
                        >
                          아래
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => deleteRentalPresetItem(preset.id, item.id)}
                          disabled={preset.items.length <= 1}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end">
                <Button type="button" variant="outline" onClick={() => addRentalPresetItem(preset.id)}>
                  항목 추가
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-900">공용수량 조건</div>
                    <div className="mt-1 text-xs text-slate-500">
                      공용수량 계산식에 들어갈 값을 인원 구간별로 정합니다. 종료 인원을 비우면 해당 시작 인원 이상으로 적용됩니다.
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => addSharedQuantityRule(preset.id)}>
                    구간 추가
                  </Button>
                </div>

                {(sharedRuleIssuesByPresetId.get(preset.id)?.length ?? 0) > 0 ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {sharedRuleIssuesByPresetId.get(preset.id)?.join(' ')}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2">
                  <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 text-xs text-slate-500 md:grid">
                    <span>시작 인원</span>
                    <span>종료 인원</span>
                    <span>공용수량</span>
                    <span>관리</span>
                  </div>
                  {preset.sharedQuantityRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="grid gap-2 rounded-lg border border-slate-100 bg-white p-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
                    >
                      <input
                        type="number"
                        min={1}
                        value={rule.minHeadcount}
                        aria-label="시작 인원"
                        onChange={(event) =>
                          updateSharedQuantityRule(preset.id, rule.id, {
                            minHeadcount: Number(event.target.value),
                          })
                        }
                        className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        value={rule.maxHeadcount ?? ''}
                        placeholder="이상"
                        aria-label="종료 인원"
                        onChange={(event) =>
                          updateSharedQuantityRule(preset.id, rule.id, {
                            maxHeadcount: event.target.value.trim() ? Number(event.target.value) : null,
                          })
                        }
                        className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        value={rule.quantity}
                        aria-label="공용수량"
                        onChange={(event) =>
                          updateSharedQuantityRule(preset.id, rule.id, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => deleteSharedQuantityRule(preset.id, rule.id)}
                        disabled={preset.sharedQuantityRules.length <= 1}
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
            {saving ? '저장 중...' : '대여물품 저장'}
          </Button>
        </div>
      </Card>
      ) : null}

      {section === 'tour-list-rental-stock' ? (
      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">투어리스트 장비 재고</h2>
            <p className="mt-1 text-xs text-slate-500">
              확정 투어와 일정빌더에서 표시되는 잔여 수량의 최대값입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleResetTourListRentalStockDefaults} disabled={saving}>
              기본값 복원
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {tourListRentalItemTypes.map((item) => {
            const value = tourListRentalStockDraft[item];
            const isInvalid = !Number.isInteger(value) || value < 0 || value > 1000;
            return (
              <div
                key={item}
                className="grid gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-[minmax(120px,1fr)_minmax(150px,180px)] sm:items-center"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{TOUR_LIST_RENTAL_ITEM_LABELS[item]}</div>
                  <div className="mt-1 text-xs text-slate-500">{item}</div>
                </div>
                <div>
                  <label className="grid gap-1 text-xs text-slate-600">
                    최대 보유 수량
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={value}
                      onChange={(event) => updateTourListRentalStock(item, Number(event.target.value))}
                      className={`h-10 rounded-lg border px-3 text-sm ${
                        isInvalid ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 text-slate-900'
                      }`}
                    />
                  </label>
                  {isInvalid ? <p className="mt-1 text-xs text-red-600">0~1000 사이 정수</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      ) : null}

      {section === 'flight-times' ? (
      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">항공 IN/OUT 단축키</h2>
            <p className="mt-1 text-xs text-slate-500">기존 일정 데이터는 변경되지 않으며, 신규 입력과 재적용에만 반영됩니다.</p>
          </div>
          <Button type="button" onClick={() => void handleSave()} disabled={!canSave || loading}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
        <FlightTimeSettingsEditor
          draft={flightTimeDraft}
          onChange={(next) => {
            setFlightTimeDraft(next);
            setFeedback(null);
          }}
          onResetDefaults={handleResetFlightTimeDefaults}
          disabled={saving || loading}
        />
      </Card>
      ) : null}
    </div>
  );
}

export function MovementIntensitySettingsPage(): JSX.Element {
  return <AppSettingsSectionPage section="movement-intensity" />;
}

export function RentalItemSettingsPage(): JSX.Element {
  return <AppSettingsSectionPage section="rental-items" />;
}

export function TourListRentalStockSettingsPage(): JSX.Element {
  return <AppSettingsSectionPage section="tour-list-rental-stock" />;
}

export function FlightTimeSettingsPage(): JSX.Element {
  return <AppSettingsSectionPage section="flight-times" />;
}
