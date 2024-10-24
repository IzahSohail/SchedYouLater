const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config(); // Load .env variables

// Initialize the Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Connection Pool using .env variables
const pool = new Pool({
  user: process.env.DB_USER,          // Loaded from .env
  host: process.env.DB_HOST,          // Loaded from .env
  database: process.env.DB_NAME,      // Loaded from .env
  password: process.env.DB_PASSWORD,  // Loaded from .env
  port: process.env.DB_PORT,          // Loaded from .env
});


// -------------------- API Routes --------------------

// Register new user
app.post('/register', async (req, res) => {
  const { username, password, timezone } = req.body;

  try {
    // Check if the username already exists
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Insert new user into database
    const newUser = await pool.query(
      'INSERT INTO users (username, password, timezone) VALUES ($1, $2, $3) RETURNING *',
      [username, password, timezone]
    );

    return res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists with given credentials
    const user = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [
      username,
      password,
    ]);

    if (user.rows.length > 0) {
      return res.status(200).json(user.rows[0]);
    } else {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Backend route to fetch user by id
app.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const user = await pool.query('SELECT timezone FROM users WHERE id = $1', [id]);
      if (user.rows.length > 0) {
        res.json(user.rows[0]);  // Return the user's timezone
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

// Add friend
app.post('/add-friend', async (req, res) => {
    const { userId, friendUsername } = req.body;
  
    try {
      // Find the friend by username
      const friend = await pool.query('SELECT * FROM users WHERE username = $1', [friendUsername]);
  
      if (friend.rows.length > 0) {
        const friendId = friend.rows[0].id;
  
        // Check if the friendship already exists (either direction)
        const friendshipExists = await pool.query(
          'SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
          [userId, friendId]
        );
  
        if (friendshipExists.rows.length > 0) {
          return res.status(400).json({ message: 'You are already friends' });
        }
  
        // Insert the friendship in both directions
        await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)', [userId, friendId]);
  
        return res.status(200).json({ message: 'Friend added successfully' });
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

// Get user's friends
app.get('/friends/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const friends = await pool.query(
      `SELECT u.id, u.username 
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1`,
      [userId]
    );

    return res.status(200).json(friends.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add an event to a user's schedule
app.post('/add-event', async (req, res) => {
  const { userId, title, startTime, endTime } = req.body;

  try {
    const newEvent = await pool.query(
      'INSERT INTO schedule (user_id, title, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, startTime, endTime]
    );

    return res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get user's schedule
app.get('/schedule/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const schedule = await pool.query('SELECT * FROM schedule WHERE user_id = $1 ORDER BY start_time', [
      userId,
    ]);

    return res.status(200).json(schedule.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
