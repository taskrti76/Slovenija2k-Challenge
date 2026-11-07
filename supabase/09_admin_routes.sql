-- Slovenski 2000-čaki · admin route lines: a route's corrected line (or a whole new route) is stored in fixes.data.geom,
-- which is bigger than the 4 kB that 08 allowed. Run after 08 (SQL Editor → New query → paste → Run). Safe to run again.
alter table public.fixes drop constraint if exists fixes_data_check;
alter table public.fixes add constraint fixes_data_check check (pg_column_size(data) < 200000);
