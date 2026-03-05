const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const defaultDb = {
  users: {},
  devices: {},
  subscriptions: {},
  usage: {}
};

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    saveDb(defaultDb);
    return structuredClone(defaultDb);
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return structuredClone(defaultDb);
  }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

module.exports = { loadDb, saveDb };
