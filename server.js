const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('database.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gateways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL,
    pg_partner TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gateway_id INTEGER NOT NULL,
    card_type TEXT NOT NULL,
    card_issuer TEXT NOT NULL,
    category TEXT NOT NULL,
    commission REAL NOT NULL,
    surcharge REAL DEFAULT 0,
    min_amount REAL NOT NULL,
    max_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gateway_id) REFERENCES gateways(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    categories TEXT NOT NULL,
    card_types TEXT NOT NULL,
    card_issuers TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    card_type TEXT NOT NULL,
    card_issuer TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize default data if empty
const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get();
if (companyCount.count === 0) {
  console.log('Loading default SLPE data...');
  
  // Insert default SLPE company
  const insertCompany = db.prepare('INSERT INTO companies (name, description) VALUES (?, ?)');
  insertCompany.run('SLPE', 'SLPE Service Provider');

  const companyId = db.prepare('SELECT id FROM companies WHERE name = ?').get('SLPE').id;

  // Insert gateways
  const insertGateway = db.prepare('INSERT INTO gateways (name, company_id, pg_partner) VALUES (?, ?, ?)');
  const gateways = [
    ['Slpe silver edu pro', companyId, 'slpe_silver_edu_pro'],
    ['Slpe silver edu', companyId, 'slpe_silver_edu'],
    ['Slpe gold travel pure', companyId, 'slpe_gold_travel_pure'],
    ['Slpe silver edu lite', companyId, 'razorpay'],
    ['Slpe gold travel prime', companyId, 'razorpay'],
    ['Slpe gold travel', companyId, 'payu'],
    ['Slpe gold travel lite', companyId, 'slpe_gold_travel_lite'],
    ['Slpe silver prime edu', companyId, 'slpe_silver_prime_edu'],
    ['Razorpay', companyId, 'razorpay'],
    ['Payu', companyId, 'payu']
  ];
  gateways.forEach(g => insertGateway.run(...g));

  // Insert rates
  const insertRate = db.prepare('INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const rates = [
    [1, 'business', 'others', 'education', 2.7178, 0, 100, 100000],
    [1, 'consumer', 'others', 'education', 1.9, 0, 100, 100000],
    [2, 'R', 'others', 'education', 1.6, 0, 100, 50000],
    [2, 'P', 'others', 'education', 1.6, 0, 100, 50000],
    [2, 'C', 'others', 'education', 1.6, 0, 100, 50000],
    [2, 'upi_credit_card', 'others', 'education', 3, 0, 100, 50000],
    [3, 'business', 'others', 'travel', 1.85, 0, 100, 50000],
    [3, 'consumer', 'others', 'travel', 1.39, 0, 100, 50000],
    [4, 'business', 'others', 'education', 1.85, 0, 100, 95000],
    [4, 'consumer', 'others', 'education', 1.29, 0, 100, 95000],
    [5, 'business', 'others', 'travel', 1.85, 0, 100, 40000],
    [5, 'consumer', 'others', 'travel', 1.39, 0, 100, 40000],
    [6, 'CC', 'others', 'travel', 1.45, 0, 100, 100000],
    [7, 'upi_credit_card', 'others', 'travel', 3, 0, 100, 50000],
    [7, 'C', 'others', 'travel', 1.6, 0, 100, 50000],
    [7, 'P', 'others', 'travel', 1.6, 0, 100, 50000],
    [7, 'R', 'others', 'travel', 1.6, 0, 100, 50000],
    [8, 'corporate', 'others', 'education', 1.8, 0, 100, 200000],
    [8, 'domestic', 'others', 'education', 1.4, 0, 100, 200000],
    [9, 'Visa', 'others', 'general', 1.2, 0, 100, 95000],
    [10, 'CC', 'others', 'general', 1.2, 0, 10, 100000],
    [9, 'business_visa', 'HDFC', 'general', 2.9, 0, 100, 95000],
    [9, 'Visa', 'HDFC', 'general', 1.4, 0, 100, 95000],
    [9, 'business_visa', 'others', 'general', 1.5, 0, 100, 95000],
    [9, 'upi', 'others', 'general', 3, 0, 100, 95000]
  ];
  rates.forEach(r => insertRate.run(...r));

  // Insert default settings
  const defaultSettings = {
    categories: JSON.stringify(['education', 'gold', 'travel', 'fastag', 'utility', 'non_utility', 'general']),
    card_types: JSON.stringify(['business', 'consumer', 'R', 'P', 'C', 'CC', 'upi_credit_card', 'business_visa', 'Visa', 'corporate', 'domestic', 'upi']),
    card_issuers: JSON.stringify(['HDFC', 'ICICI', 'SBI', 'AXIS', 'others'])
  };
  db.prepare('INSERT INTO settings (id, categories, card_types, card_issuers) VALUES (1, ?, ?, ?)').run(
    defaultSettings.categories,
    defaultSettings.card_types,
    defaultSettings.card_issuers
  );
  
  console.log('Default SLPE data loaded successfully');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API Routes

// Companies
app.get('/api/companies', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY name').all();
  res.json(companies);
});

app.post('/api/companies', (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare('INSERT INTO companies (name, description) VALUES (?, ?)').run(name, description || '');
  res.json({ id: result.lastInsertRowid, name, description, status: 'active' });
});

app.put('/api/companies/:id', (req, res) => {
  const { name, description, status } = req.body;
  db.prepare('UPDATE companies SET name = ?, description = ?, status = ? WHERE id = ?').run(name, description, status, req.params.id);
  res.json({ id: req.params.id, name, description, status });
});

app.delete('/api/companies/:id', (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Gateways
app.get('/api/gateways', (req, res) => {
  const gateways = db.prepare('SELECT * FROM gateways ORDER BY name').all();
  res.json(gateways);
});

app.post('/api/gateways', (req, res) => {
  const { name, company_id, pg_partner } = req.body;
  const result = db.prepare('INSERT INTO gateways (name, company_id, pg_partner) VALUES (?, ?, ?)').run(name, company_id, pg_partner || '');
  res.json({ id: result.lastInsertRowid, name, company_id, pg_partner, status: 'active' });
});

app.put('/api/gateways/:id', (req, res) => {
  const { name, company_id, pg_partner, status } = req.body;
  db.prepare('UPDATE gateways SET name = ?, company_id = ?, pg_partner = ?, status = ? WHERE id = ?').run(name, company_id, pg_partner, status, req.params.id);
  res.json({ id: req.params.id, name, company_id, pg_partner, status });
});

app.delete('/api/gateways/:id', (req, res) => {
  db.prepare('DELETE FROM gateways WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Rates
app.get('/api/rates', (req, res) => {
  const rates = db.prepare('SELECT * FROM rates').all();
  res.json(rates);
});

app.post('/api/rates', (req, res) => {
  const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
  const result = db.prepare('INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    gateway_id, card_type, card_issuer, category, commission, surcharge || 0, min_amount, max_amount
  );
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/rates/:id', (req, res) => {
  const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
  db.prepare('UPDATE rates SET gateway_id = ?, card_type = ?, card_issuer = ?, category = ?, commission = ?, surcharge = ?, min_amount = ?, max_amount = ? WHERE id = ?').run(
    gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount, req.params.id
  );
  res.json({ id: req.params.id, ...req.body });
});

app.delete('/api/rates/:id', (req, res) => {
  db.prepare('DELETE FROM rates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (settings) {
    res.json({
      categories: JSON.parse(settings.categories),
      cardTypes: JSON.parse(settings.card_types),
      cardIssuers: JSON.parse(settings.card_issuers)
    });
  } else {
    res.json({ categories: [], cardTypes: [], cardIssuers: [] });
  }
});

app.put('/api/settings', (req, res) => {
  const { categories, cardTypes, cardIssuers } = req.body;
  db.prepare('UPDATE settings SET categories = ?, card_types = ?, card_issuers = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(
    JSON.stringify(categories),
    JSON.stringify(cardTypes),
    JSON.stringify(cardIssuers)
  );
  res.json({ categories, cardTypes, cardIssuers });
});

// Favorites
app.get('/api/favorites', (req, res) => {
  const favorites = db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all();
  res.json(favorites);
});

app.post('/api/favorites', (req, res) => {
  const { name, card_type, card_issuer, amount, category } = req.body;
  const result = db.prepare('INSERT INTO favorites (name, card_type, card_issuer, amount, category) VALUES (?, ?, ?, ?, ?)').run(
    name, card_type, card_issuer, amount, category || ''
  );
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.delete('/api/favorites/:id', (req, res) => {
  db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Railway/Render deployment ready!`);
});
