# Production operations

## Required environment

Set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 characters, database credentials, `CLIENT_URL`, `CORS_ORIGINS`, AWS S3 credentials, SMTP credentials, Razorpay keys, and `RAZORPAY_WEBHOOK_SECRET`. Never commit the real `.env` file.

## Deploy

Run `npm ci`, then `npm start`. Startup applies every pending versioned migration before starting the API. Deploy one instance first when a migration is pending, then roll out remaining instances.

## Database backup and restore

Create an encrypted daily database snapshot with the cloud database provider. Retain daily snapshots for 14 days and monthly snapshots for 12 months. Before every schema deployment, take an on-demand snapshot.

At least quarterly, restore the latest snapshot into an isolated database, run `npm run migrate`, and verify booking, payment, refund, property-image, and host-KYC row counts. A backup is not considered valid until this restore test succeeds.

## Health and monitoring

Use `GET /health` for process liveness and `GET /ready` for database readiness. Alert on readiness failures, HTTP 5xx rate, failed webhook rows, failed gateway refunds, email delivery failures, database saturation, and S3 upload errors.

## Razorpay

Configure the webhook URL as `/api/payments/razorpay-webhook` and subscribe to payment captured/failed and refund processed/failed events. Use the exact same webhook secret configured in the environment.
