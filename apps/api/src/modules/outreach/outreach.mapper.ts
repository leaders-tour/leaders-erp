import type { Prisma } from '@prisma/client';
import type { CafeLeadNeedsInput } from '@tour/validation';

function asObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function mapNeeds(value: Prisma.JsonValue | null | undefined): CafeLeadNeedsInput | null {
  const object = asObject(value);
  if (!object) {
    return null;
  }

  return {
    departureDate: typeof object.departureDate === 'string' ? object.departureDate : null,
    returnDate: typeof object.returnDate === 'string' ? object.returnDate : null,
    durationNights: typeof object.durationNights === 'number' ? object.durationNights : null,
    durationDays: typeof object.durationDays === 'number' ? object.durationDays : null,
    travelerCount: typeof object.travelerCount === 'number' ? object.travelerCount : null,
    travelerType:
      object.travelerType === 'family' ||
      object.travelerType === 'couple' ||
      object.travelerType === 'friends' ||
      object.travelerType === 'solo'
        ? object.travelerType
        : 'unknown',
    destinations: Array.isArray(object.destinations) ? object.destinations.filter((item): item is string => typeof item === 'string') : [],
    budget: typeof object.budget === 'string' ? object.budget : null,
    interests: Array.isArray(object.interests) ? object.interests.filter((item): item is string => typeof item === 'string') : [],
    specialRequests: Array.isArray(object.specialRequests)
      ? object.specialRequests.filter((item): item is string => typeof item === 'string')
      : [],
    urgency: typeof object.urgency === 'string' ? object.urgency : null,
    leadScore: typeof object.leadScore === 'number' ? object.leadScore : null,
  };
}

export function getMetadataContact(value: Prisma.JsonValue | null | undefined, field: 'email' | 'phone' | 'kakaoId'): string | null {
  const object = asObject(value);
  const contacts = object?.contacts;
  if (!contacts || typeof contacts !== 'object' || Array.isArray(contacts)) {
    return null;
  }

  const candidate = (contacts as Record<string, unknown>)[field];
  return typeof candidate === 'string' ? candidate : null;
}

export function getArtifactPath(value: Prisma.JsonValue | null | undefined, field: 'htmlPath' | 'screenshotPath'): string | null {
  const object = asObject(value);
  const artifacts = object?.artifacts;
  if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts)) {
    return null;
  }

  const candidate = (artifacts as Record<string, unknown>)[field];
  return typeof candidate === 'string' ? candidate : null;
}
