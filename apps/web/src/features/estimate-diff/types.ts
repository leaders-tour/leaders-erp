export type EstimateDiffKind = 'changed' | 'added' | 'removed';

export type EstimatePage1DiffField =
  | 'leaderName'
  | 'documentNumber'
  | 'destinationName'
  | 'headcount'
  | 'travelPeriod'
  | 'vehicleType'
  | 'flightIn'
  | 'flightOut'
  | 'pickup'
  | 'drop'
  | 'externalPickupDrop'
  | 'specialNote'
  | 'rentalItems'
  | 'events'
  | 'remark'
  | 'basePrice'
  | 'adjustments'
  | 'totalPrice'
  | 'depositPrice'
  | 'balancePrice'
  | 'securityDeposit';

export type EstimatePage2CellKey =
  | 'date'
  | 'destination'
  | 'time'
  | 'schedule'
  | 'lodging'
  | 'meal';

export type EstimateDiffSide = 'previous' | 'next';

export interface EstimateDiffHints {
  page1: Partial<Record<EstimatePage1DiffField, EstimateDiffKind>>;
  /** planStops 배열 인덱스 기준 (각 문서 사이드별) */
  page2Previous: Record<number, Partial<Record<EstimatePage2CellKey, EstimateDiffKind>>>;
  page2Next: Record<number, Partial<Record<EstimatePage2CellKey, EstimateDiffKind>>>;
}
