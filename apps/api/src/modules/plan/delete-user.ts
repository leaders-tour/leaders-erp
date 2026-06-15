import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class UserDeleteIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDeleteIncompleteError';
  }
}

export type UserDeleteGraphIds = {
  userId: string;
  planIds: string[];
  planVersionIds: string[];
  confirmedTripIds: string[];
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export async function collectUserDeleteGraphIds(
  tx: PrismaLike,
  userId: string,
): Promise<UserDeleteGraphIds | null> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return null;
  }

  const plans = await tx.plan.findMany({
    where: { userId },
    select: { id: true, versions: { select: { id: true } } },
  });
  const planIds = plans.map((plan) => plan.id);
  const planVersionIds = plans.flatMap((plan) => plan.versions.map((version) => version.id));

  const [confirmedTripsByUser, confirmedTripsByPlanGraph] = await Promise.all([
    tx.confirmedTrip.findMany({
      where: { userId },
      select: { id: true },
    }),
    planIds.length > 0 || planVersionIds.length > 0
      ? tx.confirmedTrip.findMany({
          where: {
            OR: [
              ...(planIds.length > 0 ? [{ planId: { in: planIds } }] : []),
              ...(planVersionIds.length > 0 ? [{ planVersionId: { in: planVersionIds } }] : []),
            ],
          },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    userId,
    planIds,
    planVersionIds,
    confirmedTripIds: uniqueIds([
      ...confirmedTripsByUser.map((trip) => trip.id),
      ...confirmedTripsByPlanGraph.map((trip) => trip.id),
    ]),
  };
}

export async function unlinkExternalMatchReferences(
  tx: PrismaLike,
  ids: UserDeleteGraphIds,
): Promise<void> {
  const { planVersionIds, confirmedTripIds } = ids;

  if (confirmedTripIds.length > 0) {
    await tx.contractDocumentStatus.updateMany({
      where: { matchedConfirmedTripId: { in: confirmedTripIds } },
      data: { matchedConfirmedTripId: null },
    });
  }

  if (planVersionIds.length > 0) {
    await tx.contractDocumentStatus.updateMany({
      where: { matchedPlanVersionId: { in: planVersionIds } },
      data: { matchedPlanVersionId: null },
    });
    await tx.contractDocumentStatus.updateMany({
      where: { manualMatchedPlanVersionId: { in: planVersionIds } },
      data: {
        manualMatchedPlanVersionId: null,
        manualMatchedByEmployeeId: null,
        manualMatchedAt: null,
        manualMatchNote: null,
      },
    });
    await tx.contractPaymentStatus.updateMany({
      where: { matchedPlanVersionId: { in: planVersionIds } },
      data: { matchedPlanVersionId: null },
    });
  }
}

function buildConfirmedTripDeleteWhere(ids: UserDeleteGraphIds): Prisma.ConfirmedTripWhereInput {
  const { userId, planIds, planVersionIds } = ids;

  return {
    OR: [
      { userId },
      ...(planIds.length > 0 ? [{ planId: { in: planIds } }] : []),
      ...(planVersionIds.length > 0 ? [{ planVersionId: { in: planVersionIds } }] : []),
    ],
  };
}

export async function assertUserDeletable(tx: PrismaLike, userId: string): Promise<void> {
  const [planCount, confirmedTripCount, userNoteCount, userDealTodoCount] = await Promise.all([
    tx.plan.count({ where: { userId } }),
    tx.confirmedTrip.count({ where: { userId } }),
    tx.userNote.count({ where: { userId } }),
    tx.userDealTodo.count({ where: { userId } }),
  ]);

  if (planCount > 0 || confirmedTripCount > 0 || userNoteCount > 0 || userDealTodoCount > 0) {
    throw new UserDeleteIncompleteError(
      `고객 삭제 전 정리가 완료되지 않았습니다. (일정 ${planCount}, 확정여행 ${confirmedTripCount}, 노트 ${userNoteCount}, TODO ${userDealTodoCount})`,
    );
  }
}

export async function deleteUserOwnedGraph(tx: PrismaLike, ids: UserDeleteGraphIds): Promise<void> {
  const { userId, planIds, planVersionIds, confirmedTripIds } = ids;
  const confirmedTripDeleteWhere = buildConfirmedTripDeleteWhere(ids);

  if (confirmedTripIds.length > 0) {
    await tx.calendarNote.deleteMany({
      where: { confirmedTripId: { in: confirmedTripIds } },
    });
  }

  if (planVersionIds.length > 0) {
    const linkedTrips = await tx.confirmedTrip.findMany({
      where: { planVersionId: { in: planVersionIds } },
      select: { id: true },
    });
    const linkedTripIds = linkedTrips.map((trip) => trip.id);
    if (linkedTripIds.length > 0) {
      await tx.calendarNote.deleteMany({
        where: { confirmedTripId: { in: linkedTripIds } },
      });
    }
  }

  await tx.confirmedTrip.deleteMany({ where: confirmedTripDeleteWhere });

  if (planVersionIds.length > 0) {
    const remainingTrips = await tx.confirmedTrip.count({
      where: { planVersionId: { in: planVersionIds } },
    });
    if (remainingTrips > 0) {
      throw new UserDeleteIncompleteError(
        `일정 버전을 참조하는 확정여행 ${remainingTrips}건이 남아 있어 고객을 삭제할 수 없습니다.`,
      );
    }
  }

  await tx.plan.updateMany({
    where: { userId },
    data: { currentVersionId: null },
  });

  if (planIds.length > 0) {
    await tx.planVersion.deleteMany({
      where: { planId: { in: planIds } },
    });
  }

  await tx.plan.deleteMany({ where: { userId } });

  await tx.userNote.deleteMany({ where: { userId } });
  await tx.userDealTodo.deleteMany({ where: { userId } });

  await assertUserDeletable(tx, userId);
  await tx.user.delete({ where: { id: userId } });
}

export async function deleteUserGraph(prisma: PrismaClient, userId: string): Promise<boolean> {
  await prisma.$transaction(async (tx) => {
    const ids = await collectUserDeleteGraphIds(tx, userId);
    if (!ids) {
      throw new Error('USER_NOT_FOUND');
    }

    await unlinkExternalMatchReferences(tx, ids);
    await deleteUserOwnedGraph(tx, ids);
  });

  return true;
}
