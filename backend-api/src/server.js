const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { loadDb, saveDb } = require('./db');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

function now() { return new Date().toISOString(); }

function pickModelByPlan(user) {
  const explicit = user?.entitledModel;
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  const plan = user?.plan || 'free';
  if (plan === 'pro') return config.relay.proModel;
  if (plan === 'premium') return config.relay.premiumModel;
  return config.relay.freeModel;
}

function checkAndConsumeQuota(db, userId, plan) {
  db.usage[userId] = db.usage[userId] || { freeUsed: 0, apiKeyTrialUsed: 0 };
  const usage = db.usage[userId];

  // 当前策略：free 用 10 条 + 300 条试用池；premium/pro 默认不限（后续可加配额上限）
  if (plan === 'premium' || plan === 'pro') {
    return { allow: true, mode: plan, usage };
  }

  if (usage.freeUsed < 10) {
    usage.freeUsed += 1;
    return { allow: true, mode: 'free', usage };
  }
  if (usage.apiKeyTrialUsed < 300) {
    usage.apiKeyTrialUsed += 1;
    return { allow: true, mode: 'apiKeyTrial', usage };
  }
  return { allow: false, error: 'Quota exhausted. Please upgrade.' };
}

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
  const { userId, plan, entitledModel = '' } = req.body || {};
  if (!db.users[userId]) return res.status(404).json({ success: false, error: 'User not found' });
  if (!['free', 'premium', 'pro'].includes(plan)) return res.status(400).json({ success: false, error: 'invalid plan' });

  db.users[userId].plan = plan;
  db.users[userId].entitledModel = String(entitledModel || '').trim();
  db.subscriptions[userId] = {
    userId,
    plan,
    entitledModel: db.users[userId].entitledModel,
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

// relay endpoint: quota check + server-side forwarding (for users without own API key)
app.post('/v1/chat/relay', async (req, res) => {
  try {
    const db = loadDb();
    const { userId, messages = [] } = req.body || {};
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ success: false, error: 'messages required' });

    const quota = checkAndConsumeQuota(db, userId, user.plan || 'free');
    if (!quota.allow) {
      return res.status(402).json({ success: false, premiumRequired: true, error: quota.error });
    }

    const apiKey = String(config.relay.upstreamApiKey || '').trim();
    const baseUrl = String(config.relay.upstreamBaseUrl || '').trim().replace(/\/$/, '');
    if (!apiKey || !baseUrl) {
      return res.status(500).json({ success: false, error: 'Relay upstream is not configured' });
    }

    const model = pickModelByPlan(user);
    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, stream: false })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status || 502).json({
        success: false,
        error: data?.error?.message || data?.message || 'Upstream relay failed'
      });
    }

    saveDb(db);
    const content = data?.choices?.[0]?.message?.content || 'Received';
    res.json({ success: true, response: content, model, usage: db.usage[userId] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Relay error' });
  }
});

// stripe checkout mock endpoint (placeholder)
app.post('/v1/payments/checkout-session', (req, res) => {
  const { userId, plan } = req.body || {};
  if (!userId || !plan) return res.status(400).json({ success: false, error: 'userId and plan required' });

  const sessionId = 'cs_test_mock_' + Date.now();
  res.json({
    success: true,
    mode: 'mock',
    message: 'Replace with real Stripe SDK call later',
    sessionId,
    checkoutUrl: `http://127.0.0.1:${config.port}/checkout/mock?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&plan=${encodeURIComponent(plan)}`
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
