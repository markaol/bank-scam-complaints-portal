# USA Bank Scam Complaint Portal

This project is a production-style Node.js app for managing USA bank scam complaints with:

- agent login
- automatic case ID generation
- complaint submission
- assignment to an investigation agent
- status tracking and updates
- search, filter, and CSV export
- deploy-ready backend configuration

## Run locally

1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open:
   http://localhost:3000

Login credentials:
- Emma Johnson / bank123
- Daniel Moore / bank123
- Sophia Patel / bank123
- Marcus Green / bank123
- Olivia Davis / bank123

## Deploy to Render

This project includes `render.yaml` for easy deployment to Render.

1. Push the repo to GitHub.
2. Import the repo into Render.
3. Render should detect the config automatically.
4. Your app is then live on the Render URL.

## Files

- `server.js` – Express backend and API routes
- `data/users.json` – agent credentials
- `data/complaints.json` – complaint records
- `public/index.html` – frontend layout
- `public/styles.css` – styling
- `public/script.js` – frontend logic
- `render.yaml` – Render deployment config
