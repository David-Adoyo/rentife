-- Queues, private storage buckets and scheduled jobs (masterplan §5.1, §5.2, §6).

-- Queues (pgmq). Payment ingestion and outbound messages are processed asynchronously.
select pgmq.create('payments_ingest') where not exists (select 1 from pgmq.list_queues() where queue_name = 'payments_ingest');
select pgmq.create('messages_outbox') where not exists (select 1 from pgmq.list_queues() where queue_name = 'messages_outbox');
select pgmq.create('pdf_render')      where not exists (select 1 from pgmq.list_queues() where queue_name = 'pdf_render');

-- Private storage buckets, served through signed URLs only (§5.1 Storage).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('meter-photos',      'meter-photos',      false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('inspection-photos', 'inspection-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('documents',         'documents',         false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('pdfs',              'pdfs',              false, 10485760, array['application/pdf']),
  ('imports',           'imports',           false, 20971520, array['text/csv','application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Scheduled housekeeping: remove admin invites that expired more than 7 days ago (daily, 03:15 Nairobi = 00:15 UTC).
select cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-admin-invites';
select cron.schedule('purge-expired-admin-invites', '15 0 * * *',
  $$delete from rentife.admin_invites where used_at is null and expires_at < now() - interval '7 days'$$);
