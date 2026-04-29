# Legal Documents / Rechtliche Dokumente

This directory contains Data Processing Agreements (DPAs) and other legal documents required for GDPR compliance.

Diese Verzeichnis enthält Auftragsverarbeitungsverträge (AVVs) und andere rechtliche Dokumente für die DSGVO-Compliance.

## Required Documents / Erforderliche Dokumente

### Data Processing Agreements (DPAs/AVVs)

| Provider | Purpose | Status | DPA Link |
|----------|---------|--------|----------|
| Twilio SendGrid | Email delivery | [ ] Pending | [Download DPA](https://www.twilio.com/legal/data-protection-addendum) |
| Sentry | Error tracking | [ ] Pending | [Sign DPA](https://sentry.io/legal/dpa/) |
| Google Cloud (Gemini) | AI analysis | [ ] Pending | [Download DPA](https://cloud.google.com/terms/data-processing-addendum) |
| DeepL | Translation | [ ] Pending | [Data Security](https://www.deepl.com/pro-data-security) |
| OpenRouter | AI routing | [ ] Pending | [Privacy Policy](https://openrouter.ai/privacy) |
| Anthropic | AI analysis | [ ] Pending | [Terms](https://www.anthropic.com/legal/commercial-terms) |

## How to Obtain DPAs / So erhalten Sie die AVVs

### SendGrid (Twilio)
1. Log in to [Twilio Console](https://console.twilio.com)
2. Go to Settings → Legal → Data Protection Addendum
3. Review and accept the DPA
4. Download PDF and save as `twilio-sendgrid-dpa.pdf`

### Sentry
1. Log in to [Sentry](https://sentry.io)
2. Go to Settings → Legal → Data Processing Addendum
3. Sign the DPA electronically
4. Download PDF and save as `sentry-dpa.pdf`

### Google Cloud (Gemini API)
1. Log in to [Google Cloud Console](https://console.cloud.google.com)
2. Go to IAM & Admin → Privacy & Security
3. Accept Data Processing Terms
4. Download PDF and save as `google-cloud-dpa.pdf`

### DeepL
1. Log in to [DeepL Pro](https://www.deepl.com/pro-account)
2. Go to Account → Legal Documents
3. Download DPA and save as `deepl-dpa.pdf`
4. Note: DeepL is based in Germany, no SCCs required

## File Naming Convention / Dateibenennungskonvention

```
{provider}-dpa-{YYYY-MM-DD}.pdf
```

Example: `twilio-sendgrid-dpa-2026-04-23.pdf`

## Checklist / Checkliste

- [ ] All DPAs signed and stored in this directory
- [ ] Standard Contractual Clauses (SCCs) included for US providers
- [ ] Annual review scheduled (recommended: Q1 each year)
- [ ] Contact person documented for each provider

## Annual Review / Jährliche Überprüfung

DPAs should be reviewed annually to ensure:
- Provider hasn't changed data processing terms
- New subprocessors are acceptable
- SCCs are still valid (check EU adequacy decisions)

**Next review due:** Q1 2027

## Contact / Kontakt

For questions about data processing agreements:
- Email: privacy@newshub.app
