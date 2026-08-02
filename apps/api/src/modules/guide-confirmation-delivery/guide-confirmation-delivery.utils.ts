import type { ConfirmationDocumentSnapshotInput } from '@tour/validation';

export function buildGuideConfirmationSummary(snapshot: ConfirmationDocumentSnapshotInput): Record<string, unknown> {
  return {
    leaderName: snapshot.leaderName,
    destination: snapshot.destination,
    travelPeriodText: snapshot.travelPeriodText,
    headcountText: snapshot.headcountText,
    guideName: snapshot.guideName,
    documentNumber: snapshot.documentNumber ?? null,
    vehicleType: snapshot.vehicleType,
    vehicleDisplayNote: snapshot.vehicleDisplayNote ?? null,
    flightInText: snapshot.flightInText,
    flightOutText: snapshot.flightOutText,
    pickupText: snapshot.pickupText,
    dropText: snapshot.dropText,
    meetingPlace: snapshot.meetingPlace,
    accommodationLines: snapshot.accommodationLines,
    specialNote: snapshot.specialNote,
    externalPickupDropText: snapshot.externalPickupDropText,
    rentalItemsText: snapshot.rentalItemsText,
    eventNames: snapshot.eventNames,
    remark: snapshot.remark,
    balancePerPersonText: snapshot.balancePerPersonText,
    travelers: snapshot.travelers,
    appendixPlanStops: snapshot.appendixPlanStops ?? [],
  };
}

export function buildGuideConfirmationPdfStoragePath(input: {
  authUserId: string;
  confirmationDocumentId: string;
  versionNumber: number;
}): string {
  return `${input.authUserId}/${input.confirmationDocumentId}/v${input.versionNumber}.pdf`;
}
