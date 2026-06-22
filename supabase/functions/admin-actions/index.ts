// PASTE THIS into Supabase Dashboard → Edge Functions → "admin-actions"
//
// Moderation backend. Every action verifies the caller is an admin
// (profiles.is_admin = true) before performing a service-role mutation that
// bypasses RLS. Mirrors the auth pattern of the Stripe functions.
//
// Actions (POST body { action, ...params }):
//   stats               → { open, reviewing, resolved, dismissed }
//   list_reports        { status? }            → enriched report rows
//   update_report       { report_id, status, resolution_note? }
//   set_listing_removed { listing_id, removed, reason? }
//   set_user_suspended  { user_id, suspended, reason? }
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(b), {
    ...init, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const err = (msg: string, status = 400) => json({ error: msg }, { status });

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Verify the JWT and that the caller is an admin. Throws otherwise. */
async function requireAdmin(req: Request, db: SupabaseClient): Promise<{ id: string }> {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Error('Missing auth header');
  const c = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await c.auth.getUser();
  if (error || !data.user) throw new Error('Invalid token');

  const { data: profile } = await db
    .from('profiles').select('is_admin').eq('id', data.user.id).single();
  if (!profile?.is_admin) throw new Error('FORBIDDEN');

  return { id: data.user.id };
}

const VALID_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  const db = admin();

  let adminUser: { id: string };
  try {
    adminUser = await requireAdmin(req, db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'FORBIDDEN') return err('Admin access required', 403);
    return err('Unauthorized', 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ── stats ────────────────────────────────────────────────────────────────
    if (action === 'stats') {
      const counts: Record<string, number> = {};
      for (const s of VALID_STATUSES) {
        const { count } = await db
          .from('reports').select('*', { count: 'exact', head: true }).eq('status', s);
        counts[s] = count ?? 0;
      }
      return json({ stats: counts });
    }

    // ── list_reports ───────────────────────────────────────────────────────────
    if (action === 'list_reports') {
      let q = db.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
      if (body.status && VALID_STATUSES.includes(body.status)) q = q.eq('status', body.status);
      const { data: reports, error } = await q;
      if (error) throw error;

      const enriched = await Promise.all((reports ?? []).map((r) => enrichReport(db, r)));
      return json({ reports: enriched });
    }

    // ── update_report ──────────────────────────────────────────────────────────
    if (action === 'update_report') {
      const { report_id, status, resolution_note } = body;
      if (!report_id) return err('report_id required');
      if (!VALID_STATUSES.includes(status)) return err('Invalid status');

      const { error } = await db.from('reports').update({
        status,
        resolution_note: resolution_note ?? null,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', report_id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ── set_listing_removed ─────────────────────────────────────────────────────
    if (action === 'set_listing_removed') {
      const { listing_id, removed, reason } = body;
      if (!listing_id) return err('listing_id required');

      const update = removed
        ? {
            status: 'removed',
            removed_at: new Date().toISOString(),
            removed_by: adminUser.id,
            removal_reason: reason ?? null,
          }
        : { status: 'open', removed_at: null, removed_by: null, removal_reason: null };

      const { error } = await db.from('listings').update(update).eq('id', listing_id);
      if (error) throw error;
      return json({ ok: true });
    }

    // ── set_user_suspended ──────────────────────────────────────────────────────
    if (action === 'set_user_suspended') {
      const { user_id, suspended, reason } = body;
      if (!user_id) return err('user_id required');

      // Guard: never let an admin suspend another admin (or themselves).
      const { data: target } = await db
        .from('profiles').select('is_admin').eq('id', user_id).single();
      if (target?.is_admin) return err('Cannot suspend an admin account', 409);

      const { error } = await db.from('profiles').update({
        is_suspended: !!suspended,
        suspended_at: suspended ? new Date().toISOString() : null,
        suspended_reason: suspended ? (reason ?? null) : null,
      }).eq('id', user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    return err('Unknown action');
  } catch (e) {
    console.error('[admin-actions]', e instanceof Error ? e.stack ?? e.message : String(e));
    return err('Something went wrong. Please try again.', 500);
  }
});

// ── Resolve a report's target into human-readable context ──────────────────────

async function enrichReport(db: SupabaseClient, r: Record<string, unknown>) {
  const targetType = r.target_type as string;
  const targetId = r.target_id as string;

  let targetLabel = '(deleted)';
  let targetLink: string | null = null;
  let targetOwnerId: string | null = null;
  let targetRemoved = false;

  try {
    if (targetType === 'listing') {
      const { data } = await db
        .from('listings').select('title, user_id, status').eq('id', targetId).maybeSingle();
      if (data) {
        targetLabel = data.title as string;
        targetLink = `/listing/${targetId}`;
        targetOwnerId = data.user_id as string;
        targetRemoved = data.status === 'removed';
      }
    } else if (targetType === 'profile') {
      const { data } = await db
        .from('profiles').select('display_name, username, is_suspended').eq('id', targetId).maybeSingle();
      if (data) {
        targetLabel = `${data.display_name} (@${data.username})`;
        targetLink = `/profile/${targetId}`;
        targetOwnerId = targetId;
        targetRemoved = !!data.is_suspended;
      }
    } else if (targetType === 'offer') {
      const { data } = await db
        .from('offers').select('user_id, listing_id').eq('id', targetId).maybeSingle();
      if (data) {
        targetLabel = `Offer on listing ${data.listing_id}`;
        targetOwnerId = data.user_id as string;
      }
    } else if (targetType === 'broadcast') {
      const { data } = await db
        .from('community_broadcasts').select('message, sender_id').eq('id', targetId).maybeSingle();
      if (data) {
        targetLabel = `"${String(data.message).slice(0, 60)}"`;
        targetOwnerId = data.sender_id as string;
      }
    }
  } catch { /* leave defaults */ }

  // Reporter display
  let reporterLabel = 'Unknown';
  if (r.reporter_id) {
    const { data } = await db
      .from('profiles').select('display_name, username').eq('id', r.reporter_id as string).maybeSingle();
    if (data) reporterLabel = `${data.display_name} (@${data.username})`;
  }

  return {
    id: r.id,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
    target_link: targetLink,
    target_owner_id: targetOwnerId,
    target_removed: targetRemoved,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution_note: r.resolution_note,
    reporter_label: reporterLabel,
    created_at: r.created_at,
  };
}
