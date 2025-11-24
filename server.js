const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gateways (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        pg_partner TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rates (
        id SERIAL PRIMARY KEY,
        gateway_id INTEGER NOT NULL,
        card_type TEXT NOT NULL,
        card_issuer TEXT NOT NULL,
        category TEXT NOT NULL,
        commission DECIMAL NOT NULL,
        surcharge DECIMAL DEFAULT 0,
        min_amount DECIMAL NOT NULL,
        max_amount DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gateway_id) REFERENCES gateways(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        categories TEXT NOT NULL,
        card_types TEXT NOT NULL,
        card_issuers TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT settings_single_row CHECK (id = 1)
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        card_type TEXT NOT NULL,
        card_issuer TEXT NOT NULL,
        amount DECIMAL NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Initialize default data if empty
    const countResult = await client.query('SELECT COUNT(*) as count FROM companies');
    if (countResult.rows[0].count === '0') {
      console.log('Loading default SLPE data...');
      
      // Insert default SLPE company
      const companyResult = await client.query(
        'INSERT INTO companies (name, description) VALUES ($1, $2) RETURNING id',
        ['SLPE', 'SLPE Service Provider']
      );
      const companyId = companyResult.rows[0].id;

      // Insert gateways and capture their IDs
      const gatewayIds = {};
      const gatewayData = [
        ['Slpe silver edu pro', 'slpe_silver_edu_pro'],
        ['Slpe silver edu', 'slpe_silver_edu'],
        ['Slpe gold travel pure', 'slpe_gold_travel_pure'],
        ['Slpe silver edu lite', 'razorpay'],
        ['Slpe gold travel prime', 'razorpay'],
        ['Slpe gold travel', 'payu'],
        ['Slpe gold travel lite', 'slpe_gold_travel_lite'],
        ['Slpe silver prime edu', 'slpe_silver_prime_edu'],
        ['Razorpay', 'razorpay'],
        ['Payu', 'payu']
      ];
      
      for (let i = 0; i < gatewayData.length; i++) {
        const [name, pg_partner] = gatewayData[i];
        const result = await client.query(
          'INSERT INTO gateways (name, company_id, pg_partner) VALUES ($1, $2, $3) RETURNING id',
          [name, companyId, pg_partner]
        );
        gatewayIds[i + 1] = result.rows[0].id; // Map old index to actual ID
      }

      // Insert rates using actual gateway IDs
      const rates = [
        [gatewayIds[1], 'business', 'others', 'education', 2.7178, 0, 100, 100000],
        [gatewayIds[1], 'consumer', 'others', 'education', 1.9, 0, 100, 100000],
        [gatewayIds[2], 'R', 'others', 'education', 1.6, 0, 100, 50000],
        [gatewayIds[2], 'P', 'others', 'education', 1.6, 0, 100, 50000],
        [gatewayIds[2], 'C', 'others', 'education', 1.6, 0, 100, 50000],
        [gatewayIds[2], 'upi_credit_card', 'others', 'education', 3, 0, 100, 50000],
        [gatewayIds[3], 'business', 'others', 'travel', 1.85, 0, 100, 50000],
        [gatewayIds[3], 'consumer', 'others', 'travel', 1.39, 0, 100, 50000],
        [gatewayIds[4], 'business', 'others', 'education', 1.85, 0, 100, 95000],
        [gatewayIds[4], 'consumer', 'others', 'education', 1.29, 0, 100, 95000],
        [gatewayIds[5], 'business', 'others', 'travel', 1.85, 0, 100, 40000],
        [gatewayIds[5], 'consumer', 'others', 'travel', 1.39, 0, 100, 40000],
        [gatewayIds[6], 'CC', 'others', 'travel', 1.45, 0, 100, 100000],
        [gatewayIds[7], 'upi_credit_card', 'others', 'travel', 3, 0, 100, 50000],
        [gatewayIds[7], 'C', 'others', 'travel', 1.6, 0, 100, 50000],
        [gatewayIds[7], 'P', 'others', 'travel', 1.6, 0, 100, 50000],
        [gatewayIds[7], 'R', 'others', 'travel', 1.6, 0, 100, 50000],
        [gatewayIds[8], 'corporate', 'others', 'education', 1.8, 0, 100, 200000],
        [gatewayIds[8], 'domestic', 'others', 'education', 1.4, 0, 100, 200000],
        [gatewayIds[9], 'Visa', 'others', 'general', 1.2, 0, 100, 95000],
        [gatewayIds[10], 'CC', 'others', 'general', 1.2, 0, 10, 100000],
        [gatewayIds[9], 'business_visa', 'HDFC', 'general', 2.9, 0, 100, 95000],
        [gatewayIds[9], 'Visa', 'HDFC', 'general', 1.4, 0, 100, 95000],
        [gatewayIds[9], 'business_visa', 'others', 'general', 1.5, 0, 100, 95000],
        [gatewayIds[9], 'upi', 'others', 'general', 3, 0, 100, 95000]
      ];
      
      for (const rate of rates) {
        await client.query(
          'INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          rate
        );
      }

      // Insert default settings
      const defaultSettings = {
        categories: JSON.stringify(['education', 'gold', 'travel', 'fastag', 'utility', 'non_utility', 'general']),
        card_types: JSON.stringify(['business', 'consumer', 'R', 'P', 'C', 'CC', 'upi_credit_card', 'business_visa', 'Visa', 'corporate', 'domestic', 'upi']),
        card_issuers: JSON.stringify(['HDFC', 'ICICI', 'SBI', 'AXIS', 'others'])
      };
      
      await client.query(
        'INSERT INTO settings (id, categories, card_types, card_issuers) VALUES (1, $1, $2, $3)',
        [defaultSettings.categories, defaultSettings.card_types, defaultSettings.card_issuers]
      );
      
      console.log('Default SLPE data loaded successfully');
    }
  } finally {
    client.release();
  }
}

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Companies
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO companies (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const result = await pool.query(
      'UPDATE companies SET name = $1, description = $2, status = $3 WHERE id = $4 RETURNING *',
      [name, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    // Delete related data first to avoid foreign key constraint errors
    await pool.query('DELETE FROM rates WHERE gateway_id IN (SELECT id FROM gateways WHERE company_id = $1)', [req.params.id]);
    await pool.query('DELETE FROM gateways WHERE company_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gateways
app.get('/api/gateways', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gateways ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gateways', async (req, res) => {
  try {
    const { name, company_id, pg_partner } = req.body;
    const result = await pool.query(
      'INSERT INTO gateways (name, company_id, pg_partner) VALUES ($1, $2, $3) RETURNING *',
      [name, company_id, pg_partner || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gateways/:id', async (req, res) => {
  try {
    const { name, company_id, pg_partner, status } = req.body;
    const result = await pool.query(
      'UPDATE gateways SET name = $1, company_id = $2, pg_partner = $3, status = $4 WHERE id = $5 RETURNING *',
      [name, company_id, pg_partner, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gateways/:id', async (req, res) => {
  try {
    // Delete related rates first
    await pool.query('DELETE FROM rates WHERE gateway_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM gateways WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Gateway not found' });
    }
    
    res.json({ success: true, message: 'Gateway deleted successfully' });
  } catch (err) {
    console.error('Delete gateway error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rates
app.get('/api/rates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rates');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rates', async (req, res) => {
  try {
    const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
    const result = await pool.query(
      'INSERT INTO rates (gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [gateway_id, card_type, card_issuer, category, commission, surcharge || 0, min_amount, max_amount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rates/:id', async (req, res) => {
  try {
    const { gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount } = req.body;
    const result = await pool.query(
      'UPDATE rates SET gateway_id = $1, card_type = $2, card_issuer = $3, category = $4, commission = $5, surcharge = $6, min_amount = $7, max_amount = $8 WHERE id = $9 RETURNING *',
      [gateway_id, card_type, card_issuer, category, commission, surcharge, min_amount, max_amount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rates/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM rates WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    res.json({ success: true, message: 'Rate deleted successfully' });
  } catch (err) {
    console.error('Delete rate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length > 0) {
      const settings = result.rows[0];
      res.json({
        categories: JSON.parse(settings.categories),
        cardTypes: JSON.parse(settings.card_types),
        cardIssuers: JSON.parse(settings.card_issuers)
      });
    } else {
      res.json({ categories: [], cardTypes: [], cardIssuers: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { categories, cardTypes, cardIssuers } = req.body;
    await pool.query(
      'UPDATE settings SET categories = $1, card_types = $2, card_issuers = $3, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [JSON.stringify(categories), JSON.stringify(cardTypes), JSON.stringify(cardIssuers)]
    );
    res.json({ categories, cardTypes, cardIssuers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Favorites
app.get('/api/favorites', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM favorites ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { name, card_type, card_issuer, amount, category } = req.body;
    const result = await pool.query(
      'INSERT INTO favorites (name, card_type, card_issuer, amount, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, card_type, card_issuer, amount, category || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/favorites/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM favorites WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ success: true, message: 'Favorite deleted successfully' });
  } catch (err) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Render/Railway deployment ready with PostgreSQL!`);
});
