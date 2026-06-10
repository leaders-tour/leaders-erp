import { PrismaClient } from '@prisma/client';
import { ContractPaymentSyncService } from '../apps/api/src/modules/contract/contract-sync.service';

const prisma = new PrismaClient();

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveHeadcount(inputSnapshot: unknown, metaHeadcount: number | null | undefined): number {
  const snapshot = asRecord(inputSnapshot);
  const fromSnapshot = numberValue(snapshot?.headcountTotal);
  if (fromSnapshot != null && fromSnapshot > 0) {
    return fromSnapshot;
  }
  if (typeof metaHeadcount === 'number' && metaHeadcount > 0) {
    return metaHeadcount;
  }
  return 1;
}

function fixCustomerPricingSnapshot(
  snapshot: JsonRecord,
  headcount: number,
): { changed: boolean; snapshot: JsonRecord } {
  if (snapshot.securityDepositMode !== 'PER_PERSON') {
    return { changed: false, snapshot };
  }
  const unitKrw = numberValue(snapshot.securityDepositUnitKrw);
  if (unitKrw == null || unitKrw <= 0) {
    return { changed: false, snapshot };
  }
  const correctTotal = unitKrw * headcount;
  const currentTotal = numberValue(snapshot.securityDepositTotalKrw);
  if (currentTotal === correctTotal) {
    return { changed: false, snapshot };
  }
  return {
    changed: true,
    snapshot: {
      ...snapshot,
      securityDepositTotalKrw: correctTotal,
    },
  };
}

function fixPricingSecurityDeposit(input: {
  securityDepositMode: string;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
  manualSnapshot: JsonRecord | null;
  headcount: number;
}): {
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositQuantity: number;
} | null {
  const manualSummary = asRecord(input.manualSnapshot?.summary);
  const customerSnapshot = asRecord(input.manualSnapshot?.customerPricingSnapshot);
  const mode =
    manualSummary?.securityDepositMode ??
    customerSnapshot?.securityDepositMode ??
    input.securityDepositMode;
  if (mode !== 'PER_PERSON') {
    return null;
  }

  const manualAmount = numberValue(manualSummary?.securityDepositAmountKrw);
  const customerUnit = numberValue(customerSnapshot?.securityDepositUnitKrw);
  const unit =
    customerUnit ??
    (manualAmount != null && manualAmount > 0 ? manualAmount : null) ??
    (input.securityDepositUnitPriceKrw > 0 ? input.securityDepositUnitPriceKrw : null);
  if (unit == null || unit <= 0) {
    return null;
  }

  const quantity = Math.max(1, input.headcount);
  const total = unit * quantity;
  if (
    input.securityDepositAmountKrw === total &&
    input.securityDepositUnitPriceKrw === unit &&
    input.securityDepositQuantity === quantity
  ) {
    return null;
  }
  return {
    securityDepositAmountKrw: total,
    securityDepositUnitPriceKrw: unit,
    securityDepositQuantity: quantity,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = await prisma.planVersionPricing.findMany({
    where: { manualPricingSnapshot: { not: null } },
    select: {
      id: true,
      planVersionId: true,
      securityDepositAmountKrw: true,
      securityDepositUnitPriceKrw: true,
      securityDepositQuantity: true,
      securityDepositMode: true,
      inputSnapshot: true,
      manualPricingSnapshot: true,
      planVersion: {
        select: {
          meta: {
            select: {
              documentNumber: true,
              headcountTotal: true,
            },
          },
        },
      },
    },
  });

  let updatedCount = 0;
  const affectedDocumentNumbers = new Set<string>();

  for (const row of rows) {
    const manualSnapshot = asRecord(row.manualPricingSnapshot);
    if (!manualSnapshot) {
      continue;
    }
    const headcount = resolveHeadcount(row.inputSnapshot, row.planVersion.meta?.headcountTotal);
    const customerSnapshot = asRecord(manualSnapshot.customerPricingSnapshot);
    let nextManualSnapshot = manualSnapshot;
    let changed = false;

    if (customerSnapshot) {
      const fixed = fixCustomerPricingSnapshot(customerSnapshot, headcount);
      if (fixed.changed) {
        nextManualSnapshot = {
          ...nextManualSnapshot,
          customerPricingSnapshot: fixed.snapshot,
        };
        changed = true;
      }
    }

    const pricingPatch = fixPricingSecurityDeposit({
      securityDepositMode: row.securityDepositMode,
      securityDepositAmountKrw: row.securityDepositAmountKrw,
      securityDepositUnitPriceKrw: row.securityDepositUnitPriceKrw,
      securityDepositQuantity: row.securityDepositQuantity,
      manualSnapshot: nextManualSnapshot,
      headcount,
    });

    if (pricingPatch) {
      changed = true;
    }

    if (!changed) {
      continue;
    }

    const documentNumber = row.planVersion.meta?.documentNumber?.trim();
    if (documentNumber) {
      affectedDocumentNumbers.add(documentNumber);
    }

    updatedCount += 1;
    process.stdout.write(
      `update pricing ${row.id} headcount=${headcount} doc=${documentNumber ?? '-'}${dryRun ? ' (dry-run)' : ''}\n`,
    );

    if (!dryRun) {
      await prisma.planVersionPricing.update({
        where: { id: row.id },
        data: {
          ...(pricingPatch ?? {}),
          manualPricingSnapshot: nextManualSnapshot,
        },
      });
    }
  }

  process.stdout.write(`updated ${updatedCount} pricing rows\n`);

  if (!dryRun && affectedDocumentNumbers.size > 0) {
    await new ContractPaymentSyncService(prisma).recomputePaymentStatuses([...affectedDocumentNumbers]);
    process.stdout.write(`recomputed payment statuses for ${affectedDocumentNumbers.size} document numbers\n`);
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
