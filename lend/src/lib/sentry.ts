/**
 * Sentry initialisation.
 *
 * Called once at app startup (main.tsx). Completely inert when VITE_SENTRY_DSN
 * is absent or empty — no network calls, no overhead. Set the env var in:
 *   - local dev:      lend/.env.local  →  VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/yyy
 *   - production:     Vercel dashboard → Environment Variables (same key)
 *
 * What this captures:
 *   - Uncaught React render errors (via the ErrorBoundary)
 *   - Unhandled promise rejections and thrown exceptions
 *   - Performance traces on route changes (tracesSampleRate 5%)
 *   - Session replays for errored sessions only (replaysOnErrorSampleRate 100%)
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return; // no-op in dev / when key not set

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    // Attach a release string when Vite injects it (see vite.config.ts).
    release: (import.meta.env.VITE_RELEASE as string | undefined) ?? undefined,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text + block all media by default — no PII in replays.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // 5% of sessions → performance data. Increase toward launch if needed.
    tracesSampleRate: 0.05,

    // Capture full replays only when an error occurs (100% of errored sessions).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Report a caught error to Sentry with optional extra context.
 * Safe to call even when Sentry is not initialised.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
