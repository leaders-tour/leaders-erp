import type { CafeLeadStatus } from '../enums/cafe-lead-status';

export type TravelerType = 'family' | 'couple' | 'friends' | 'solo' | 'unknown';

export interface CafeLeadNeeds {
  departureDate: string | null;
  returnDate: string | null;
  durationNights: number | null;
  durationDays: number | null;
  travelerCount: number | null;
  travelerType: TravelerType;
  destinations: string[];
  budget: string | null;
  interests: string[];
  specialRequests: string[];
  urgency: string | null;
  leadScore: number | null;
}

export interface CafeLeadMetadata {
  contacts?: {
    email?: string | null;
    phone?: string | null;
    kakaoId?: string | null;
  };
  artifacts?: {
    htmlPath?: string | null;
    screenshotPath?: string | null;
  };
  sourceSnapshot?: {
    boardName?: string | null;
    boardUrl?: string | null;
  };
  [key: string]: unknown;
}

export interface CafeLead {
  id: string;
  cafeSourceId: string;
  articleId: string;
  articleUrl: string;
  title: string;
  authorNickname: string | null;
  postedAtRaw: string | null;
  postedAt: Date | null;
  views: number | null;
  commentCount: number | null;
  rawHtml: string | null;
  rawText: string | null;
  rawMetadataJson: CafeLeadMetadata | null;
  parsedNeedsJson: CafeLeadNeeds | null;
  contactEmail: string | null;
  contactPhone: string | null;
  leadScore: number | null;
  status: CafeLeadStatus;
  failReason: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
