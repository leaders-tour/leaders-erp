import type { OutreachReviewStatus } from '../enums/outreach-review-status';

export interface OutreachDraft {
  id: string;
  cafeLeadId: string;
  version: number;
  subject: string;
  previewText: string | null;
  bodyText: string;
  bodyHtml: string;
  promptVersion: string;
  modelName: string;
  qualityScore: number | null;
  reviewStatus: OutreachReviewStatus;
  reviewerId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
