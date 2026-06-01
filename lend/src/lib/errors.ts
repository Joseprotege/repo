/**
 * Maps Supabase/Postgres errors into short, human-readable messages safe to show
 * users. Falls back to a generic message so raw DB/internal detail never leaks.
 */
interface PostgresLikeError {
  message?: string;
  code?: string;
  details?: string;
}

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = (error ?? {}) as PostgresLikeError;
  const msg = e.message ?? '';

  // Rate-limit trigger raises a friendly message already (migration 021).
  if (msg.startsWith('Rate limit reached')) return msg;

  switch (e.code) {
    // unique_violation — most commonly the one-offer-per-listing constraint.
    case '23505':
      if (msg.includes('offers') || msg.toLowerCase().includes('listing_id'))
        return "You've already made an offer on this task.";
      return 'That already exists.';
    // check_violation — content length caps (migration 020) or other CHECKs.
    case '23514':
      return 'One of your entries is too long or invalid. Please shorten it and try again.';
    // not_null_violation
    case '23502':
      return 'Please fill in all required fields.';
    // foreign_key_violation
    case '23503':
      return "That item no longer exists.";
    // RLS / permission denied
    case '42501':
      return "You don't have permission to do that.";
    default:
      return fallback;
  }
}
