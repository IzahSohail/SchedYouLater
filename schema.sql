-- Table to store user information including timezone
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) NOT NULL 
);

-- Table to store friendships between users
CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  friend_id INT REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, friend_id)  -- Ensures a user can't add the same friend twice
);

-- Table to store schedule events
CREATE TABLE schedule (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL, 
  end_time TIMESTAMP NOT NULL,  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
