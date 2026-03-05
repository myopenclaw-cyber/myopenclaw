module.exports = {
  port: process.env.PORT || 18900,
  adminKey: process.env.ADMIN_KEY || 'mock_admin_replace_me',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_replace_me',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_replace_me',
    pricePremiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
    priceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    priceProYearly: process.env.STRIPE_PRICE_PRO_YEARLY || ''
  }
};
