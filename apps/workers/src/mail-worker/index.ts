import { CafeLeadStatus, OutboundDeliveryStatus, OutreachReviewStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import { getWorkerEnv } from '../lib/env';
import { prisma } from '../lib/prisma';
import { createRunContext } from '../lib/run-context';

const MAX_EMAILS_PER_HOUR = 30;
const FOOTER_TEXT = [
  '',
  '이 메일은 여행 견적 문의 글을 보고 여행 정보를 제공하기 위해 보내드렸습니다.',
  '',
  '더 이상 메일을 받고 싶지 않으시면',
  '답장으로 "수신거부"라고 보내주세요.',
].join('\n');

const FOOTER_HTML = [
  '<hr />',
  '<p>이 메일은 여행 견적 문의 글을 보고 여행 정보를 제공하기 위해 보내드렸습니다.</p>',
  '<p>더 이상 메일을 받고 싶지 않으시면<br />답장으로 "수신거부"라고 보내주세요.</p>',
].join('');

async function main() {
  const env = getWorkerEnv();
  const { logger } = createRunContext('worker-mail');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.gmailUser,
      pass: env.gmailAppPassword,
    },
  });

  const approvedDrafts = await prisma.outreachDraft.findMany({
    where: {
      reviewStatus: OutreachReviewStatus.APPROVED,
      outboundMessages: {
        none: {
          deliveryStatus: OutboundDeliveryStatus.SENT,
        },
      },
      cafeLead: {
        contactEmail: {
          not: null,
        },
      },
    },
    include: {
      cafeLead: true,
    },
    orderBy: [{ reviewedAt: 'asc' }, { updatedAt: 'asc' }],
  });

  logger.info({ count: approvedDrafts.length }, 'worker-mail started');

  for (const draft of approvedDrafts) {
    const recipient = draft.cafeLead.contactEmail?.trim().toLowerCase() ?? null;
    if (!recipient) {
      continue;
    }

    const suppressed = await prisma.contactSuppression.findUnique({
      where: { email: recipient },
      select: { isActive: true },
    });
    if (suppressed?.isActive) {
      logger.warn({ draftId: draft.id, recipient }, 'Suppressed contact skipped');
      continue;
    }

    const sentLastHour = await prisma.outboundMessage.count({
      where: {
        deliveryStatus: OutboundDeliveryStatus.SENT,
        sentAt: {
          gte: new Date(Date.now() - 60 * 60 * 1_000),
        },
      },
    });
    if (sentLastHour >= MAX_EMAILS_PER_HOUR) {
      logger.warn({ sentLastHour }, 'Hourly mail limit reached, stopping this run');
      break;
    }

    const message = await prisma.outboundMessage.create({
      data: {
        draftId: draft.id,
        channel: 'EMAIL',
        toEmail: recipient,
        deliveryStatus: OutboundDeliveryStatus.QUEUED,
        provider: env.mailProvider,
      },
    });

    try {
      const result = await transporter.sendMail({
        from: env.mailFrom,
        to: recipient,
        subject: draft.subject,
        text: `${draft.bodyText.trim()}\n${FOOTER_TEXT}`,
        html: `${draft.bodyHtml}${FOOTER_HTML}`,
      });

      await prisma.$transaction(async (tx) => {
        await tx.outboundMessage.update({
          where: { id: message.id },
          data: {
            deliveryStatus: OutboundDeliveryStatus.SENT,
            providerMessageId: result.messageId,
            sentAt: new Date(),
          },
        });

        await tx.cafeLead.update({
          where: { id: draft.cafeLeadId },
          data: {
            status: CafeLeadStatus.SENT,
            failReason: null,
          },
        });
      });

      logger.info({ draftId: draft.id, recipient }, 'Mail sent');
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.outboundMessage.update({
          where: { id: message.id },
          data: {
            deliveryStatus: OutboundDeliveryStatus.FAILED,
            failReason: String(error),
          },
        });

        await tx.cafeLead.update({
          where: { id: draft.cafeLeadId },
          data: {
            status: CafeLeadStatus.FAILED,
            failReason: String(error),
          },
        });
      });

      logger.error({ draftId: draft.id, recipient, error: String(error) }, 'Mail send failed');
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
