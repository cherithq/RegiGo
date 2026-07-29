-- Run this once in the Supabase SQL editor.
-- Adds a per-event settings table mirroring event_table_selection_settings'
-- allow_registration_selection/allow_rsvp_selection pair, but for ticket
-- sales: lets an organiser independently turn ticket purchasing on/off for
-- public self-registration guests vs invitation/RSVP guests. Both default
-- true so existing events keep today's behaviour (ticket sales controlled
-- only by the event_addons "stripe_payments" enabled flag) until an
-- organiser explicitly narrows it on the Tickets & Payments page.

create table if not exists public.event_ticket_settings (
    event_id uuid primary key references public.events(id) on delete cascade,
    allow_registration_sales boolean not null default true,
    allow_rsvp_sales boolean not null default true,
    updated_at timestamptz not null default now()
);
