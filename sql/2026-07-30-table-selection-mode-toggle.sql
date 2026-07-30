-- Run this once in the Supabase SQL editor.
-- The Table Selection settings page (components/tables/TableSelectionManager.tsx)
-- lets an organiser independently allow table selection for public
-- self-registration guests vs invitation/RSVP guests, mirroring the same
-- split later added for ticket sales (event_ticket_settings). These two
-- columns were never captured in a migration file, so on a database where
-- they don't exist yet, every "Save Settings" click on the Table Selection
-- page fails with a "could not find column" error (the app's fallback logic
-- only knows how to retry without the appearance columns, not these).

alter table public.event_table_selection_settings
    add column if not exists allow_registration_selection boolean not null default true,
    add column if not exists allow_rsvp_selection boolean not null default true;
