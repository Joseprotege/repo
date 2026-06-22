/**
 * Adapters — convert raw Supabase DB rows into the richer App types
 * defined in src/types/index.ts, and vice versa for inserts.
 *
 * All functions accept plain Record<string, unknown> so they work with
 * the untyped Supabase client. Type safety lives at the call-site.
 */
import type {
  User, Listing, Offer, Notification, CommunityBroadcast,
  ReliabilityScore, Category, UrgencyLevel, ListingStatus,
  OfferStatus, CompletionType, TaskStep, TaskMessage, PaymentRequest,
  TaskMessageType,
} from '../types';

// ── HELPERS ────────────────────────────────────────────────────────────────

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ── RELIABILITY ────────────────────────────────────────────────────────────

function computeLevel(overall: number): ReliabilityScore['level'] {
  if (overall >= 90) return 'legendary';
  if (overall >= 75) return 'expert';
  if (overall >= 55) return 'trusted';
  if (overall >= 30) return 'rising';
  return 'new';
}

export function adaptReliability(r: Record<string, unknown> | null): ReliabilityScore {
  if (!r) {
    return {
      overall: 0, selfAssessedAbility: 0, selfAssessedAvailability: 0,
      actualPerformance: 0, totalOffers: 0, completedOffers: 0,
      reliableOffers: 0, avgRating: 0, level: 'new',
    };
  }
  const overall = num(r.overall);
  return {
    overall,
    selfAssessedAbility: num(r.self_assessed_ability_avg),
    selfAssessedAvailability: num(r.self_assessed_availability_avg),
    actualPerformance: num(r.actual_score),
    totalOffers: num(r.total_offers),
    completedOffers: num(r.completed),
    reliableOffers: num(r.reliable_offers),
    avgRating: num(r.avg_rating),
    level: computeLevel(overall),
  };
}

// ── PROFILE → USER ────────────────────────────────────────────────────────

export function adaptProfile(
  profile: Record<string, unknown>,
  reliability: Record<string, unknown> | null = null,
): User {
  const id = str(profile.id);
  const city = str(profile.city);
  const neighborhood = str(profile.neighborhood);
  return {
    id,
    displayName: str(profile.display_name) || str(profile.username),
    username: str(profile.username),
    avatarUrl: str(profile.avatar_url)
      || `https://api.dicebear.com/7.x/personas/svg?seed=${str(profile.avatar_seed) || id}`,
    bio: str(profile.bio),
    location: {
      city,
      state: str(profile.state),
      country: 'US',
      lat: num(profile.lat),
      lng: num(profile.lng),
      displayName: neighborhood ? `${neighborhood}, ${city}` : city,
      neighborhood: neighborhood || undefined,
    },
    joinedAt: str(profile.created_at) || new Date().toISOString(),
    reliability: adaptReliability(reliability),
    skills: arr<string>(profile.skills),
    listingIds: [],   // populated separately from join
    offerIds: [],     // populated separately from join
    connectionIds: [], // not yet in DB schema
    isOnline: bool(profile.is_online),
    verifiedEmail: bool(profile.verified_email),
    verifiedId: bool(profile.verified_id),
    isAdmin: bool(profile.is_admin),
    isSuspended: bool(profile.is_suspended),
  };
}

// ── LISTING ROW → LISTING ─────────────────────────────────────────────────

export function adaptListing(row: Record<string, unknown>): Listing {
  const status = str(row.status);
  const neighborhood = str(row.neighborhood);
  const city = str(row.city);
  const imageUrl = str(row.image_url);
  const imageUrls = arr<string>(row.image_urls);
  return {
    id: str(row.id),
    requesterId: str(row.user_id),
    title: str(row.title),
    description: str(row.description),
    category: str(row.category) as Category,
    urgency: str(row.urgency, 'medium') as UrgencyLevel,
    location: {
      city,
      state: str(row.state),
      country: 'US',
      lat: num(row.lat),
      lng: num(row.lng),
      displayName: neighborhood ? `${neighborhood}, ${city}` : city,
      neighborhood: neighborhood || undefined,
    },
    preferredRadiusMiles: num(row.preferred_radius_miles, 15),
    tags: arr<string>(row.tags),
    imageUrls: imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
    // DB uses in_progress (underscore), App uses in-progress (hyphen)
    status: (status === 'in_progress' ? 'in-progress' : status) as ListingStatus,
    offerIds: [],
    acceptedOfferId: str(row.accepted_offer_id) || undefined,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    expiresAt: str(row.expires_at) || undefined,
    canBeRemote: bool(row.can_be_remote),
    estimatedHours: num(row.estimated_hours, 2),
    views: num(row.views),
    taskSteps: arr<TaskStep>(row.task_steps),
    isPaid: bool(row.is_paid),
    budgetCents: num(row.budget_cents),
  };
}

/** Convert an App Listing to a Supabase insert payload */
export function listingToInsert(listing: Listing): Record<string, unknown> {
  return {
    id: listing.id,
    user_id: listing.requesterId,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    urgency: listing.urgency,
    city: listing.location.city,
    state: listing.location.state,
    neighborhood: listing.location.neighborhood ?? '',
    lat: listing.location.lat,
    lng: listing.location.lng,
    preferred_radius_miles: listing.preferredRadiusMiles,
    tags: listing.tags,
    image_url: listing.imageUrls[0] ?? '',
    image_urls: listing.imageUrls,
    can_be_remote: listing.canBeRemote,
    estimated_hours: listing.estimatedHours,
    status: listing.status === 'in-progress' ? 'in_progress' : listing.status,
    task_steps: listing.taskSteps,
    is_paid: listing.isPaid,
    budget_cents: listing.budgetCents,
  };
}

// ── OFFER ROW → OFFER ─────────────────────────────────────────────────────

export function adaptOffer(row: Record<string, unknown>): Offer {
  // DB stores confidence as 1-5 integer, App uses 0-100 percentage
  const confidenceAbility = num(row.confidence_ability, 3);
  const confidenceAvailability = num(row.confidence_availability, 3);
  const ratingReq = row.rating_by_requester;
  const ratingHelp = row.rating_by_helper;
  return {
    id: str(row.id),
    listingId: str(row.listing_id),
    offererId: str(row.user_id),
    completionType: (str(row.completion_type) || 'assist') as CompletionType,
    message: str(row.message),
    selfAbility: Math.min(100, confidenceAbility * 20),       // 1-5 → 20-100
    selfAvailability: Math.min(100, confidenceAvailability * 20),
    estimatedHours: num(row.estimated_hours, 2),
    status: str(row.status, 'pending') as OfferStatus,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at) || str(row.created_at),
    ratingByRequester: typeof ratingReq === 'number' ? ratingReq : undefined,
    ratingByHelper: typeof ratingHelp === 'number' ? ratingHelp : undefined,
    distanceMiles: typeof row.distance_miles === 'number' ? num(row.distance_miles) : undefined,
    returnFavorPending: bool(row.return_favor_pending),
    currentStepIndex: num(row.current_step_index, 0),
    stepsCompleted: bool(row.steps_completed),
    requestedAmount: num(row.requested_amount_cents, 0),
  };
}

// ── TASK MESSAGE ROW → TASK MESSAGE ──────────────────────────────────────────

export function adaptTaskMessage(row: Record<string, unknown>): TaskMessage {
  return {
    id: str(row.id),
    listingId: str(row.listing_id),
    offerId: str(row.offer_id),
    senderId: typeof row.sender_id === 'string' ? row.sender_id : null,
    type: str(row.type, 'dm') as TaskMessageType,
    content: str(row.content),
    stepIndex: typeof row.step_index === 'number' ? num(row.step_index) : undefined,
    createdAt: str(row.created_at),
  };
}

// ── PAYMENT REQUEST ROW → PAYMENT REQUEST ────────────────────────────────────

export function adaptPaymentRequest(row: Record<string, unknown>): PaymentRequest {
  return {
    id: str(row.id),
    offerId: str(row.offer_id),
    listingId: str(row.listing_id),
    requesterId: str(row.requester_id),
    helperId: str(row.helper_id),
    amountCents: num(row.amount_cents),
    currency: str(row.currency, 'usd'),
    platformFeePct: num(row.platform_fee_pct),
    platformFeeCents: num(row.platform_fee_cents),
    helperPayoutCents: num(row.helper_payout_cents),
    status: str(row.status, 'pending') as PaymentRequest['status'],
    createdAt: str(row.created_at),
    fundedAt: str(row.funded_at) || undefined,
    releasedAt: str(row.released_at) || undefined,
  };
}

/** Convert an App Offer to a Supabase insert payload */
export function offerToInsert(offer: Offer): Record<string, unknown> {
  return {
    listing_id: offer.listingId,
    user_id: offer.offererId,
    completion_type: offer.completionType,
    message: offer.message,
    // App uses 0-100, DB uses 1-5 — clamp to valid range
    confidence_ability: Math.max(1, Math.min(5, Math.round(offer.selfAbility / 20))),
    confidence_availability: Math.max(1, Math.min(5, Math.round(offer.selfAvailability / 20))),
    estimated_hours: offer.estimatedHours,
    status: offer.status,
    distance_miles: offer.distanceMiles ?? null,
    current_step_index: offer.currentStepIndex ?? 0,
    steps_completed: offer.stepsCompleted ?? false,
    requested_amount_cents: offer.requestedAmount ?? 0,
  };
}

// ── NOTIFICATION ROW → NOTIFICATION ──────────────────────────────────────

export function adaptNotification(row: Record<string, unknown>): Notification {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    type: (str(row.type) || 'new-offer') as Notification['type'],
    title: str(row.title),
    body: str(row.body),
    read: bool(row.read),
    createdAt: str(row.created_at),
    linkTo: str(row.link_to) || undefined,
  };
}

// ── BROADCAST ROW → COMMUNITYBROADCAST ────────────────────────────────────

export function adaptBroadcast(
  row: Record<string, unknown>,
  myReaction: 'heart' | 'clap' | 'spark' | null = null,
): CommunityBroadcast {
  return {
    id: str(row.id),
    areaLabel: str(row.area_label),
    category: str(row.category) as Category,
    message: str(row.message),
    note: str(row.note) || undefined,
    completedAt: str(row.created_at),
    reactions: {
      heart: num(row.reactions_heart),
      clap: num(row.reactions_clap),
      spark: num(row.reactions_spark),
    },
    myReaction,
  };
}

/** Convert an App broadcast to a Supabase insert payload */
export function broadcastToInsert(
  data: Omit<CommunityBroadcast, 'id' | 'reactions' | 'myReaction'>,
  senderId: string,
): Record<string, unknown> {
  return {
    sender_id: senderId,
    area_label: data.areaLabel,
    category: data.category,
    message: data.message,
    note: data.note ?? '',
  };
}
