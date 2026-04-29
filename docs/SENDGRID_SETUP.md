# SendGrid SMTP Production Setup

This guide covers SendGrid configuration for NewsHub production email delivery.

## Overview

NewsHub uses SendGrid SMTP relay for transactional emails:
- Email verification
- Password reset
- Password change confirmation

**Important:** SendGrid's free tier is a 60-day trial (100 emails/day). After trial expiration, a paid plan ($19.95/month minimum) is required.

## Prerequisites

- SendGrid account at [sendgrid.com](https://sendgrid.com)
- Domain with DNS access (for SPF/DKIM/DMARC)
- NewsHub backend deployed and accessible

## Step 1: Create SendGrid API Key

1. Log in to [SendGrid](https://app.sendgrid.com/)
2. Navigate to **Settings** > **API Keys**
3. Click **Create API Key**
4. Name: `NewsHub Production SMTP`
5. Permissions: **Full Access** (or "Mail Send" minimum)
6. Click **Create & View**
7. **Copy the API key** (shown only once!)

## Step 2: Configure Environment Variables

Add to your production `.env` file:

```bash
# SendGrid SMTP
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# Webhook signature verification (from Step 5)
SENDGRID_WEBHOOK_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxx

# Sender identity (D-24, D-26)
SMTP_FROM=noreply@newshub.app
```

## Step 3: Authenticate Domain (SPF/DKIM/DMARC)

Domain authentication improves deliverability and prevents emails from landing in spam.

### 3.1 Start Domain Authentication

1. Go to **Settings** > **Sender Authentication** > **Authenticate Your Domain**
2. Select your DNS host (e.g., Cloudflare, AWS Route53, GoDaddy)
3. Enter domain: `newshub.app` (or your domain)
4. Click **Next**

### 3.2 Add DNS Records

SendGrid will generate DNS records. Add them to your DNS provider:

#### SPF Record (TXT)

```
Type: TXT
Host: @ (or leave blank for root)
Value: v=spf1 include:sendgrid.net ~all
```

**Note:** If you already have an SPF record, add `include:sendgrid.net` to the existing record.

#### DKIM Records (2 CNAMEs)

```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u12345.wl234.sendgrid.net

Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u12345.wl234.sendgrid.net
```

**Important:** The actual CNAME values are unique to your SendGrid account. Use the values shown in your SendGrid dashboard.

#### DMARC Record (TXT)

```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@newshub.app
```

### 3.3 Verify DNS Records

1. Wait 24-48 hours for DNS propagation
2. Return to SendGrid dashboard
3. Click **Verify** to confirm records are detected
4. Status should change to **Verified**

### 3.4 Verify with dig (optional)

```bash
# Check SPF
dig TXT newshub.app | grep sendgrid

# Check DKIM
dig CNAME s1._domainkey.newshub.app

# Check DMARC
dig TXT _dmarc.newshub.app
```

## Step 4: Verify Sender Identity

If using a single sender (not full domain auth):

1. Go to **Settings** > **Sender Authentication** > **Single Sender Verification**
2. Click **Create New Sender**
3. From Email: `noreply@newshub.app`
4. From Name: `NewsHub`
5. Check your inbox for verification email
6. Click verification link

## Step 5: Configure Event Webhook

The webhook receives delivery notifications for bounce handling and metrics.

### 5.1 Enable Event Webhook

1. Go to **Settings** > **Mail Settings** > **Event Webhook**
2. Enable **Event Webhook**
3. HTTP Post URL: `https://newshub.app/api/email/webhook`
4. Select events:
   - [x] Delivered
   - [x] Bounce
   - [x] Dropped
   - [x] Spam Reports
   - [x] Unsubscribes
5. Leave unchecked: Processed, Deferred, Open, Click

### 5.2 Enable Signed Webhooks

1. Scroll to **Signed Event Webhook Requests**
2. Enable signing
3. Copy the **Verification Key** (ECDSA public key)
4. Add to `.env` as `SENDGRID_WEBHOOK_PUBLIC_KEY`

### 5.3 Test Webhook

1. Click **Test Your Integration**
2. Verify your server returns 200 OK
3. Check server logs for webhook receipt

## Step 6: Test Production Email Flows

### 6.1 Test Registration Email

```bash
curl -X POST https://newshub.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","password":"Test1234!","name":"Test User"}'
```

Verify:
- Email arrives in inbox (not spam)
- Subject: "Verify your NewsHub account / Bestaetige dein NewsHub-Konto"
- Verification link works

### 6.2 Test Password Reset Email

```bash
curl -X POST https://newshub.app/api/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

Verify:
- Email arrives in inbox (not spam)
- Subject: "Reset your NewsHub password / NewsHub Passwort zuruecksetzen"
- Reset link works

### 6.3 Test Password Change Confirmation

Complete a password reset, then verify:
- Confirmation email received
- "This wasn't me" recovery link works

## Monitoring

### Prometheus Metrics

Access at `/api/metrics`:

| Metric | Description |
|--------|-------------|
| `email_sent_total` | Total emails sent by type |
| `email_delivered_total` | Successfully delivered |
| `email_bounced_total` | Hard/soft bounces |
| `email_complained_total` | Spam complaints |
| `email_delivery_success_rate` | Delivery rate gauge |

### Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighEmailBounceRate | Bounce rate > 5% for 5m | Critical |
| LowEmailDeliveryRate | Delivery < 95% for 1h | Warning |

### SendGrid Dashboard

Check **Activity** > **Feed** for:
- Delivery status per email
- Bounce reasons
- Spam report details

## Troubleshooting

### Emails Not Arriving

1. Check SendGrid Activity Feed for delivery status
2. Verify DNS records: `dig TXT _dmarc.newshub.app`
3. Check spam/junk folder
4. Verify `SENDGRID_API_KEY` is correct

### Webhook Signature Verification Fails

1. Verify `SENDGRID_WEBHOOK_PUBLIC_KEY` matches SendGrid dashboard
2. Check server logs for raw body availability
3. Ensure no proxy is modifying request body

### High Bounce Rate Alert

1. Review bounce events in SendGrid Activity Feed
2. Check for test/invalid email addresses
3. Verify domain authentication is complete (SPF/DKIM/DMARC pass)
4. Review sender reputation in SendGrid dashboard

### Emails Landing in Spam

1. Verify all DNS records (SPF, DKIM, DMARC)
2. Check email headers for `SPF: PASS`, `DKIM: PASS`
3. Review content for spam triggers
4. Check sender reputation score

## Trial Expiration

SendGrid's 60-day trial ends on day 60 from account creation.

**Day 50 reminder:** Set calendar reminder to upgrade plan.

**After trial:**
- Emails will fail to send
- Upgrade to Essentials ($19.95/month) or Pro ($89.95/month)
- No code changes required after upgrade

## Support

- SendGrid Documentation: [docs.sendgrid.com](https://docs.sendgrid.com)
- SendGrid Status: [status.sendgrid.com](https://status.sendgrid.com)
- NewsHub Issues: Repository issue tracker
