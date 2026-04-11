import type { ConfirmedTripStatus, PrismaClient } from '@prisma/client';
import { confirmTripSchema, confirmedTripUpdateSchema } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { ConfirmedTripRepository } from './confirmed-trip.repository';
import type { ConfirmTripDto, ConfirmedTripUpdateDto } from './confirmed-trip.types';

export class ConfirmedTripService {
  constructor(private readonly prisma: PrismaClient) {}

  list(status?: ConfirmedTripStatus) {
    return new ConfirmedTripRepository(this.prisma).findMany(status);
  }

  async get(id: string) {
    const trip = await new ConfirmedTripRepository(this.prisma).findById(id);
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }
    return trip;
  }

  async confirm(input: ConfirmTripDto) {
    const parsed = confirmTripSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirm trip input', parsed.error);
    }

    const { planId, planVersionId, confirmedByEmployeeId } = parsed.data;

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true },
    });
    if (!plan) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    const version = await this.prisma.planVersion.findUnique({
      where: { id: planVersionId },
      select: { id: true, planId: true },
    });
    if (!version) {
      throw new DomainError('NOT_FOUND', 'Plan version not found');
    }
    if (version.planId !== planId) {
      throw new DomainError('VALIDATION_FAILED', 'Plan version does not belong to the specified plan');
    }

    const repo = new ConfirmedTripRepository(this.prisma);
    const existing = await repo.findActiveByPlanId(planId);
    if (existing) {
      throw new DomainError('VALIDATION_FAILED', 'This plan already has an active confirmed trip. Cancel the existing one first.');
    }

    return repo.create({
      userId: plan.userId,
      planId,
      planVersionId,
      confirmedByEmployeeId: confirmedByEmployeeId ?? null,
    });
  }

  async update(id: string, input: ConfirmedTripUpdateDto) {
    const parsed = confirmedTripUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmed trip update input', parsed.error);
    }

    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }

    const { status, ...rest } = parsed.data;

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    return new ConfirmedTripRepository(this.prisma).update(id, updateData as Parameters<ConfirmedTripRepository['update']>[1]);
  }

  async cancel(id: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }
    if (trip.status === 'CANCELLED') {
      throw new DomainError('VALIDATION_FAILED', 'Trip is already cancelled');
    }

    return new ConfirmedTripRepository(this.prisma).update(id, { status: 'CANCELLED' });
  }
}
