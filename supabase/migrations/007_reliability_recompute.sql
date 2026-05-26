-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-recompute reliability_scores when offers change status or get rated.
--
-- The reliability model:
--   total_offers      = count of all non-pending offers the user has made
--   completed         = count of offers marked completed
--   avg_rating        = avg of rating_by_requester (1-5) across completed offers
--   actual_score      = 0-100, derived from completion rate + avg rating
--   overall           = same as actual_score for now (kept as a separate field
--                       so we can later blend in self-assessment calibration)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.recompute_reliability(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total        int;
  v_completed    int;
  v_avg_rating   float;
  v_completion   float;
  v_score        float;
begin
  select count(*) into v_total
    from public.offers
    where user_id = target_user_id and status in ('accepted', 'completed', 'declined');

  select count(*) into v_completed
    from public.offers
    where user_id = target_user_id and status = 'completed';

  select coalesce(avg(rating_by_requester), 0) into v_avg_rating
    from public.offers
    where user_id = target_user_id
      and status = 'completed'
      and rating_by_requester is not null;

  v_completion := case when v_total > 0 then v_completed::float / v_total else 0 end;

  -- 60% completion-rate, 40% rating (rating is 1-5 → normalize to 0-1)
  v_score := round((v_completion * 60 + (v_avg_rating / 5.0) * 40)::numeric, 1);

  update public.reliability_scores
     set total_offers   = v_total,
         completed      = v_completed,
         avg_rating     = v_avg_rating,
         actual_score   = v_score,
         overall        = v_score,
         updated_at     = now()
   where user_id = target_user_id;

  -- Make sure a row exists (the auto-profile trigger should have created one,
  -- but be defensive in case of pre-existing users)
  if not found then
    insert into public.reliability_scores (user_id, total_offers, completed, avg_rating, actual_score, overall)
    values (target_user_id, v_total, v_completed, v_avg_rating, v_score, v_score);
  end if;
end $$;

-- Trigger: whenever an offer status or rating changes, recompute the helper's score
create or replace function public.offers_recompute_reliability()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Recompute for the helper (user_id on offers row)
  perform public.recompute_reliability(new.user_id);
  return new;
end $$;

drop trigger if exists trg_offers_reliability on public.offers;
create trigger trg_offers_reliability
  after insert or update of status, rating_by_requester on public.offers
  for each row
  execute function public.offers_recompute_reliability();
