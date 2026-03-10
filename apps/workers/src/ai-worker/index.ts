import { CafeLeadStatus, OutreachReviewStatus, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { cafeLeadNeedsSchema, outreachDraftCreateSchema } from '@tour/validation';
import { extractContacts } from '../lib/contacts';
import { getWorkerEnv } from '../lib/env';
import { textToHtmlParagraphs } from '../lib/html';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';
import { DEFAULT_MODEL_NAME, DRAFT_PROMPT_VERSION, NEEDS_PROMPT_VERSION, buildDraftPrompt, buildNeedsPrompt } from './prompt';

function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON object not found in model response');
  }

  return JSON.parse(text.slice(start, end + 1));
}

async function runJsonPrompt<T>(client: OpenAI, prompt: string): Promise<T> {
  const response = await client.responses.create({
    model: DEFAULT_MODEL_NAME,
    input: prompt,
  });

  return extractJsonObject(response.output_text) as T;
}

async function processLead(client: OpenAI, leadId: string, logger: ReturnType<typeof createRunContext>['logger']) {
  const lead = await prisma.cafeLead.findUnique({
    where: { id: leadId },
    include: {
      outreachDrafts: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!lead || !lead.rawText) {
    return;
  }

  const contacts = extractContacts(lead.rawText);
  const metadataString = JSON.stringify(lead.rawMetadataJson ?? {});
  const needsPayload = await runJsonPrompt<Record<string, unknown>>(
    client,
    buildNeedsPrompt({
      title: lead.title,
      body: lead.rawText,
      metadata: metadataString,
    }),
  );
  const parsedNeeds = cafeLeadNeedsSchema.parse(needsPayload);

  const draftPayload = await runJsonPrompt<Record<string, unknown>>(
    client,
    buildDraftPrompt({
      title: lead.title,
      body: lead.rawText,
      needs: parsedNeeds,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    }),
  );
  const parsedDraft = outreachDraftCreateSchema.parse({
    ...draftPayload,
    bodyHtml:
      typeof draftPayload.bodyHtml === 'string' && draftPayload.bodyHtml.trim().length > 0
        ? draftPayload.bodyHtml
        : textToHtmlParagraphs(String(draftPayload.bodyText ?? '')),
  });

  await prisma.$transaction(async (tx) => {
    const nextMetadata = {
      ...((lead.rawMetadataJson as Record<string, unknown> | null) ?? {}),
      contacts: {
        email: contacts.email,
        phone: contacts.phone,
        kakaoId: contacts.kakaoId,
      },
    } satisfies Prisma.InputJsonValue;

    await tx.cafeLead.update({
      where: { id: lead.id },
      data: {
        parsedNeedsJson: parsedNeeds as Prisma.InputJsonValue,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
        leadScore: parsedNeeds.leadScore,
        rawMetadataJson: nextMetadata,
        status: CafeLeadStatus.PARSED,
        failReason: null,
      },
    });

    const maxVersion = lead.outreachDrafts[0]?.version ?? 0;
    await tx.outreachDraft.create({
      data: {
        cafeLeadId: lead.id,
        version: maxVersion + 1,
        subject: parsedDraft.subject,
        previewText: parsedDraft.previewText ?? null,
        bodyText: parsedDraft.bodyText,
        bodyHtml: parsedDraft.bodyHtml,
        promptVersion: `${NEEDS_PROMPT_VERSION}/${DRAFT_PROMPT_VERSION}`,
        modelName: DEFAULT_MODEL_NAME,
        qualityScore: parsedDraft.qualityScore ?? parsedNeeds.leadScore,
        reviewStatus: OutreachReviewStatus.PENDING,
      },
    });

    await tx.cafeLead.update({
      where: { id: lead.id },
      data: {
        status: CafeLeadStatus.DRAFTED,
      },
    });
  });

  logger.info({ leadId: lead.id, articleId: lead.articleId }, 'AI parsing and draft generation completed');
}

async function main() {
  const env = getWorkerEnv();
  const { logger } = createRunContext('worker-ai');
  const client = new OpenAI({ apiKey: env.openAiApiKey });

  const leads = await prisma.cafeLead.findMany({
    where: {
      status: {
        in: [CafeLeadStatus.FETCHED, CafeLeadStatus.PARSED],
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true },
  });

  logger.info({ count: leads.length }, 'worker-ai started');

  for (const lead of leads) {
    try {
      await processLead(client, lead.id, logger);
    } catch (error) {
      await prisma.cafeLead.update({
        where: { id: lead.id },
        data: {
          status: CafeLeadStatus.FAILED,
          failReason: String(error),
        },
      });
      logger.error({ leadId: lead.id, error: String(error) }, 'AI processing failed');
    }
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
