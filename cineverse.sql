-- ============================================================
-- CINEVERSE - MSBTE K-SCHEME DBMS DATABASE
-- Topic: Movie Reviewing and Recommendation Database
-- XAMPP MariaDB / MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS cineverse
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cineverse;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movies (
    movie_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL UNIQUE,
    release_year YEAR NOT NULL,
    rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    tag VARCHAR(50) NOT NULL,
    poster_class VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT chk_movie_rating CHECK (rating >= 0.0 AND rating <= 5.0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    CONSTRAINT fk_movie_genres_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_movie_genres_genre
        FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating TINYINT NOT NULL,
    review_text TEXT NOT NULL,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reviews_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watchlist (
    watchlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_watchlist_user_movie (user_id, movie_id),
    CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_watchlist_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_year ON movies(release_year);
CREATE INDEX idx_movies_rating ON movies(rating);
CREATE INDEX idx_reviews_movie ON reviews(movie_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);

INSERT IGNORE INTO genres (genre_name) VALUES
('Action'), ('Sci-Fi'), ('Thriller'), ('Adventure'), ('Drama');

INSERT IGNORE INTO movies
(title, release_year, rating, tag, poster_class, icon, description)
VALUES
('INTERSTELLAR', 2014, 4.8, 'MASTERPIECE', 'poster-1', '◉',
 'A group of explorers travel through a wormhole in space in search of a new home for humanity.'),
('INCEPTION', 2010, 4.7, 'TOP RATED', 'poster-2', '◇',
 'A skilled thief who steals information through dreams is given a chance to erase his past.'),
('AVENGERS: ENDGAME', 2019, 4.6, 'POPULAR', 'poster-3', '◆',
 'The Avengers face their biggest challenge as they attempt to restore what was lost.'),
('THE BATMAN', 2022, 4.5, 'DARK MODE', 'poster-4', '▲',
 'Batman investigates a series of crimes that reveal a deeper conspiracy within Gotham.'),
('AVATAR', 2009, 4.4, 'VISUAL EPIC', 'poster-5', '✦',
 'A marine joins an expedition to an alien world and becomes caught between two civilizations.'),
('DUNE', 2021, 4.6, 'EPIC', 'poster-6', '△',
 'A young nobleman must travel to a dangerous desert planet and embrace a destiny greater than himself.');

INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT m.movie_id, g.genre_id
FROM movies m
JOIN genres g
WHERE
    (m.title = 'INTERSTELLAR' AND g.genre_name IN ('Sci-Fi', 'Adventure'))
 OR (m.title = 'INCEPTION' AND g.genre_name IN ('Sci-Fi', 'Thriller'))
 OR (m.title = 'AVENGERS: ENDGAME' AND g.genre_name IN ('Action', 'Adventure'))
 OR (m.title = 'THE BATMAN' AND g.genre_name IN ('Action', 'Thriller'))
 OR (m.title = 'AVATAR' AND g.genre_name IN ('Action', 'Adventure'))
 OR (m.title = 'DUNE' AND g.genre_name IN ('Sci-Fi', 'Adventure', 'Drama'));

INSERT IGNORE INTO users (username, email) VALUES
('ARJUN', 'arjun@cineverse.local'),
('ROHAN', 'rohan@cineverse.local'),
('SAHIL', 'sahil@cineverse.local');

INSERT INTO reviews (user_id, movie_id, rating, review_text)
SELECT u.user_id, m.movie_id, 5,
       'One of the best cinematic experiences. The visuals and story are incredible.'
FROM users u JOIN movies m
WHERE u.username='ARJUN' AND m.title='INTERSTELLAR'
  AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.user_id=u.user_id AND r.movie_id=m.movie_id
  );

INSERT INTO reviews (user_id, movie_id, rating, review_text)
SELECT u.user_id, m.movie_id, 4,
       'Amazing concept and incredible visuals. Definitely worth watching.'
FROM users u JOIN movies m
WHERE u.username='ROHAN' AND m.title='DUNE'
  AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.user_id=u.user_id AND r.movie_id=m.movie_id
  );

INSERT INTO reviews (user_id, movie_id, rating, review_text)
SELECT u.user_id, m.movie_id, 5,
       'The perfect combination of action, characters and storytelling.'
FROM users u JOIN movies m
WHERE u.username='SAHIL' AND m.title='AVENGERS: ENDGAME'
  AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.user_id=u.user_id AND r.movie_id=m.movie_id
  );

-- MSBTE demo queries
SHOW TABLES;

SELECT * FROM users;
SELECT * FROM movies;
SELECT * FROM genres;
SELECT * FROM movie_genres;
SELECT * FROM reviews;
SELECT * FROM watchlist;

SELECT
    u.username, m.title, r.rating, r.review_text, r.review_date
FROM reviews r
JOIN users u ON u.user_id=r.user_id
JOIN movies m ON m.movie_id=r.movie_id
ORDER BY r.review_date DESC;

SELECT
    m.title, m.rating, g.genre_name
FROM movies m
JOIN movie_genres mg ON mg.movie_id=m.movie_id
JOIN genres g ON g.genre_id=mg.genre_id
WHERE g.genre_name='Sci-Fi'
ORDER BY m.rating DESC;

SELECT
    m.title,
    ROUND(AVG(r.rating),2) AS average_review_rating,
    COUNT(r.review_id) AS total_reviews
FROM movies m
LEFT JOIN reviews r ON r.movie_id=m.movie_id
GROUP BY m.movie_id, m.title
ORDER BY average_review_rating DESC;
