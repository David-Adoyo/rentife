"""Branded Supabase Auth email templates (UK English). Run to print the JSON used to configure Supabase.

Templates use Supabase's Go template variables ({{ .ConfirmationURL }}, {{ .Token }}, {{ .Email }}).
"""
import json

LOGO = "https://rentife.co.ke/brand/rentife-wordmark-white.png"

def page(heading: str, body: str, button: str | None = None, after: str = "") -> str:
    btn = (
        f'<tr><td style="padding:8px 0 24px"><a href="{{{{ .ConfirmationURL }}}}" '
        f'style="display:inline-block;background:#4a2052;color:#ffffff;text-decoration:none;font-weight:600;'
        f'font-size:15px;padding:14px 28px;border-radius:999px">{button}</a></td></tr>'
        if button else ""
    )
    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{heading}</title></head>
<body style="margin:0;padding:0;background:#f5f1f0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1a1219">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1f0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden">
<tr><td style="background:#4a2052;padding:22px 32px"><img src="{LOGO}" alt="Rentife" width="120" height="30" style="display:block;border:0"></td></tr>
<tr><td style="padding:32px 32px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:24px;font-weight:600;letter-spacing:-0.02em;padding-bottom:12px">{heading}</td></tr>
<tr><td style="font-size:16px;line-height:1.6;color:#4a3f48;padding-bottom:20px">{body}</td></tr>
{btn}
{after}
<tr><td style="font-size:13px;line-height:1.6;color:#6b5c68;padding-bottom:28px;border-top:1px solid #e6dde0;padding-top:20px">
If you didn’t ask for this, you can ignore this email. Your account stays safe.</td></tr>
</table></td></tr></table>
<p style="font-size:12px;color:#9a8e97;margin:20px 0 0">Rentife · Rent that collects itself · Nairobi, Kenya</p>
</td></tr></table></body></html>"""

code_block = ('<tr><td style="padding:0 0 24px"><div style="font-size:13px;color:#6b5c68;padding-bottom:6px">Or enter this code:</div>'
              '<div style="font-family:Menlo,Consolas,monospace;font-size:28px;letter-spacing:6px;font-weight:600;color:#2a0f2e">{{ .Token }}</div></td></tr>')

templates = {
    "confirmation": ("Confirm your Rentife account",
        page("Confirm your email", "Welcome to Rentife. Confirm your email address to finish setting up your account.", "Confirm my email", code_block)),
    "magic_link": ("Your Rentife sign-in link",
        page("Sign in to Rentife", "Use the button below to sign in. The link works once and expires in one hour.", "Sign in", code_block)),
    "recovery": ("Reset your Rentife password",
        page("Reset your password", "We received a request to reset the password for {{ .Email }}. The link expires in one hour.", "Choose a new password")),
    "invite": ("You’ve been invited to Rentife",
        page("You’ve been invited", "You’ve been invited to join a Rentife account. Accept the invitation to set your password.", "Accept invitation")),
    "email_change": ("Confirm your new email address",
        page("Confirm your new email", "Confirm that you want to use {{ .NewEmail }} for your Rentife account.", "Confirm new email")),
    "reauthentication": ("Your Rentife security code",
        page("Confirm it’s you", "Enter this code to confirm a sensitive change to your account. It expires shortly.", None, code_block)),
}

config = {}
for key, (subject, html) in templates.items():
    config[f"mailer_subjects_{key}"] = subject
    config[f"mailer_templates_{key}_content"] = html
print(json.dumps(config))
