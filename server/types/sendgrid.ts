/**
 * SendGrid Event Webhook Types
 * Source: https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/event
 */

export type SendGridEventType =
  | 'processed'
  | 'delivered'
  | 'bounce'
  | 'dropped'
  | 'deferred'
  | 'spamreport'
  | 'unsubscribe';

export type BounceClassification =
  | 'Invalid Address'
  | 'Technical'
  | 'Content'
  | 'Reputation'
  | 'Frequency/Volume'
  | 'Mailbox Unavailable'
  | 'Unclassified';

export interface SendGridEvent {
  email: string;
  timestamp: number;
  event: SendGridEventType;
  sg_event_id: string;
  sg_message_id: string;
  bounce_classification?: BounceClassification;
  reason?: string;
  category?: string[];
  [key: string]: unknown;
}
