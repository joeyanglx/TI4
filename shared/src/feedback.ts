/** A player's feedback or feature request, sent from the table's Feedback panel. */
export interface FeedbackItem {
  id: string;
  /** Milliseconds since the epoch. */
  at: number;
  from: string;
  room: string;
  text: string;
  status?: FeedbackStatus;
  /** Answer shown to players, e.g. what changed and whether to reload. */
  reply?: string;
  repliedAt?: number;
}

export type FeedbackStatus = 'seen' | 'working' | 'done' | 'declined';

/** What the replies file holds per feedback id. */
export type FeedbackReply = Pick<FeedbackItem, 'status' | 'reply' | 'repliedAt'>;
