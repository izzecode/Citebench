# Citebench SMTP Setup

Status: Required for external collaborators

Supabase's built-in email provider is limited to two project-wide emails per
hour and is intended only for development. Citebench needs custom SMTP before
external invitation and sign-in email testing.

## Recommended Provider

Use Resend with a domain or subdomain owned by the project.

1. Create a Resend account.
2. Add a sending subdomain such as `auth.citebench.com`.
3. Add the SPF and DKIM records shown by Resend to the domain's DNS settings.
4. Wait until Resend reports the domain as verified.
5. Create a Resend API key for Supabase Auth.

## Supabase Configuration

Open the Citebench Supabase project, then go to:

`Authentication > Emails > SMTP Settings`

Enable custom SMTP and enter:

- Sender name: `Citebench`
- Sender email: an address on the verified domain, such as
  `access@auth.citebench.com`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend API key

Save the settings.

## Rate Limits

After custom SMTP is enabled, open:

`Authentication > Rate Limits`

Set the project-wide email limit to a conservative initial value such as 30
emails per hour. Keep the per-user magic-link cooldown at 60 seconds.

## Acceptance Test

1. Invite one external test email from a hosted Citebench project.
2. Confirm exactly one invitation email appears in Resend's email log.
3. Open the newest link once in the collaborator's browser.
4. Confirm the reviewer changes from `pending` to `active`.
5. Confirm the collaborator lands in the assigned screening queue.
6. Do not remove and recreate the reviewer while testing an issued link because
   the original invitation is tied to the existing pending reviewer slot.

