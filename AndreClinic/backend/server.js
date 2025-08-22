const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// allow frontend to talk to API
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5500',
  credentials: true
}));

// health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// attach routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/users'));

// start server
const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`✅ API listening on http://localhost:${port}`);
});
