module.exports = {
  port: process.env.PORT || 18900,
  adminKey: process.env.ADMIN_KEY || 'mock_admin_replace_me',
  relay: {
    upstreamBaseUrl: process.env.RELAY_UPSTREAM_BASE_URL || 'https://www.ai678.top',
    upstreamApiKey: process.env.RELAY_UPSTREAM_API_KEY || '',
    freeModel: process.env.RELAY_MODEL_FREE || 'openai/gpt-4o-mini',
    premiumModel: process.env.RELAY_MODEL_PREMIUM || 'claude-sonnet-4-6',
    proModel: process.env.RELAY_MODEL_PRO || 'claude-opus-4-1'
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_replace_me',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_replace_me',
    pricePremiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
    priceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    priceProYearly: process.env.STRIPE_PRICE_PRO_YEARLY || ''
  }
};
