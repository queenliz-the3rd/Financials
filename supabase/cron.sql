-- Schedule the weekly-insight function to run ONCE PER HOUR.
-- The function itself decides who is "due" based on each user's timezone,
-- chosen day, and hour — so a single hourly schedule covers everyone.
--
-- Run this in the Supabase SQL Editor AFTER deploying the edge function.
-- Replace the two placeholders below:
--   <PROJECT_REF>        -> your project ref (Project Settings → General)
--   <SERVICE_ROLE_KEY>   -> Project Settings → API → service_role key
--
-- (The service-role key is what lets the scheduled call read every user's data.
--  Keep it secret — it only lives here in your own database.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule with this name, then (re)create it.
select cron.unschedule('penny-weekly-insight')
where exists (select 1 from cron.job where jobname = 'penny-weekly-insight');

select cron.schedule(
  'penny-weekly-insight',
  '0 * * * *', -- top of every hour
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Handy: see scheduled jobs ->  select * from cron.job;
-- Handy: see recent runs   ->  select * from cron.job_run_details order by start_time desc limit 10;
