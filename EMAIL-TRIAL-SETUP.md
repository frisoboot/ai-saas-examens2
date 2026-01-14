# Email & Trial Management System

## Overview

This system handles:
- Welcome emails when users register
- Trial reminder emails (2 days before expiration)
- Trial expired emails
- Automatic account deactivation after trial expiration

## Architecture

### 1. Email Service (`services/emailService.ts`)

Uses Resend API for sending transactional emails.

**Functions:**
- `sendWelcomeEmail()` - Sent immediately after registration
- `sendTrialEndingEmail()` - Sent 2 days before trial expires
- `sendTrialExpiredEmail()` - Sent when trial expires

**Environment Variables Required:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 2. Registration Flow (`api/register-student.ts`)

**Flow:**
1. Create Supabase auth user
2. Create student profile (subscription_status: 'inactive')
3. Create Mollie customer
4. Create first payment (€0.01 for mandate)
5. Create subscription (starts after 7 days)
6. **Send welcome email** (non-blocking)
7. Redirect to payment page

**Important:** Welcome email is sent asynchronously and won't block registration if it fails.

### 3. Payment Webhook (`api/mollie-webhook.ts`)

When the first payment (€0.01) is successful:
- Sets `subscription_status: 'trial'`
- Sets `trial_started_at: now()`
- Sets `trial_ends_at: now() + 7 days`

### 4. Cron Jobs

#### Check Expired Trials (`api/cron-check-expired-trials.ts`)
**Schedule:** Daily at 9:00 AM
**Actions:**
- Find all students with `subscription_status: 'trial'` where `trial_ends_at < today`
- Deactivate account (`is_active: false`)
- Update status to `expired`
- Send trial expired email

#### Send Trial Reminders (`api/cron-trial-reminders.ts`)
**Schedule:** Daily at 10:00 AM
**Actions:**
- Find students whose trial ends in exactly 2 days
- Send reminder email with upgrade/cancel instructions

### 5. Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron-check-expired-trials",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron-trial-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Note:** Vercel Cron is only available on Pro plans. For Hobby plans, use alternative solutions:
- GitHub Actions with scheduled workflows
- External cron services (cron-job.org, EasyCron)
- Uptime monitors (UptimeRobot with webhook feature)

## Environment Variables

Add these to your `.env` and Vercel project settings:

```bash
# Resend API (for emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron Job Security
CRON_SECRET=your-random-secret-token-here

# Existing variables
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
MOLLIE_API_KEY=xxx
VITE_APP_URL=https://examentrainer.nl
```

## Email Templates

All emails use inline CSS for compatibility with email clients.

**Design:**
- Blue gradient header
- Clean, Apple-inspired styling
- Mobile responsive
- Clear call-to-action buttons

**Branding:**
- From: `Examentrainer.nl <noreply@examentrainer.nl>`
- Consistent color scheme (blue-600, purple-600)

## Testing

### Test Welcome Email (Dev Mode)
When `NODE_ENV=development` or `RESEND_API_KEY` is missing, emails are logged to console instead of sent.

```typescript
// In development, you'll see:
📧 [DEV] Welcome email would be sent to: user@example.com
Subject: Welkom bij Examentrainer.nl - Je 7 Dagen Trial is Gestart!
```

### Test Cron Jobs Locally

```bash
# Test expired trials check
curl -X POST http://localhost:5173/api/cron-check-expired-trials \
  -H "Authorization: Bearer dev-secret-change-in-production"

# Test trial reminders
curl -X POST http://localhost:5173/api/cron-trial-reminders \
  -H "Authorization: Bearer dev-secret-change-in-production"
```

### Test in Production

Use Vercel's cron dashboard or trigger manually:

```bash
curl -X POST https://examentrainer.nl/api/cron-check-expired-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Security

### Cron Job Authentication
All cron endpoints require the `CRON_SECRET` token in the Authorization header:

```
Authorization: Bearer YOUR_CRON_SECRET
```

This prevents unauthorized triggering of cron jobs.

### Email Service
- Resend API handles SPF/DKIM/DMARC automatically
- Emails are sent from verified domain: `noreply@examentrainer.nl`
- Non-blocking sends (failures won't break registration)

## Database Schema

Required columns in `student_profiles`:

```sql
subscription_status VARCHAR(20) -- 'inactive', 'trial', 'active', 'expired'
trial_started_at TIMESTAMP
trial_ends_at TIMESTAMP
is_active BOOLEAN
email VARCHAR(255)
name VARCHAR(255)
```

## Troubleshooting

### Emails Not Sending
1. Check `RESEND_API_KEY` is set in environment
2. Verify domain is verified in Resend dashboard
3. Check Resend logs at https://resend.com/logs
4. Ensure "from" address matches verified domain

### Cron Jobs Not Running
1. Verify Vercel plan supports cron (Pro plan required)
2. Check cron logs in Vercel dashboard
3. Ensure `CRON_SECRET` is set correctly
4. Test endpoints manually with curl

### Trials Not Expiring
1. Check webhook is receiving payment confirmations
2. Verify `trial_ends_at` is set correctly in database
3. Check cron job logs for errors
4. Ensure date comparisons use ISO format strings

## Alternative Cron Solutions (Hobby Plan)

### GitHub Actions (Free)

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Daily Cron Jobs
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC
    - cron: '0 10 * * *' # 10 AM UTC
  workflow_dispatch:

jobs:
  expired-trials:
    runs-on: ubuntu-latest
    steps:
      - name: Check Expired Trials
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron-check-expired-trials \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  trial-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Trial Reminders
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron-trial-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Future Improvements

- [ ] Add email open/click tracking
- [ ] Add unsubscribe functionality
- [ ] A/B test email templates
- [ ] Add SMS reminders for high-value users
- [ ] Track email delivery rates
- [ ] Add custom email preferences per user
