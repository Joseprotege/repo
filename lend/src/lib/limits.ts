/**
 * Shared input limits for user-generated content.
 *
 * These are the *UI* caps (maxLength on inputs). They are intentionally a bit
 * tighter than — and must never exceed — the database CHECK constraints in
 * migration 020. The DB constraints are the real, bypass-proof enforcement;
 * these just give users friendly truncation + counters instead of a raw DB error.
 */
export const LIMITS = {
  listingTitle: 100,
  listingDescription: 2000,
  listingCity: 80,
  tag: 40,
  maxTags: 8,
  stepInstruction: 300,
  stepHint: 200,
  maxSteps: 30,
  offerMessage: 1000,
  chatMessage: 1000,
  stepResponse: 1000,
  broadcastMessage: 500,
  broadcastNote: 160,
  reportDetails: 500,
  reviewNote: 300,
  displayName: 50,
  bio: 300,
  skill: 50,
  maxSkills: 12,
} as const;
