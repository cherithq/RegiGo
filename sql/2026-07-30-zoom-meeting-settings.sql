-- Run this once in the Supabase SQL editor (after sql/2026-07-30-zoom-broadcast.sql).
-- Lets an event company configure the Zoom meeting's host-control settings
-- instead of the previous hardcoded values (join_before_host was always
-- true, waiting_room/mute_upon_entry were always false). Defaults below
-- match that prior hardcoded behaviour, so existing meetings/events are
-- unaffected until an organiser explicitly changes them.

alter table public.event_zoom_meetings
    add column if not exists join_before_host boolean not null default true,
    add column if not exists waiting_room boolean not null default false,
    add column if not exists mute_upon_entry boolean not null default false;
