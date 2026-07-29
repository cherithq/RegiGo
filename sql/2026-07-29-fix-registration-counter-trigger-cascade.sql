-- Run this once in the Supabase SQL editor, after
-- sql/2026-07-29-cascade-event-deletes.sql.
--
-- That earlier migration made every FK referencing events(id) cascade,
-- including registrations_event_id_fkey. That's correct in principle, but
-- it means deleting an event now makes Postgres auto-cascade-delete the
-- event's `registrations` rows as part of the same `DELETE FROM events`
-- statement. Those cascading deletes fire the AFTER DELETE trigger
-- `regigo_registration_counter_trigger_v2` on `registrations`, which tries
-- to INSERT/UPSERT into `event_guest_counters` for `old.event_id` — but by
-- that point in the cascade the `events` row is already gone, so the write
-- fails with:
--   insert or update on table "event_guest_counters" violates foreign key
--   constraint "event_guest_counters_event_id_fkey"
-- This happens on every deletion via regigo_delete_event_v1 (which relies
-- solely on DB-level cascade, unlike the app's own delete route which
-- clears dependents itself before deleting the event row).
--
-- Fix: skip the counter upsert when the target event no longer exists.
-- The counter row is being torn down anyway in that case, so there's
-- nothing to update. Behavior for live events is unchanged.

create or replace function public.regigo_registration_counter_trigger_v2()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
    v_old_quantity bigint := 0;
    v_new_quantity bigint := 0;
    v_event_id uuid;
begin
    if tg_op <> 'INSERT' then
        v_old_quantity :=
            public.regigo_registration_quantity_v2(
                old.registration_status,
                old.selected_ticket_quantity
            );
    end if;

    if tg_op <> 'DELETE' then
        v_new_quantity :=
            public.regigo_registration_quantity_v2(
                new.registration_status,
                new.selected_ticket_quantity
            );
    end if;

    if tg_op = 'UPDATE'
       and old.event_id is distinct from new.event_id then
        if exists (select 1 from public.events e where e.id = old.event_id) then
            insert into public.event_guest_counters(event_id, registered_quantity, updated_at)
            values(old.event_id, 0, now())
            on conflict (event_id) do update
            set registered_quantity =
                    greatest(0, public.event_guest_counters.registered_quantity - v_old_quantity),
                updated_at = now();
        end if;

        if exists (select 1 from public.events e where e.id = new.event_id) then
            insert into public.event_guest_counters(event_id, registered_quantity, updated_at)
            values(new.event_id, v_new_quantity, now())
            on conflict (event_id) do update
            set registered_quantity =
                    greatest(0, public.event_guest_counters.registered_quantity + v_new_quantity),
                updated_at = now();
        end if;

        return new;
    end if;

    v_event_id :=
        case
            when tg_op = 'DELETE' then old.event_id
            else new.event_id
        end;

    if exists (select 1 from public.events e where e.id = v_event_id) then
        insert into public.event_guest_counters(event_id, registered_quantity, updated_at)
        values(v_event_id, greatest(0, v_new_quantity - v_old_quantity), now())
        on conflict (event_id) do update
        set registered_quantity =
                greatest(0, public.event_guest_counters.registered_quantity + v_new_quantity - v_old_quantity),
            updated_at = now();
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$function$;
