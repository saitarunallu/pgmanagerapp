const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite in-memory database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Companies table
    db.run(`CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active'
    )`);

    // Gateways table
    db.run(`CREATE TABLE gateways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_id INTEGER NOT NULL,
      pg_partner TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )`);

    // Rates table
    db.run(`CREATE TABLE rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway_id INTEGER NOT NULL,
      card_type TEXT NOT NULL,
      card_issuer TEXT NOT NULL,
      category TEXT NOT NULL,
      commission REAL NOT NULL,
      surcharge REAL DEFAULT 0,
      min_amount REAL NOT NULL,
      max_amount REAL NOT NULL,
      FOREIGN KEY (gateway_id) REFERENCES gateways(id) ON DELETE CASCADE
    )`);

    // Settings table (single row)
    db.run(`CREATE TABLE settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      categories TEXT NOT NULL,
      cardTypes TEXT NOT NULL,
      cardIssuers TEXT NOT NULL
    )`);

    // Favorites table
    db.run(`CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      card_type TEXT NOT NULL,
      card_issuer TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Pre-load SLPE data
    loadDefaultData();
  });
}

// Load default SLPE data
function loadDefaultData() {
  console.log('Loading default SLPE data...');

  // Insert company
  db.run(
    `INSERT INTO companies (name, description, status) VALUES (?, ?, ?)`,
    ['SLPE', 'SLPE Service Provider', 'active']
  );

  // Insert gateways
  const gateways = [
    ['Slpe silver edu pro', 1, 'slpe_silver_edu_pro', 'active'],
    ['Slpe silver edu', 1, 'slpe_silver_edu', 'active'],
    ['Slpe gold travel pure', 1, 'slpe_gold_travel_pure', 'active'],
    ['Slpe silver edu lite', 1, 'razorpay', 'active'],
    ['Slpe gold travel prime', 1, 'razorpay', 'active'],
    ['Slpe gold travel', 1, 'payu', 'active'],
    ['Slpe gold travel lite', 1, 'slpe_gold_travel_lite', 'active'],
    ['Slpe silver prime edu', 1, 'slpe_silver_prime_edu', 'active'],
    ['Razorpay', 1, 'razorpay', 'active'],
    ['Payu', 1, 'payu', 'active']
  ];

  const gatewayStmt = db.prepare(`INSERT INTO gateways (name, company_id, pg_partner, status) VALUES (?, ?, ?, ?)`);
  gateways.forEach(g => gatewayStmt.run(g));
  gatewayStmt.finalize();

  // Insert rates
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

  const rateStmt = db.prepare(
    `INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  rates.forEach(r => rateStmt.run(r));
  rateStmt.finalize();

  // Insert default settings
  const defaultSettings = {
    categories: ['education', 'gold', 'travel', 'fastag', 'utility', 'non_utility', 'general'],
    cardTypes: ['business', 'consumer', 'R', 'P', 'C', 'CC', 'upi_credit_card', 'business_visa', 'Visa', 'corporate', 'domestic', 'upi'],
    cardIssuers: ['HDFC', 'ICICI', 'SBI', 'AXIS', 'others']
  };

  db.run(
    `INSERT INTO settings (categories, cardTypes, cardIssuers) VALUES (?, ?, ?)`,
    [JSON.stringify(defaultSettings.categories), JSON.stringify(defaultSettings.cardTypes), JSON.stringify(defaultSettings.cardIssuers)],
    (err) => {
      if (err) {
        console.error('Error loading settings:', err);
      } else {
        console.log('Default data loaded successfully');
      }
    }
  );
}

// ==================== API ENDPOINTS ====================

// Companies endpoints
app.get('/api/companies', (req, res) => {
  db.all('SELECT * FROM companies', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/companies', (req, res) => {
  const { name, description, status } = req.body;
  db.run(
    'INSERT INTO companies (name, description, status) VALUES (?, ?, ?)',
    [name, description || '', status || 'active'],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, name, description, status: status || 'active' });
      }
    }
  );
});

app.put('/api/companies/:id', (req, res) => {
  const { name, description, status } = req.body;
  db.run(
    'UPDATE companies SET name = ?, description = ?, status = ? WHERE id = ?',
    [name, description, status, req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: req.params.id, name, description, status });
      }
    }
  );
});

app.delete('/api/companies/:id', (req, res) => {
  db.run('DELETE FROM companies WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Gateways endpoints
app.get('/api/gateways', (req, res) => {
  db.all('SELECT * FROM gateways', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/gateways', (req, res) => {
  const { name, company_id, pg_partner, status } = req.body;
  db.run(
    'INSERT INTO gateways (name, company_id, pg_partner, status) VALUES (?, ?, ?, ?)',
    [name, company_id, pg_partner, status || 'active'],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, name, company_id, pg_partner, status: status || 'active' });
      }
    }
  );
});

app.put('/api/gateways/:id', (req, res) => {
  const { name, company_id, pg_partner, status } = req.body;
  db.run(
    'UPDATE gateways SET name = ?, company_id = ?, pg_partner = ?, status = ? WHERE id = ?',
    [name, company_id, pg_partner, status, req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: req.params.id, name, company_id, pg_partner, status });
      }
    }
  );
});

app.delete('/api/gateways/:id', (req, res) => {
  db.run('DELETE FROM gateways WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Rates endpoints
app.get('/api/rates', (req, res) => {
  db.all('SELECT * FROM rates', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/rates', (req, res) => {
  const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
  db.run(
    `INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [gateway_id, card_type, card_issuer, category, commission, surcharge || 0, min_amount, max_amount],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({
          id: this.lastID,
          gateway_id,
          card_type,
          card_issuer,
          category,
          commission,
          surcharge: surcharge || 0,
          min_amount,
          max_amount
        });
      }
    }
  );
});

app.put('/api/rates/:id', (req, res) => {
  const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
  db.run(
    `UPDATE rates SET gateway_id = ?, card_type = ?, card_issuer = ?, category = ?, 
     commission = ?, surcharge = ?, min_amount = ?, max_amount = ? WHERE id = ?`,
    [gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount, req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({
          id: req.params.id,
          gateway_id,
          card_type,
          card_issuer,
          category,
          commission,
          surcharge,
          min_amount,
          max_amount
        });
      }
    }
  );
});

app.delete('/api/rates/:id', (req, res) => {
  db.run('DELETE FROM rates WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (row) {
      res.json({
        categories: JSON.parse(row.categories),
        cardTypes: JSON.parse(row.cardTypes),
        cardIssuers: JSON.parse(row.cardIssuers)
      });
    } else {
      res.json({ categories: [], cardTypes: [], cardIssuers: [] });
    }
  });
});

app.put('/api/settings', (req, res) => {
  const { categories, cardTypes, cardIssuers } = req.body;
  db.run(
    'UPDATE settings SET categories = ?, cardTypes = ?, cardIssuers = ? WHERE id = 1',
    [JSON.stringify(categories), JSON.stringify(cardTypes), JSON.stringify(cardIssuers)],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ categories, cardTypes, cardIssuers });
      }
    }
  );
});

// Favorites endpoints
app.get('/api/favorites', (req, res) => {
  db.all('SELECT * FROM favorites ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/favorites', (req, res) => {
  const { name, card_type, card_issuer, amount, category } = req.body;
  db.run(
    'INSERT INTO favorites (name, card_type, card_issuer, amount, category) VALUES (?, ?, ?, ?, ?)',
    [name, card_type, card_issuer, amount, category || 'All Categories'],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({
          id: this.lastID,
          name,
          card_type,
          card_issuer,
          amount,
          category: category || 'All Categories',
          created_at: new Date().toISOString()
        });
      }
    }
  );
});

app.delete('/api/favorites/:id', (req, res) => {
  db.run('DELETE FROM favorites WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints available at /api/*');
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
