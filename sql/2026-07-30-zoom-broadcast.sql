-- Run this once in the Supabase SQL editor.
-- Adds per-company Zoom Server-to-Server OAuth credentials (Zoom retired
-- JWT apps, so meeting creation requires account_id + client_id +
-- client_secret rather than a single API key) and a per-event table to
-- hold the Zoom meeting created for that event's broadcast.

alter table public.companies
    add column if not exists zoom_account_id text,
    add column if not exists zoom_client_id text,
    add column if not exists zoom_client_secret_encrypted text,
    add column if not exists zoom_connected boolean not null default false,
    add column if not exists zoom_connected_at timestamptz;

create table if not exists public.event_zoom_meetings (
    event_id uuid primary key references public.events(id) on delete cascade,
    zoom_meeting_id text not null,
    topic text,
    join_url text not null,
    start_url text,
    start_time timestamptz,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- event_addons.addon_key has a check constraint listing the valid addon
-- keys; "zoom_broadcast" is a new key and was missing from it, causing
-- "new row for relation event_addons violates check constraint
-- event_addons_addon_key_check" when saving the addon toggle. Recreate the
-- constraint with the full current set of addon keys.
alter table public.event_addons
    drop constraint if exists event_addons_addon_key_check;

alter table public.event_addons
    add constraint event_addons_addon_key_check
    check (addon_key in (
        'guest_invitations',
        'stripe_payments',
        'guest_table_selection',
        'badge_designer',
        'direct_printing',
        'zoom_broadcast'
    ));
