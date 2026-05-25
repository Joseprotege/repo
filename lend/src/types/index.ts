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
}

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
