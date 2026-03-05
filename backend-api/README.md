# MyOpenClaw Backend API (separate directory)

Location:
- `myopenclaw/backend-api`

## Run
```bash
cd backend-api
npm install
npm start
```
Default port: `18900`

## Env placeholders
Use env vars later (now mock/empty is allowed):
- `PORT`
- `ADMIN_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`

## API (mock-ready)
- `GET /health`
- `POST /v1/users/init`
- `GET /v1/quota/:userId`
- `POST /v1/quota/consume`
- `POST /v1/devices/bind`
- `POST /v1/subscriptions/set-plan`
- `GET /v1/subscriptions/:userId`
- `POST /v1/payments/checkout-session`
- `POST /v1/payments/stripe-webhook`

This is the backend skeleton for commercialization flow. Replace mock payment logic with real Stripe SDK later.
