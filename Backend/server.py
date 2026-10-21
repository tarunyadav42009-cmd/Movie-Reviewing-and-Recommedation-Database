from flask import Flask, jsonify, request, send_from_directory
import logging
import os

import pymysql
from pymysql.cursors import DictCursor


app = Flask(__name__)


# ============================================================
# CINEVERSE
# Flask API + Aiven MySQL
# Designed for Render deployment
#
# RENDER ENVIRONMENT VARIABLES:
#
# MYSQL_HOST
# MYSQL_PORT
# MYSQL_USER
# MYSQL_PASSWORD
# MYSQL_DATABASE
# MYSQL_SSL_MODE
# MYSQL_SSL_CA              optional
#
# LOCAL DEVELOPMENT:
# If MYSQL_* variables are not set locally, the application
# falls back to XAMPP:
#
# 127.0.0.1 : 3306
# root
# empty password
# cineverse
# ============================================================


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("cineverse")


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

def get_db_config():
    """
    Build the database configuration.

    On Render:
        Aiven credentials MUST be supplied through
        environment variables.

    Locally:
        Falls back to XAMPP/MariaDB defaults.
    """

    running_on_render = (
        os.getenv("RENDER", "").lower() == "true"
    )

    host = os.getenv("MYSQL_HOST")
    port = os.getenv("MYSQL_PORT")
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    database = os.getenv(
        "MYSQL_DATABASE",
        "cineverse"
    )

    # --------------------------------------------------------
    # LOCAL DEVELOPMENT FALLBACK
    # --------------------------------------------------------

    if not running_on_render:

        host = host or "127.0.0.1"
        port = port or "3306"
        user = user or "root"

        if password is None:
            password = ""

    # --------------------------------------------------------
    # RENDER / PRODUCTION
    # --------------------------------------------------------

    else:

        missing = [
            name
            for name, value in {
                "MYSQL_HOST": host,
                "MYSQL_PORT": port,
                "MYSQL_USER": user,
                "MYSQL_PASSWORD": password,
            }.items()
            if value in (None, "")
        ]

        if missing:
            raise RuntimeError(
                "Missing required Render environment "
                "variables: "
                + ", ".join(missing)
            )

    # --------------------------------------------------------
    # BASE DATABASE CONFIGURATION
    # --------------------------------------------------------

    config = {
        "host": host,
        "port": int(port or 3306),
        "user": user,
        "password": password or "",
        "database": database,
        "charset": "utf8mb4",
        "cursorclass": DictCursor,

        # We explicitly commit/rollback transactions.
        "autocommit": False,

        # Connection reliability.
        "connect_timeout": 10,
        "read_timeout": 20,
        "write_timeout": 20,
    }

    # --------------------------------------------------------
    # AIVEN TLS / SSL
    #
    # MYSQL_SSL_MODE:
    # REQUIRED
    # VERIFY_CA
    # VERIFY_IDENTITY
    #
    # MYSQL_SSL_CA:
    # Optional path to the Aiven CA certificate.
    # --------------------------------------------------------

    ssl_mode = os.getenv(
        "MYSQL_SSL_MODE",
        ""
    ).strip().upper()

    ssl_ca = os.getenv(
        "MYSQL_SSL_CA",
        ""
    ).strip()

    if ssl_mode in {
        "REQUIRED",
        "VERIFY_CA",
        "VERIFY_IDENTITY",
    } or ssl_ca:

        ssl_config = {}

        if ssl_ca:
            ssl_config["ca"] = ssl_ca

        config["ssl"] = ssl_config

    return config


def get_db():
    """
    Create a new database connection.
    """

    return pymysql.connect(
        **get_db_config()
    )


def close_db(conn):
    """
    Safely close a database connection.
    """

    if conn is not None:

        try:
            conn.close()

        except Exception:
            pass


# ============================================================
# FRONTEND
#
# The project currently keeps:
#
# index.html
# style.css
# script.js
#
# in the SAME folder as server.py.
# ============================================================

@app.get("/")
def index():

    return send_from_directory(
        BASE_DIR,
        "index.html"
    )


@app.get("/style.css")
def stylesheet():

    return send_from_directory(
        BASE_DIR,
        "style.css"
    )


@app.get("/script.js")
def javascript():

    return send_from_directory(
        BASE_DIR,
        "script.js"
    )


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            cur.execute(
                "SELECT VERSION() AS version"
            )

            version_row = cur.fetchone()

            cur.execute(
                "SELECT DATABASE() AS database_name"
            )

            database_row = cur.fetchone()

        conn.commit()

        return jsonify({
            "status": "ok",
            "database": database_row[
                "database_name"
            ],
            "server_version": version_row[
                "version"
            ],
        })

    except Exception:

        logger.exception(
            "Database health check failed"
        )

        return jsonify({
            "status": "error",
            "message": "Database connection failed"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# MOVIES
# ============================================================

@app.get("/api/movies")
def get_movies():

    conn = None

    try:

        conn = get_db()

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
                        GROUP_CONCAT(
                            DISTINCT g.genre_name
                            ORDER BY g.genre_name
                            SEPARATOR '||'
                        ),
                        ''
                    ) AS genre_string

                FROM movies m

                LEFT JOIN movie_genres mg
                    ON mg.movie_id = m.movie_id

                LEFT JOIN genres g
                    ON g.genre_id = mg.genre_id

                GROUP BY
                    m.movie_id,
                    m.title,
                    m.release_year,
                    m.rating,
                    m.tag,
                    m.poster_class,
                    m.icon,
                    m.description

                ORDER BY
                    m.movie_id ASC;
            """)

            rows = cur.fetchall()

        conn.commit()

        for movie in rows:

            genre_string = movie.pop(
                "genre_string",
                ""
            )

            movie["genre"] = (
                genre_string.split("||")
                if genre_string
                else []
            )

        return jsonify(rows)

    except Exception:

        logger.exception(
            "Failed to load movies"
        )

        return jsonify({
            "message": "Unable to load movies"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# SINGLE MOVIE
# ============================================================

@app.get("/api/movies/<int:movie_id>")
def get_movie(movie_id):

    conn = None

    try:

        conn = get_db()

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
                        GROUP_CONCAT(
                            DISTINCT g.genre_name
                            ORDER BY g.genre_name
                            SEPARATOR '||'
                        ),
                        ''
                    ) AS genre_string

                FROM movies m

                LEFT JOIN movie_genres mg
                    ON mg.movie_id = m.movie_id

                LEFT JOIN genres g
                    ON g.genre_id = mg.genre_id

                WHERE m.movie_id = %s

                GROUP BY
                    m.movie_id,
                    m.title,
                    m.release_year,
                    m.rating,
                    m.tag,
                    m.poster_class,
                    m.icon,
                    m.description;
            """, (movie_id,))

            movie = cur.fetchone()

        conn.commit()

        if not movie:

            return jsonify({
                "message": "Movie not found"
            }), 404

        genre_string = movie.pop(
            "genre_string",
            ""
        )

        movie["genre"] = (
            genre_string.split("||")
            if genre_string
            else []
        )

        return jsonify(movie)

    except Exception:

        logger.exception(
            "Failed to load movie %s",
            movie_id
        )

        return jsonify({
            "message": "Unable to load movie"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# USERS / LOGIN
#
# IMPORTANT:
# The CURRENT frontend uses:
#
# username + email
#
# This is profile-based login, not password authentication.
# ============================================================

def find_or_create_user(
    cur,
    username,
    email
):
    """
    Find a user by email.

    If the user exists:
        update username

    If the user does not exist:
        create the user

    Returns:
        user record
    """

    cur.execute("""
        SELECT
            user_id,
            username,
            email,
            created_at

        FROM users

        WHERE email = %s

        LIMIT 1;
    """, (email,))

    user = cur.fetchone()

    # --------------------------------------------------------
    # EXISTING USER
    # --------------------------------------------------------

    if user:

        cur.execute("""
            UPDATE users

            SET username = %s

            WHERE user_id = %s;
        """, (
            username,
            user["user_id"]
        ))

        cur.execute("""
            SELECT
                user_id,
                username,
                email,
                created_at

            FROM users

            WHERE user_id = %s;
        """, (
            user["user_id"],
        ))

        return cur.fetchone()

    # --------------------------------------------------------
    # NEW USER
    # --------------------------------------------------------

    cur.execute("""
        INSERT INTO users
            (
                username,
                email
            )

        VALUES
            (
                %s,
                %s
            );
    """, (
        username,
        email
    ))

    user_id = cur.lastrowid

    cur.execute("""
        SELECT
            user_id,
            username,
            email,
            created_at

        FROM users

        WHERE user_id = %s;
    """, (
        user_id,
    ))

    return cur.fetchone()


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/login")
def login():

    data = request.get_json(
        silent=True
    ) or {}

    username = str(
        data.get("username", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not username or not email:

        return jsonify({
            "message":
                "Username and email are required"
        }), 400

    if len(username) > 100:

        return jsonify({
            "message":
                "Username is too long"
        }), 400

    if len(email) > 255:

        return jsonify({
            "message":
                "Email is too long"
        }), 400

    if "@" not in email:

        return jsonify({
            "message":
                "Enter a valid email address"
        }), 400

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            user = find_or_create_user(
                cur,
                username,
                email
            )

        conn.commit()

        return jsonify(user), 200

    except Exception:

        if conn:
            conn.rollback()

        logger.exception(
            "Login failed"
        )

        return jsonify({
            "message": "Unable to login"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# USERS API
# ============================================================

@app.post("/api/users")
def create_user():

    return login()


@app.get("/api/users")
def get_users():

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    user_id,
                    username,
                    email,
                    created_at

                FROM users

                ORDER BY
                    user_id ASC;
            """)

            users = cur.fetchall()

        conn.commit()

        return jsonify(users)

    except Exception:

        logger.exception(
            "Failed to load users"
        )

        return jsonify({
            "message": "Unable to load users"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# REVIEWS - GET
# ============================================================

@app.get("/api/reviews")
def get_reviews():

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    r.review_id,
                    u.user_id,
                    u.username,

                    m.movie_id,
                    m.title AS movie,

                    r.rating,
                    r.review_text AS review,
                    r.review_date AS date

                FROM reviews r

                JOIN users u
                    ON u.user_id = r.user_id

                JOIN movies m
                    ON m.movie_id = r.movie_id

                ORDER BY
                    r.review_date DESC,
                    r.review_id DESC;
            """)

            reviews = cur.fetchall()

        conn.commit()

        return jsonify(reviews)

    except Exception:

        logger.exception(
            "Failed to load reviews"
        )

        return jsonify({
            "message":
                "Unable to load reviews"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# REVIEWS - CREATE
# ============================================================

@app.post("/api/reviews")
def create_review():

    data = request.get_json(
        silent=True
    ) or {}

    username = str(
        data.get("username", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    movie = str(
        data.get("movie", "")
    ).strip()

    review_text = str(
        data.get("review", "")
    ).strip()

    # --------------------------------------------------------
    # RATING
    # --------------------------------------------------------

    try:

        rating = int(
            data.get("rating")
        )

    except (TypeError, ValueError):

        return jsonify({
            "message":
                "Rating must be an integer from 1 to 5"
        }), 400

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if (
        not username
        or not email
        or not movie
        or not review_text
    ):

        return jsonify({
            "message":
                "Username, email, movie and review are required"
        }), 400

    if rating < 1 or rating > 5:

        return jsonify({
            "message":
                "Rating must be between 1 and 5"
        }), 400

    if len(review_text) > 500:

        return jsonify({
            "message":
                "Review must be 500 characters or less"
        }), 400

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            # ------------------------------------------------
            # USER
            # ------------------------------------------------

            user = find_or_create_user(
                cur,
                username,
                email
            )

            # ------------------------------------------------
            # MOVIE
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    movie_id

                FROM movies

                WHERE title = %s

                LIMIT 1;
            """, (
                movie,
            ))

            movie_row = cur.fetchone()

            if not movie_row:

                conn.rollback()

                return jsonify({
                    "message":
                        "Movie not found"
                }), 404

            # ------------------------------------------------
            # INSERT REVIEW
            # ------------------------------------------------

            cur.execute("""
                INSERT INTO reviews
                    (
                        user_id,
                        movie_id,
                        rating,
                        review_text
                    )

                VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s
                    );
            """, (
                user["user_id"],
                movie_row["movie_id"],
                rating,
                review_text
            ))

            review_id = cur.lastrowid

        conn.commit()

        return jsonify({
            "message":
                "Review saved",

            "review_id":
                review_id
        }), 201

    except Exception:

        if conn:
            conn.rollback()

        logger.exception(
            "Failed to create review"
        )

        return jsonify({
            "message":
                "Unable to save review"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# WATCHLIST - GET
# ============================================================

@app.get("/api/watchlist/<int:user_id>")
def get_watchlist(user_id):

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    w.watchlist_id,

                    m.movie_id AS id,
                    m.title,
                    m.release_year AS year,
                    m.rating,
                    m.tag,
                    m.poster_class AS poster,
                    m.icon,
                    m.description,

                    w.added_at

                FROM watchlist w

                JOIN movies m
                    ON m.movie_id = w.movie_id

                WHERE w.user_id = %s

                ORDER BY
                    w.added_at DESC;
            """, (
                user_id,
            ))

            rows = cur.fetchall()

        conn.commit()

        return jsonify(rows)

    except Exception:

        logger.exception(
            "Failed to load watchlist for user %s",
            user_id
        )

        return jsonify({
            "message":
                "Unable to load watchlist"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# WATCHLIST - ADD
# ============================================================

@app.post("/api/watchlist")
def add_watchlist():

    data = request.get_json(
        silent=True
    ) or {}

    try:

        user_id = int(
            data.get("user_id")
        )

        movie_id = int(
            data.get("movie_id")
        )

    except (TypeError, ValueError):

        return jsonify({
            "message":
                "user_id and movie_id are required"
        }), 400

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            # ------------------------------------------------
            # CHECK USER
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    user_id

                FROM users

                WHERE user_id = %s

                LIMIT 1;
            """, (
                user_id,
            ))

            if not cur.fetchone():

                conn.rollback()

                return jsonify({
                    "message":
                        "User not found"
                }), 404

            # ------------------------------------------------
            # CHECK MOVIE
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    movie_id

                FROM movies

                WHERE movie_id = %s

                LIMIT 1;
            """, (
                movie_id,
            ))

            if not cur.fetchone():

                conn.rollback()

                return jsonify({
                    "message":
                        "Movie not found"
                }), 404

            # ------------------------------------------------
            # CHECK DUPLICATE
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    watchlist_id

                FROM watchlist

                WHERE user_id = %s
                  AND movie_id = %s

                LIMIT 1;
            """, (
                user_id,
                movie_id
            ))

            existing = cur.fetchone()

            if existing:

                conn.commit()

                return jsonify({
                    "message":
                        "Movie already in watchlist",

                    "watchlist_id":
                        existing["watchlist_id"]
                }), 200

            # ------------------------------------------------
            # INSERT
            # ------------------------------------------------

            cur.execute("""
                INSERT INTO watchlist
                    (
                        user_id,
                        movie_id
                    )

                VALUES
                    (
                        %s,
                        %s
                    );
            """, (
                user_id,
                movie_id
            ))

            watchlist_id = cur.lastrowid

        conn.commit()

        return jsonify({
            "message":
                "Movie added to watchlist",

            "watchlist_id":
                watchlist_id
        }), 201

    except Exception:

        if conn:
            conn.rollback()

        logger.exception(
            "Failed to add watchlist item"
        )

        return jsonify({
            "message":
                "Unable to add movie to watchlist"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# WATCHLIST - DELETE
# ============================================================

@app.delete("/api/watchlist")
def delete_watchlist():

    data = request.get_json(
        silent=True
    ) or {}

    try:

        user_id = int(
            data.get("user_id")
        )

        movie_id = int(
            data.get("movie_id")
        )

    except (TypeError, ValueError):

        return jsonify({
            "message":
                "user_id and movie_id are required"
        }), 400

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            cur.execute("""
                DELETE FROM watchlist

                WHERE user_id = %s
                  AND movie_id = %s;
            """, (
                user_id,
                movie_id
            ))

            deleted = cur.rowcount

        conn.commit()

        return jsonify({
            "message": (
                "Movie removed from watchlist"
                if deleted
                else "Movie was not in watchlist"
            ),

            "deleted":
                deleted > 0
        }), 200

    except Exception:

        if conn:
            conn.rollback()

        logger.exception(
            "Failed to remove watchlist item"
        )

        return jsonify({
            "message":
                "Unable to remove movie from watchlist"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# RECOMMENDATIONS
# ============================================================

@app.get("/api/recommendations")
def recommendations():

    genre = request.args.get(
        "genre",
        ""
    ).strip()

    if not genre:

        return jsonify([])

    conn = None

    try:

        conn = get_db()

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
                        GROUP_CONCAT(
                            DISTINCT g2.genre_name
                            ORDER BY g2.genre_name
                            SEPARATOR '||'
                        ),
                        ''
                    ) AS genre_string

                FROM movies m

                JOIN movie_genres mg
                    ON mg.movie_id = m.movie_id

                JOIN genres g
                    ON g.genre_id = mg.genre_id

                LEFT JOIN movie_genres mg2
                    ON mg2.movie_id = m.movie_id

                LEFT JOIN genres g2
                    ON g2.genre_id = mg2.genre_id

                WHERE g.genre_name = %s

                GROUP BY
                    m.movie_id,
                    m.title,
                    m.release_year,
                    m.rating,
                    m.tag,
                    m.poster_class,
                    m.icon,
                    m.description

                ORDER BY
                    m.rating DESC,
                    m.release_year DESC;
            """, (
                genre,
            ))

            rows = cur.fetchall()

        conn.commit()

        for movie in rows:

            genre_string = movie.pop(
                "genre_string",
                ""
            )

            movie["genre"] = (
                genre_string.split("||")
                if genre_string
                else []
            )

        return jsonify(rows)

    except Exception:

        logger.exception(
            "Failed to load recommendations "
            "for genre %s",
            genre
        )

        return jsonify({
            "message":
                "Unable to load recommendations"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# DATABASE STATISTICS
# ============================================================

@app.get("/api/stats")
def stats():

    conn = None

    try:

        conn = get_db()

        with conn.cursor() as cur:

            # ------------------------------------------------
            # MOVIES
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    COUNT(*) AS total_movies

                FROM movies;
            """)

            movies_count = cur.fetchone()[
                "total_movies"
            ]

            # ------------------------------------------------
            # REVIEWS
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    COUNT(*) AS total_reviews

                FROM reviews;
            """)

            reviews_count = cur.fetchone()[
                "total_reviews"
            ]

            # ------------------------------------------------
            # USERS
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    COUNT(*) AS total_users

                FROM users;
            """)

            users_count = cur.fetchone()[
                "total_users"
            ]

            # ------------------------------------------------
            # WATCHLIST
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    COUNT(*) AS total_watchlist_items

                FROM watchlist;
            """)

            watchlist_count = cur.fetchone()[
                "total_watchlist_items"
            ]

        conn.commit()

        return jsonify({
            "total_movies":
                movies_count,

            "total_reviews":
                reviews_count,

            "total_users":
                users_count,

            "total_watchlist_items":
                watchlist_count
        })

    except Exception:

        logger.exception(
            "Failed to load database statistics"
        )

        return jsonify({
            "message":
                "Unable to load database statistics"
        }), 500

    finally:

        close_db(conn)


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "message":
                "API endpoint not found"
        }), 404

    return jsonify({
        "message":
            "Page not found"
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "message":
                "HTTP method not allowed"
        }), 405

    return jsonify({
        "message":
            "Method not allowed"
    }), 405


@app.errorhandler(500)
def internal_server_error(error):

    logger.exception(
        "Unhandled server error"
    )

    return jsonify({
        "message":
            "Internal server error"
    }), 500


# ============================================================
# LOCAL DEVELOPMENT
#
# On Render:
#   gunicorn server:app
#
# Locally:
#   python server.py
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            "5000"
        )
    )

    print("==============================================")
    print(" CINEVERSE - FLASK SERVER")
    print(
        f" http://127.0.0.1:{port}"
    )
    print(" Database: Aiven MySQL / XAMPP")
    print("==============================================")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )