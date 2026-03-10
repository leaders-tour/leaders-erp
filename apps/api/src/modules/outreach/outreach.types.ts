import type { OutreachDraftEditInput } from '@tour/validation';
import type { CafeLeadStatus } from '@prisma/client';

export interface CafeLeadFilterDto {
  statuses?: CafeLeadStatus[];
  search?: string;
  sourceId?: string;
  hasEmail?: boolean;
}

export type OutreachDraftEditDto = OutreachDraftEditInput;
