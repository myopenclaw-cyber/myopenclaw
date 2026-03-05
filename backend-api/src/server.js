const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { loadDb, saveDb } = require('./db');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

function now() { return new Date().toISOString(); }

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'myopenclaw-backend-api', time: now() });
});

// user init/login mock
app.post('/v1/users/init', (req, res) => {
  const db = loadDb();
  const { email = '', name = '' } = req.body || {};
  const userId = uuidv4();
  db.users[userId] = {
    id: userId,
    email,
    name,
    createdAt: now(),
    plan: 'free'
  };
  db.usage[userId] = { freeUsed: 0, apiKeyTrialUsed: 0 };
  saveDb(db);
  res.json({ success: true, user: db.users[userId] });
});

// free trial + quota API (authoritative)
app.get('/v1/quota/:userId', (req, res) => {
  const db = loadDb();
  const { userId } = req.params;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const usage = db.usage[userId] || { freeUsed: 0, apiKeyTrialUsed: 0 };
  res.json({
    success: true,
    plan: user.plan,
    limits: { free: 10, apiKeyTrial: 300 },
    usage,
    remaining: {
      free: Math.max(0, 10 - usage.freeUsed),
      apiKeyTrial: Math.max(0, 300 - usage.apiKeyTrialUsed)
    }
  });
});

app.post('/v1/quota/consume', (req, res) => {
  const db = loadDb();
  const { userId, mode = 'free' } = req.body || {};
  const user = db.users[userId];
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  db.usage[userId] = db.usage[userId] || { freeUsed: 0, apiKeyTrialUsed: 0 };
  const usage = db.usage[userId];

  if (mode === 'free') usage.freeUsed += 1;
  if (mode === 'apiKeyTrial') usage.apiKeyTrialUsed += 1;

  saveDb(db);
  res.json({ success: true, usage });
});

// device binding
app.post('/v1/devices/bind', (req, res) => {
  const db = loadDb();
  const { userId, deviceId, platform = 'unknown' } = req.body || {};
  if (!db.users[userId]) return res.status(404).json({ success: false, error: 'User not found' });
  if (!deviceId) return res.status(400).json({ success: false, error: 'deviceId required' });

  db.devices[deviceId] = {
    deviceId,
    userId,
    platform,
    boundAt: now()
  };
  saveDb(db);
  res.json({ success: true, binding: db.devices[deviceId] });
});

// subscription management (mock)
app.post('/v1/subscriptions/set-plan', (req, res) => {
  const db = loadDb();
  const { userId, plan } = req.body || {};
  if (!db.users[userId]) return res.status(404).json({ success: false, error: 'User not found' });
  if (!['free', 'premium', 'pro'].includes(plan)) return res.status(400).json({ success: false, error: 'invalid plan' });

  db.users[userId].plan = plan;
  db.subscriptions[userId] = {
    userId,
    plan,
    updatedAt: now(),
    source: 'manual-or-webhook'
  };
  saveDb(db);
  res.json({ success: true, subscription: db.subscriptions[userId] });
});

app.get('/v1/subscriptions/:userId', (req, res) => {
  const db = loadDb();
  const sub = db.subscriptions[req.params.userId] || null;
  res.json({ success: true, subscription: sub });
});

// stripe checkout mock endpoint (placeholder)
app.post('/v1/payments/checkout-session', (req, res) => {
  const { userId, plan } = req.body || {};
  if (!userId || !plan) return res.status(400).json({ success: false, error: 'userId and plan required' });

  res.json({
    success: true,
    mode: 'mock',
    message: 'Replace with real Stripe SDK call later',
    sessionId: 'cs_test_mock_' + Date.now(),
    checkoutUrl: ''
  });
});

// stripe webhook mock endpoint
app.post('/v1/payments/stripe-webhook', (req, res) => {
  // keep raw event body for future signature validation
  res.json({ success: true, mode: 'mock', received: true });
});

app.listen(config.port, () => {
  console.log(`[backend-api] running on http://127.0.0.1:${config.port}`);
});
