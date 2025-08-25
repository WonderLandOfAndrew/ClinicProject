const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// app.use(cors());

// --- CORS allowlist for dev hosts ---
// Use the existing env if you already added it
// FRONTEND_ORIGIN=http://localhost:5500,http://127.0.0.1:5500

const allowed = new Set(
  (process.env.FRONTEND_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

// Build per-request CORS options so Access-Control-Allow-Origin matches exactly
const corsOptionsDelegate = function (req, cb) {
  const origin = req.header('Origin');
  const isAllowed = origin && allowed.has(origin);
  cb(null, {
    origin: isAllowed,                 // exact echo (not "*")
    credentials: true,                 // allow cookies
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  });
};

// MUST come before routes:
app.use(cors(corsOptionsDelegate));
// Explicitly handle preflight (OPTIONS) globally and for login route:
// (cors() will add the headers to OPTIONS responses)
app.options(/.*/, cors(corsOptionsDelegate));
app.options('/api/login', cors(corsOptionsDelegate));

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../')));

app.post('/api/register', async (req, res) => {
  const { username, email, password, first_name, last_name, role } = req.body;

  // Basic validation
  if (!username || !email || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ message: 'All fields are required: username, email, password, first_name, last_name, role.' });
  }
  if (!['Patient','Doctor'].includes(role)) {
    return res.status(400).json({ message: "role must be 'Patient' or 'Doctor'." });
  }

  let conn;
  try {
    // check duplicates first (no transaction needed yet)
    const dup = await db.query(
      'SELECT * FROM UserAccount WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (dup.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Start transaction
    conn = await require('mariadb').createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    await conn.beginTransaction();

    // 1) Create person in the appropriate table
    let linkedId;
    if (role === 'Patient') {
      const r1 = await conn.query(
        `INSERT INTO Patient (first_name, last_name, date_of_birth, gender, phone, email, address)
         VALUES (?, ?, NULL, 'Other', NULL, ?, NULL)`,
        [first_name, last_name, email]
      );
      linkedId = r1.insertId;
    } else if (role === 'Doctor') {
      const r2 = await conn.query(
        `INSERT INTO Doctor (first_name, last_name, specialization, phone, email)
         VALUES (?, ?, 'General Medicine', NULL, ?)`,
        [first_name, last_name, email]
      );
      linkedId = r2.insertId;
    }

    // 2) Create the user account linked to that id
    await conn.query(
      `INSERT INTO UserAccount (username, email, password_hash, role, linked_id)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, hash, role, linkedId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Registration successful.', role, linked_id: linkedId });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error('Registration error:', err);
    // Duplicate email in Patient/Doctor might throw ER_DUP_ENTRY
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already used.' });
    }
    res.status(500).json({ message: 'Server error.' });
  } finally {
    if (conn) { try { await conn.end(); } catch (_) {} }
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

  try {
    const rows = await db.query(
      'SELECT user_id, username, email, password_hash, role, linked_id FROM UserAccount WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

    // res.json({
    //   message: 'Login successful.',
    //   user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role, linked_id: user.linked_id }
    // });

    // --- NEW: sign JWT and set HTTP-only cookie
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, linked_id: user.linked_id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false, //isProd,              // true only behind HTTPS in prod
      sameSite: 'lax', //isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000       // 15 min
    });
    res.json({
      message: 'Login successful.',
      user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role, linked_id: user.linked_id }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// NEW: who am I
app.get('/api/me', (req, res) => {
  const token = req.cookies?.access_token;
  if (!token) return res.json({ authenticated: false });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, user: payload });
  } catch {
    res.json({ authenticated: false });
  }
});

// NEW: logout
app.post('/api/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 0
  });
  res.json({ message: 'Logged out' });
});


// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: 'Email and password required.' });
//   }
//   try {
//     // Remove destructuring, use rows directly
//     const rows = await db.query('SELECT * FROM UserAccount WHERE email = ?', [email]);

//     const user = Array.isArray(rows) ? rows[0] : (rows.rows ? rows.rows[0] : undefined);

//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }
//     console.log('User found:', user);
//     console.log('Passhash: ', user.PasswordHash);

//     const match = await bcrypt.compare(password, user.PasswordHash);

//     console.log(match);

//     if (!match) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }
//     res.json({ message: 'Login successful.' });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

// Fallback to index.html for SPA routes (optional)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
