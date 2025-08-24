const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

app.post('/api/register', async (req, res) => {
  const { username, email, password, first_name, last_name, role } = req.body;

  // const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ message: 'All fields are required: username, email, password, first_name, last_name, role.' });
  }
  if (!['Patient','Doctor'].includes(role)) {
    return res.status(400).json({ message: "role must be 'Patient' or 'Doctor'." });
  }

  // if (!username || !email || !password) {
  //   return res.status(400).json({ message: 'All fields are required.' });
  // }
  // try {
  //   // Debug: log what db.query returns
  //   const result = await db.query('SELECT * FROM UserAccount WHERE username = ? OR email = ?', [username, email]);
  //   console.log('db.query result:', result);
  //   const rows = Array.isArray(result) ? result[0] : result;
  //   if (rows && rows.length > 0) {
  //     return res.status(409).json({ message: 'Username or email already exists.' });
  //   }
  //   const hash = await bcrypt.hash(password, 10);
  //   await db.query('INSERT INTO UserAccount (username, email, passwordhash) VALUES (?, ?, ?)', [username, email, hash]);
  //   res.status(201).json({ message: 'Registration successful.' });
  // } catch (err) {
  //   console.error('Registration error:', err);
  //   res.status(500).json({ message: 'Server error.' });
  // }

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

    res.json({
      message: 'Login successful.',
      user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role, linked_id: user.linked_id }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
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
