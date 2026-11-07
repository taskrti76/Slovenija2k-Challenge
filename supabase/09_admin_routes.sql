-- Slovenski 2000-čaki · admin fixes, part 2: a route's corrected line (or a whole new route) in fixes.data.geom - bigger than the
-- 4 kB that 08 allowed - and points (kind 'poi': huts, bivouacs, shelters, parkings, trailheads, springs, via ferratas).
-- Run after 08 (SQL Editor → New query → paste → Run). Safe to run again.
alter table public.fixes drop constraint if exists fixes_data_check;
alter table public.fixes add constraint fixes_data_check check (pg_column_size(data) < 200000);
alter table public.fixes drop constraint if exists fixes_kind_check;
alter table public.fixes add constraint fixes_kind_check check (kind in ('peak', 'route', 'closed', 'poi'));
