-- Run this once in the Supabase SQL editor.
-- Fixes "insert or update on table ... violates foreign key constraint
-- ..._event_id_fkey" errors when deleting an event
-- (app/api/events/[eventId]/delete/route.ts does a plain
-- `delete from events where id = ...` and relies on the DB to cascade).
--
-- Rather than hardcoding a table list (which drifts as the schema grows),
-- this discovers every foreign key in the public schema that references
-- events(id) and is NOT already ON DELETE CASCADE, then rebuilds each one
-- with ON DELETE CASCADE so deleting an event always fully removes
-- everything that belongs to it (guest counters, check-ins, tables,
-- invitations, orders/order_items, etc.).

do $$
declare
    r record;
begin
    for r in
        select
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
            and tc.table_schema = kcu.table_schema
        join information_schema.constraint_column_usage ccu
            on tc.constraint_name = ccu.constraint_name
            and tc.table_schema = ccu.table_schema
        join information_schema.referential_constraints rc
            on tc.constraint_name = rc.constraint_name
            and tc.table_schema = rc.constraint_schema
        where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_schema = 'public'
            and ccu.table_schema = 'public'
            and ccu.table_name = 'events'
            and ccu.column_name = 'id'
            and rc.delete_rule <> 'CASCADE'
    loop
        execute format(
            'alter table %I.%I drop constraint %I',
            r.table_schema, r.table_name, r.constraint_name
        );
        execute format(
            'alter table %I.%I add constraint %I foreign key (%I) references public.events(id) on delete cascade',
            r.table_schema, r.table_name, r.constraint_name, r.column_name
        );
        raise notice 'Cascaded %.% (%)', r.table_schema, r.table_name, r.constraint_name;
    end loop;
end $$;
