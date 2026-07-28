-- Run this once in the Supabase SQL editor.
-- Adds per-company SMTP fields so an event company can send emails
-- through their own mail server/domain instead of RegiGo's shared SMTP account.
-- Reuses the existing custom_sender_status/custom_sender_reviewed_at/etc.
-- approval workflow already used for the custom sender name/reply-to.

alter table public.companies
    add column if not exists custom_smtp_host text,
    add column if not exists custom_smtp_port integer,
    add column if not exists custom_smtp_secure boolean not null default false,
    add column if not exists custom_smtp_username text,
    add column if not exists custom_smtp_password_encrypted text,
    add column if not exists custom_smtp_from_address text;
