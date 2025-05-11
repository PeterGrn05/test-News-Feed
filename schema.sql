CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LiveStreams (
    id SERIAL PRIMARY KEY,
    stream_url VARCHAR(255) NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    stream_title VARCHAR(100) NOT NULL
);

CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE News (
    news_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES Categories(category_id),
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    source_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Subscriptions (
  subscription_id SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES Users(user_id),
  category_id   INT NOT NULL REFERENCES Categories(category_id),
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id)
);