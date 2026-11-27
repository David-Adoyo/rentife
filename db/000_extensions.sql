-- Platform extensions used across the masterplan (§5.1). Applied first.
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;        -- name-similarity matching (§7.3)
create extension if not exists postgis;        -- optional property geo (§6.2)
create extension if not exists pg_cron;        -- billing runs, reminders, clean-up (§5.1)
create extension if not exists pg_net;         -- HTTP from the database (webhooks to edge functions)
create extension if not exists pgmq;           -- Supabase Queues (§5.1)
create extension if not exists supabase_vault; -- encrypted payment credentials (§6.5)
