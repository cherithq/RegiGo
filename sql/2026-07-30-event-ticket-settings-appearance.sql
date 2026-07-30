-- Run this once in the Supabase SQL editor (after sql/2026-07-30-event-ticket-settings.sql).
-- Adds "Page Appearance" columns to event_ticket_settings, mirroring the
-- page_title/page_subtitle/banner_color_from/banner_color_to/banner_image_url
-- columns already on event_table_selection_settings, so the guest-facing
-- ticket-purchase pages (registration + invite/RSVP) can carry the same
-- custom banner (title, subtitle, gradient or image) that table selection
-- already supports.

alter table public.event_ticket_settings
    add column if not exists page_title text,
    add column if not exists page_subtitle text,
    add column if not exists banner_color_from text,
    add column if not exists banner_color_to text,
    add column if not exists banner_image_url text;
