# Ops Playbook

- Peak Mode toggle stored in Settings.
- Cutoff rules managed per festival + city tier.
- Batch/lot tracking for FEFO dispatch.
- Expiry alerts 90/60/30 days.
## Peak Mode
- Toggle stored in `Setting` with key `peakMode`.
- Use to trigger banner messaging and operational throttling.

## FEFO
- Batch model supports expiry dates.
- Build queue by sorting batches ascending by expiry.

## Serviceability
- Manage pincode, city, state, and tier.
- Use cutoffs by festival and city tier for messaging.

## Needs Setup
Courier, payments, WhatsApp, and email are stubbed; integrate before production.
