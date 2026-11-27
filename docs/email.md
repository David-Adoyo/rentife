# Login emails (Resend → Supabase Auth)

Supabase Auth sends sign-in, confirmation, password-reset and invite emails through Resend's SMTP,
as **Rentife <no-reply@rentife.co.ke>**, using a Resend key limited to *sending* from rentife.co.ke.

## DNS records for rentife.co.ke (add at Hostpinnacle → cPanel → Zone Editor)

| Type | Name / Host | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFp/ZSZeO49NJ8VWeVop8lDqKky+G6n+B8L7D7g57sZJfUZIcKo+K9HBIed4mKjt5rxMHNM2DDO7vbqJCOw9zmNlgLQjFLiN0KmHBI5RcmfGEc9cX3dlG4/3UlBFLzWny04f4RT7z/tfsmKtxIg1tZa3BREFFVGV0kP66LgTkV3QIDAQAB` | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend` | `send.forge.rmta.net` | — |
| TXT (recommended) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@rentife.co.ke` | — |

These sit on the `send`, `rsend` and `resend._domainkey` sub-names, so they don't affect any email
already hosted on rentife.co.ke itself.

## Templates
`emails/build.py` holds the branded templates (UK English). Run it and PATCH the output to
`/v1/projects/<ref>/config/auth` to update them.
