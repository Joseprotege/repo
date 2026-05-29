export type Category =
  | 'home-repairs'
  | 'tech-help'
  | 'transportation'
  | 'education'
  | 'creative'
  | 'errands'
  | 'caregiving'
  | 'outdoors'
  | 'financial'
  | 'other';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';
export type CompletionType = 'assist' | 'collaborate' | 'fully-complete';
export type ListingStatus = 'open' | 'in-progress' | 'completed' | 'closed';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'completed';

export interface Location {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
  /** Neighborhood within the city — the primary social unit in Foster */
  neighborhood?: string;
}

export interface NeighborhoodStats {
  neighborhood: string;
  city: string;
  activeHelpers: number;       // active this week
  tasksCompletedMonth: number;
  broadcastsThisMonth: number;
  avgResponseHours: number;    // avg hours from post → first offer
  topCategories: Category[];
}

export interface ReliabilityScore {
  /** 0–100 */
  overall: number;
  /** Self-assessed ability 0–100 */
  selfAssessedAbility: number;
  /** Self-assessed availability 0–100 */
  selfAssessedAvailability: number;
  /** Actual performance score from completed tasks */
  actualPerformance: number;
  /** Total offers made */
  totalOffers: number;
  /** Offers successfully completed */
  completedOffers: number;
  /** Offers where they followed through (no ghost) */
  reliableOffers: number;
  /** avg rating given by requesters (1–5) */
  avgRating: number;
  /** Level badge */
  level: 'new' | 'rising' | 'trusted' | 'expert' | 'legendary';
}

export interface User {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  location: Location;
  joinedAt: string;
  reliability: ReliabilityScore;
  skills: string[];
  /** Listings they posted */
  listingIds: string[];
  /** Offers they made */
  offerIds: string[];
  /** Users they've formed a mutual-help connection with */
  connectionIds: string[];
  /** Whether they're currently active / online */
  isOnline: boolean;
  verifiedEmail: boolean;
  verifiedId: boolean;
}

// ─── Task Step ────────────────────────────────────────────────────────────────

/**
 * A single step in the lister's pre-authored task guide.
 * Steps are delivered one at a time to the helper in order.
 * The helper must respond before the next step unlocks.
 */
export interface TaskStep {
  id: string;
  instruction: string;
  hint?: string;   // optional clarifying note visible immediately
  order: number;
}

// ─── Task Message ─────────────────────────────────────────────────────────────

export type TaskMessageType =
  | 'step_response'   // helper's reply to a queued step
  | 'step_approved'   // lister approves the response, unlocking the next step
  | 'dm'              // free-form direct message from either party
  | 'system'          // automated event (offer accepted, task complete, etc.)
  | 'voice_request'   // helper requests voice escalation
  | 'voice_accept'    // lister accepts the voice call
  | 'voice_decline';  // lister declines the voice call

export interface TaskMessage {
  id: string;
  listingId: string;
  offerId: string;
  senderId: string | null;   // null for system messages
  type: TaskMessageType;
  content: string;
  stepIndex?: number;        // which step this response relates to
  createdAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  id: string;
  offerId: string;
  listingId: string;
  requesterId: string;
  helperId: string;
  amountCents: number;
  currency: string;
  platformFeePct: number;
  platformFeeCents: number;
  helperPayoutCents: number;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'cancelled';
  createdAt: string;
  fundedAt?: string;
  releasedAt?: string;
}

export interface FeeTier {
  minUsers: number;
  maxUsers: number | null;
  feePct: number;
  label: string;
  description: string;
}

/** Static fee schedule — adjustable as the platform grows.
 *  Caps at 15% even at full scale, well below typical marketplace fees. */
export const FEE_TIERS: FeeTier[] = [
  {
    minUsers: 0,
    maxUsers: 100,
    feePct: 0,
    label: 'Launch',
    description: 'Free during our community-building phase',
  },
  {
    minUsers: 101,
    maxUsers: 500,
    feePct: 3,
    label: 'Growth',
    description: 'Covers basic infrastructure costs',
  },
  {
    minUsers: 501,
    maxUsers: 2000,
    feePct: 6,
    label: 'Community',
    description: 'Supports moderation, safety, and features',
  },
  {
    minUsers: 2001,
    maxUsers: 10000,
    feePct: 10,
    label: 'Scale',
    description: 'Funds expansion and city partnerships',
  },
  {
    minUsers: 10001,
    maxUsers: null,
    feePct: 15,
    label: 'Platform',
    description: 'Full platform operations and growth — capped here',
  },
];

// ─── Offer ────────────────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  listingId: string;
  offererId: string;
  completionType: CompletionType;
  message: string;
  /** Self-assessed ability for THIS task 0–100 */
  selfAbility: number;
  /** Self-assessed availability for THIS task 0–100 */
  selfAvailability: number;
  estimatedHours: number;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  /** Rating given by requester after completion (1–5) */
  ratingByRequester?: number;
  /** Rating given by helper after completion (1–5) */
  ratingByHelper?: number;
  ratingNoteByRequester?: string;
  ratingNoteByHelper?: string;
  /** Distance in miles between helper and requester */
  distanceMiles?: number;
  /** "Return the favor" reciprocal flag */
  returnFavorPending?: boolean;
  /** Step queue progress — which step index the helper is currently on */
  currentStepIndex: number;
  /** True when the helper has responded to all steps */
  stepsCompleted: boolean;
  /** Amount the helper is asking for (in cents). 0 = volunteer. */
  requestedAmount: number;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  requesterId: string;
  title: string;
  description: string;
  category: Category;
  urgency: UrgencyLevel;
  location: Location;
  /** Radius in miles within which helpers are ideal */
  preferredRadiusMiles: number;
  tags: string[];
  imageUrls: string[];
  status: ListingStatus;
  offerIds: string[];
  acceptedOfferId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  /** Is this task something that can be done remotely? */
  canBeRemote: boolean;
  estimatedHours: number;
  /** Views count */
  views: number;
  /** Optional step-by-step guide the lister pre-authors */
  taskSteps: TaskStep[];
  /** True when the lister is offering payment for this task */
  isPaid: boolean;
  /** Fixed budget in cents. 0 means volunteer. */
  budgetCents: number;
}

export interface Connection {
  id: string;
  userAId: string;
  userBId: string;
  /** The listing that sparked this connection */
  originListingId: string;
  formedAt: string;
  /** Mutual return-favor requests */
  pendingReturnFavor?: boolean;
  returnFavorListingId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new-offer' | 'offer-accepted' | 'offer-declined' | 'task-completed' | 'return-favor' | 'new-connection' | 'rating-received';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  linkTo?: string;
}

/**
 * An anonymous community broadcast — sent when a task connection goes well.
 * Contains NO user identifiers, NO task titles. Just a warm signal that
 * something good happened nearby.
 */
export interface CommunityBroadcast {
  id: string;
  /** Neighborhood / area label — deliberately vague (e.g. "Hyde Park, Austin") */
  areaLabel: string;
  category: Category;
  /** Short, anonymous message describing what kind of thing happened */
  message: string;
  /**
   * Optional human note added by either participant at broadcast time.
   * Shown anonymously. Neither name nor task is included.
   */
  note?: string;
  completedAt: string;
  reactions: {
    heart: number;
    clap: number;
    spark: number;
  };
  /** Tracks which reaction (if any) the current session user has cast */
  myReaction?: 'heart' | 'clap' | 'spark' | null;
}
