/**
 * Admin / moderation service — thin wrappers over the admin-actions Edge
 * Function. Every call is gated server-side on profiles.is_admin; these helpers
 * just shape the request/response for the moderation dashboard.
 */
import { invokeEdgeFunction } from '../lib/stripe';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface AdminReport {
  id: string;
  target_type: 'listing' | 'profile' | 'broadcast' | 'offer';
  target_id: string;
  target_label: string;
  target_link: string | null;
  target_owner_id: string | null;
  /** Listing already removed / user already suspended. */
  target_removed: boolean;
  reason: string;
  details: string;
  status: ReportStatus;
  resolution_note: string | null;
  reporter_label: string;
  created_at: string;
}

export type ReportStats = Record<ReportStatus, number>;

export async function fetchReportStats(): Promise<ReportStats | null> {
  const res = await invokeEdgeFunction<{ stats: ReportStats }>('admin-actions', { action: 'stats' });
  return res.data?.stats ?? null;
}

export async function fetchReports(status?: ReportStatus): Promise<AdminReport[]> {
  const res = await invokeEdgeFunction<{ reports: AdminReport[] }>('admin-actions', {
    action: 'list_reports',
    status,
  });
  return res.data?.reports ?? [];
}

export async function updateReport(
  reportId: string,
  status: ReportStatus,
  resolutionNote?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const res = await invokeEdgeFunction<{ ok: boolean }>('admin-actions', {
    action: 'update_report',
    report_id: reportId,
    status,
    resolution_note: resolutionNote,
  });
  return { ok: !!res.data?.ok, error: res.error };
}

export async function setListingRemoved(
  listingId: string,
  removed: boolean,
  reason?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const res = await invokeEdgeFunction<{ ok: boolean }>('admin-actions', {
    action: 'set_listing_removed',
    listing_id: listingId,
    removed,
    reason,
  });
  return { ok: !!res.data?.ok, error: res.error };
}

export async function setUserSuspended(
  userId: string,
  suspended: boolean,
  reason?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const res = await invokeEdgeFunction<{ ok: boolean }>('admin-actions', {
    action: 'set_user_suspended',
    user_id: userId,
    suspended,
    reason,
  });
  return { ok: !!res.data?.ok, error: res.error };
}
