import type { OutboundChannel } from '../enums/outbound-channel';
import type { OutboundDeliveryStatus } from '../enums/outbound-delivery-status';

export interface OutboundMessage {
  id: string;
  draftId: string;
  channel: OutboundChannel;
  toEmail: string;
  deliveryStatus: OutboundDeliveryStatus;
  provider: string | null;
  providerMessageId: string | null;
  failReason: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
