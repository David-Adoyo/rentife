# Rentife admin

## Signing in
1. Go to `/admin/login`, enter your email and password.
2. Enter the 6-digit code from your authenticator app.
Sessions last 12 hours. "Sign out everywhere" ends every session on every device.

## Adding a staff member
Run this in the Supabase SQL editor (MedTRANS project), replacing the email, and keep the token secret:

```sql
-- 1. Create the account (no password yet).
insert into rentife.admins (email, name) values ('person@example.com', 'Their Name') returning id;
-- 2. Generate a long random token on your computer, e.g.:  openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
-- 3. Store only its SHA-256 hash (use the same token in the link):
insert into rentife.admin_invites (token_hash, admin_id, expires_at)
values (encode(sha256(convert_to('<TOKEN>', 'UTF8')), 'hex'), '<ADMIN_ID>', now() + interval '24 hours');
```
Send them `https://rentife.vercel.app/admin/invite/<TOKEN>`. It works once and expires after 24 hours.

## Locked out or lost your phone
Create a new invite for the same admin (step 3 above). Setting up again replaces the password and authenticator.

## Audit log
Every sign-in, lock-out, lead change and export is in `rentife.audit_log`. Entries cannot be edited by the app.
