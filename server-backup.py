from flask import Flask, jsonify, request, send_from_directory
import os
import pymysql
from pymysql.cursors import DictCursor
app = Flask(__name__)

# ============================================================
# CINEVERSE - LOCAL FLASK + XAMPP/MARIADB SERVER
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",          # XAMPP default local root password
    "database": "cineverse",
    "charset": "utf8mb4",
    "cursorclass": DictCursor,
    "autocommit": True,
}


def get_db():
    return pymysql.connect(**DB_CONFIG)


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def frontend_file(filename):
    return send_from_directory(FRONTEND_DIR, filename)


@app.get("/api/health")
def health():
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION() AS version")
            row = cur.fetchone()
        conn.close()
        return jsonify({
            "status": "ok",
            "database": "cineverse",
            "server_version": row["version"]
        })
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/movies")
def get_movies():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    m.movie_id AS id,
                    m.title,
                    m.release_year AS year,
                    m.rating,
                    m.tag,
                    m.poster_class AS poster,
                    m.icon,
                    m.description,
                    COALESCE(
                        GROUP_CONCAT(g.genre_name ORDER BY g.genre_name SEPARATOR '||'),
                        ''
                    ) AS genre_string
                FROM movies m
                LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
                LEFT JOIN genres g ON g.genre_id = mg.genre_id
                GROUP BY
                    m.movie_id, m.title, m.release_year, m.rating,
                    m.tag, m.poster_class, m.icon, m.description
                ORDER BY m.movie_id;
            """)
            rows = cur.fetchall()

            for movie in rows:
                movie["genre"] = (
                    movie.pop("genre_string").split("||")
                    if movie["genre_string"] else []
                )

            return jsonify(rows)
    finally:
        conn.close()


@app.get("/api/movies/<int:movie_id>")
def get_movie(movie_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    m.movie_id AS id,
                    m.title,
                    m.release_year AS year,
                    m.rating,
                    m.tag,
                    m.poster_class AS poster,
                    m.icon,
                    m.description,
                    COALESCE(
                        GROUP_CONCAT(g.genre_name ORDER BY g.genre_name SEPARATOR '||'),
                        ''
                    ) AS genre_string
                FROM movies m
                LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
                LEFT JOIN genres g ON g.genre_id = mg.genre_id
                WHERE m.movie_id = %s
                GROUP BY
                    m.movie_id, m.title, m.release_year, m.rating,
                    m.tag, m.poster_class, m.icon, m.description;
            """, (movie_id,))
            movie = cur.fetchone()

            if not movie:
                return jsonify({"message": "Movie not found"}), 404

            movie["genre"] = (
                movie.pop("genre_string").split("||")
                if movie["genre_string"] else []
            )
            return jsonify(movie)
    finally:
        conn.close()


@app.post("/api/users")
def create_user():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()

    if not username or not email:
        return jsonify({"message": "Username and email are required"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (username, email)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE username = VALUES(username);
            """, (username, email))

            cur.execute("""
                SELECT user_id, username, email, created_at
                FROM users
                WHERE email = %s;
            """, (email,))
            return jsonify(cur.fetchone()), 201
    finally:
        conn.close()


@app.get("/api/users")
def get_users():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, username, email, created_at
                FROM users
                ORDER BY user_id;
            """)
            return jsonify(cur.fetchall())
    finally:
        conn.close()


@app.get("/api/reviews")
def get_reviews():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    r.review_id,
                    u.username,
                    m.title AS movie,
                    r.rating,
                    r.review_text AS review,
                    r.review_date AS date
                FROM reviews r
                JOIN users u ON u.user_id = r.user_id
                JOIN movies m ON m.movie_id = r.movie_id
                ORDER BY r.review_date DESC, r.review_id DESC;
            """)
            return jsonify(cur.fetchall())
    finally:
        conn.close()


@app.post("/api/reviews")
def create_review():
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    movie = str(data.get("movie", "")).strip()
    review_text = str(data.get("review", "")).strip()

    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify({"message": "Rating must be an integer from 1 to 5"}), 400

    if not username or not email or not movie or not review_text:
        return jsonify({"message": "Username, email, movie and review are required"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"message": "Rating must be between 1 and 5"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (username, email)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE username = VALUES(username);
            """, (username, email))

            cur.execute(
                "SELECT user_id FROM users WHERE email = %s;",
                (email,)
            )
            user_id = cur.fetchone()["user_id"]

            cur.execute(
                "SELECT movie_id FROM movies WHERE title = %s;",
                (movie,)
            )
            movie_row = cur.fetchone()

            if not movie_row:
                return jsonify({"message": "Movie not found"}), 404

            cur.execute("""
                INSERT INTO reviews
                    (user_id, movie_id, rating, review_text)
                VALUES (%s, %s, %s, %s);
            """, (user_id, movie_row["movie_id"], rating, review_text))

            review_id = cur.lastrowid

        return jsonify({"message": "Review saved", "review_id": review_id}), 201
    finally:
        conn.close()


@app.get("/api/watchlist/<int:user_id>")
def get_watchlist(user_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    w.watchlist_id,
                    m.movie_id AS id,
                    m.title,
                    m.rating,
                    w.added_at
                FROM watchlist w
                JOIN movies m ON m.movie_id = w.movie_id
                WHERE w.user_id = %s
                ORDER BY w.added_at DESC;
            """, (user_id,))
            return jsonify(cur.fetchall())
    finally:
        conn.close()


@app.post("/api/watchlist")
def add_watchlist():
    data = request.get_json(silent=True) or {}

    try:
        user_id = int(data.get("user_id"))
        movie_id = int(data.get("movie_id"))
    except (TypeError, ValueError):
        return jsonify({"message": "user_id and movie_id are required"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT IGNORE INTO watchlist (user_id, movie_id)
                VALUES (%s, %s);
            """, (user_id, movie_id))
        return jsonify({"message": "Movie added to watchlist"}), 201
    finally:
        conn.close()


@app.delete("/api/watchlist")
def delete_watchlist():
    data = request.get_json(silent=True) or {}

    try:
        user_id = int(data.get("user_id"))
        movie_id = int(data.get("movie_id"))
    except (TypeError, ValueError):
        return jsonify({"message": "user_id and movie_id are required"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM watchlist
                WHERE user_id = %s AND movie_id = %s;
            """, (user_id, movie_id))
        return jsonify({"message": "Movie removed from watchlist"})
    finally:
        conn.close()


@app.get("/api/recommendations")
def recommendations():
    genre = request.args.get("genre", "").strip()

    if not genre:
        return jsonify([])

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    m.movie_id AS id,
                    m.title,
                    m.release_year AS year,
                    m.rating,
                    m.tag,
                    m.poster_class AS poster,
                    m.icon,
                    m.description
                FROM movies m
                JOIN movie_genres mg ON mg.movie_id = m.movie_id
                JOIN genres g ON g.genre_id = mg.genre_id
                WHERE g.genre_name = %s
                ORDER BY m.rating DESC, m.release_year DESC;
            """, (genre,))
            return jsonify(cur.fetchall())
    finally:
        conn.close()


@app.get("/api/stats")
def stats():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total_movies FROM movies;")
            movies_count = cur.fetchone()["total_movies"]

            cur.execute("SELECT COUNT(*) AS total_reviews FROM reviews;")
            reviews_count = cur.fetchone()["total_reviews"]

            cur.execute("SELECT COUNT(*) AS total_users FROM users;")
            users_count = cur.fetchone()["total_users"]

        return jsonify({
            "total_movies": movies_count,
            "total_reviews": reviews_count,
            "total_users": users_count
        })
    finally:
        conn.close()


if __name__ == "__main__":
    print("==============================================")
    print(" CINEVERSE - LOCAL SERVER")
    print(" http://127.0.0.1:5000")
    print(" Database: XAMPP MariaDB/MySQL")
    print("==============================================")
    app.run(host="127.0.0.1", port=5000, debug=True)
