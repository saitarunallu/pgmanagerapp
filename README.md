# PG Commission Manager

Full-stack Payment Gateway Commission Management System with server-side persistence.

## Features
- ✅ Server-side SQLite database
- ✅ RESTful API for all operations
- ✅ Real-time commission calculations
- ✅ Company, Gateway, and Rate management
- ✅ Settings and Favorites system
- ✅ Responsive design for mobile/tablet/desktop
- ✅ Pre-loaded with SLPE data

## Quick Deploy to Railway

### 1. Push to GitHub
```bash
git add .
git commit -m "Add PG Commission Manager"
git push origin main
```

### 2. Deploy on Railway
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway auto-deploys (2-3 minutes)
6. Click "Generate Domain" to get your public URL

✅ Done! Your app is live with persistent database.

## Local Development

```bash
npm install
npm start
```

Access at: http://localhost:3000

## Deploy to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Deploy

## API Endpoints

**Companies**
- GET `/api/companies` - Get all companies
- POST `/api/companies` - Create company
- PUT `/api/companies/:id` - Update company
- DELETE `/api/companies/:id` - Delete company

**Gateways**
- GET `/api/gateways` - Get all gateways
- POST `/api/gateways` - Create gateway
- PUT `/api/gateways/:id` - Update gateway
- DELETE `/api/gateways/:id` - Delete gateway

**Rates**
- GET `/api/rates` - Get all rates
- POST `/api/rates` - Create rate
- PUT `/api/rates/:id` - Update rate
- DELETE `/api/rates/:id` - Delete rate

**Settings**
- GET `/api/settings` - Get settings
- PUT `/api/settings` - Update settings

**Favorites**
- GET `/api/favorites` - Get all favorites
- POST `/api/favorites` - Create favorite
- DELETE `/api/favorites/:id` - Delete favorite

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Hosting**: Railway or Render

## File Structure
```
pg-commission-manager/
├── public/
│   └── index.html       # Frontend app
├── server.js            # Backend API
├── package.json         # Dependencies
├── .gitignore          # Git ignore
└── README.md           # This file
```

## Support
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

## License
MIT