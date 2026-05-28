import type {
  CalendarNoteCreateInput,
  CalendarNoteUpdateInput,
  ConfirmTripInput,
  CreateConfirmedTripDirectInput,
  ConfirmedTripLodgingUpsertInput,
  ConfirmedTripKoreaTeamStageOptionCreateInput,
  ConfirmedTripPostTripTaskOptionCreateInput,
  ConfirmedTripNoteCreateInput,
  ConfirmedTripNoteUpdateInput,
  ConfirmedTripUpdateInput,
} from '@tour/validation';

export type ConfirmTripDto = ConfirmTripInput;
export type CreateConfirmedTripDirectDto = CreateConfirmedTripDirectInput;
export type ConfirmedTripUpdateDto = ConfirmedTripUpdateInput;
export type ConfirmedTripLodgingUpsertDto = ConfirmedTripLodgingUpsertInput;
export type ConfirmedTripKoreaTeamStageOptionCreateDto = ConfirmedTripKoreaTeamStageOptionCreateInput;
export type ConfirmedTripPostTripTaskOptionCreateDto = ConfirmedTripPostTripTaskOptionCreateInput;
export type ConfirmedTripNoteCreateDto = ConfirmedTripNoteCreateInput;
export type ConfirmedTripNoteUpdateDto = ConfirmedTripNoteUpdateInput;
export type CalendarNoteCreateDto = CalendarNoteCreateInput;
export type CalendarNoteUpdateDto = CalendarNoteUpdateInput;

export interface RentalItemAvailabilityDto {
  travelStartDate: Date | string;
  travelEndDate: Date | string;
  excludeConfirmedTripId?: string | null;
  excludePlanId?: string | null;
}
