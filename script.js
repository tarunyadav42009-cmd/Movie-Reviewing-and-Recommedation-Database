/* =====================================================
   CINEVERSE - DATABASE CONNECTED APPLICATION
   Flask + PyMySQL + XAMPP MariaDB
   ===================================================== */

let movies = [];
let currentMovies = [];
let watchlist = [];
let selectedMovie = null;
let currentUser = null;

const API_BASE = "/api";


/* =====================================================
   INITIALIZE APPLICATION
   ===================================================== */

document.addEventListener("DOMContentLoaded", async function () {

    setupFilters();
    setupSearch();
    restoreUserSession();

    await loadMovies();
    await loadStats();
    await loadReviews();

    if (currentUser) {
        await loadWatchlist();
    } else {
        renderWatchlist();
    }

    updateAccountUI();

});


/* =====================================================
   API HELPER
   ===================================================== */

async function api(url, options = {}) {

    const response = await fetch(
        API_BASE + url,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch (_) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


/* =====================================================
   MOVIES
   ===================================================== */

async function loadMovies() {

    const status =
        document.getElementById("systemStatusText");

    const apiStatus =
        document.getElementById("heroApiStatus");

    const dbStatus =
        document.getElementById("recommendationDbStatus");


    try {

        movies = await api("/movies");

        currentMovies = [...movies];

        renderMovies(currentMovies);

        status.textContent =
            "DATABASE SYSTEM ONLINE";

        apiStatus.textContent =
            "● ONLINE";

        dbStatus.textContent =
            "● DATABASE CONNECTED";

    } catch (error) {

        movies = [];
        currentMovies = [];

        renderMovies([]);

        status.textContent =
            "DATABASE CONNECTION ERROR";

        apiStatus.textContent =
            "● OFFLINE";

        dbStatus.textContent =
            "● DATABASE ERROR";

        console.error(
            "Movie loading error:",
            error
        );

    }

}


function renderMovies(movieList) {

    const grid =
        document.getElementById("movieGrid");

    const count =
        document.getElementById("movieCount");


    grid.innerHTML = "";

    count.textContent =
        movieList.length;


    if (movieList.length === 0) {

        grid.innerHTML = `
            <div class="no-results">

                <h3>
                    NO MOVIES FOUND
                </h3>

                <p>
                    Check the database connection
                    or try another search.
                </p>

            </div>
        `;

        return;
    }


    movieList.forEach(
        (movie, index) => {

            const saved =
                watchlist.includes(movie.id);


            const card =
                document.createElement("article");

            card.className =
                "movie-card";


            card.innerHTML = `

                <div class="poster ${escapeClass(movie.poster)}">

                    <span class="poster-number">
                        ${String(index + 1).padStart(2, "0")}
                    </span>


                    <div class="poster-content">

                        <span class="poster-icon">
                            ${escapeHtml(movie.icon)}
                        </span>

                        ${escapeHtml(movie.title)}

                    </div>


                    <button
                        class="details-btn"
                        onclick="openMovie(${Number(movie.id)})"
                    >
                        VIEW DETAILS
                    </button>

                </div>


                <div class="movie-info">

                    <h3>
                        ${escapeHtml(movie.title)}
                    </h3>


                    <p>
                        ${escapeHtml(String(movie.year))}
                        •
                        ${movie.genre
                            .map(escapeHtml)
                            .join(" / ")
                        }
                    </p>


                    <div class="movie-bottom">

                        <span class="rating">
                            ★ ${Number(movie.rating).toFixed(1)}
                        </span>

                        <span class="tag">
                            ${escapeHtml(movie.tag)}
                        </span>


                        <button
                            class="watch-btn ${saved ? "saved" : ""}"
                            onclick="toggleWatchlist(${Number(movie.id)})"
                            title="${saved ? "Remove from watchlist" : "Add to watchlist"}"
                        >
                            ${saved ? "♥" : "♡"}
                        </button>

                    </div>

                </div>

            `;

            grid.appendChild(card);

        }
    );

}


/* =====================================================
   FILTERS
   ===================================================== */

function setupFilters() {

    document
        .querySelectorAll(".filter")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(".filter")
                        .forEach(
                            btn =>
                                btn.classList.remove("active")
                        );


                    this.classList.add("active");


                    const genre =
                        this.dataset.genre;


                    currentMovies =
                        genre === "All"
                            ? [...movies]
                            : movies.filter(
                                movie =>
                                    movie.genre.includes(genre)
                            );


                    renderMovies(
                        currentMovies
                    );


                    document.getElementById(
                        "searchMessage"
                    ).textContent = "";

                }
            );

        });

}


/* =====================================================
   SEARCH
   ===================================================== */

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    input.addEventListener(
        "keypress",
        function (event) {

            if (event.key === "Enter") {

                searchMovies();

            }

        }
    );

}


function searchMovies() {

    const query =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();


    if (!query) {

        currentMovies = [...movies];

        renderMovies(
            currentMovies
        );

        document.getElementById(
            "searchMessage"
        ).textContent = "";

        return;
    }


    currentMovies =
        movies.filter(movie => {

            return (

                movie.title
                    .toLowerCase()
                    .includes(query)

                ||

                String(movie.year)
                    .includes(query)

                ||

                movie.genre.some(
                    genre =>
                        genre
                            .toLowerCase()
                            .includes(query)
                )

            );

        });


    renderMovies(
        currentMovies
    );


    const message =
        document.getElementById(
            "searchMessage"
        );


    message.textContent =
        currentMovies.length
            ? `${currentMovies.length} MOVIE(S) FOUND FOR "${query.toUpperCase()}"`
            : `NO RESULTS FOUND FOR "${query.toUpperCase()}"`;

}


/* =====================================================
   MOVIE DETAILS
   ===================================================== */

async function openMovie(id) {

    try {

        const movie =
            await api(
                `/movies/${Number(id)}`
            );


        selectedMovie =
            movie;


        document.getElementById(
            "modalTitle"
        ).textContent =
            movie.title;


        document.getElementById(
            "modalMeta"
        ).textContent =
            `${movie.year} • ${movie.genre.join(" / ")}`;


        document.getElementById(
            "modalRating"
        ).textContent =
            `★ ${Number(movie.rating).toFixed(1)} / 5`;


        document.getElementById(
            "modalDescription"
        ).textContent =
            movie.description;


        const button =
            document.getElementById(
                "modalWatchlist"
            );


        const saved =
            watchlist.includes(
                movie.id
            );


        button.textContent =
            saved
                ? "♥ REMOVE FROM WATCHLIST"
                : "♡ ADD TO WATCHLIST";


        button.onclick =
            function () {

                toggleWatchlist(
                    movie.id
                );

            };


        document
            .getElementById("movieModal")
            .classList.add("show");


    } catch (error) {

        console.error(
            "Movie detail error:",
            error
        );

    }

}


function closeModal() {

    document
        .getElementById("movieModal")
        .classList.remove("show");

}


/* =====================================================
   WATCHLIST
   ===================================================== */

async function loadWatchlist() {

    if (!currentUser) {

        watchlist = [];

        updateWatchlistCount();

        renderWatchlist();

        return;

    }


    try {

        const rows =
            await api(
                `/watchlist/${currentUser.user_id}`
            );


        watchlist =
            rows.map(
                row =>
                    Number(row.id)
            );


        updateWatchlistCount();

        renderMovies(
            currentMovies
        );

        renderWatchlist();


    } catch (error) {

        console.error(
            "Watchlist loading error:",
            error
        );

        watchlist = [];

        updateWatchlistCount();

        renderWatchlist();

    }

}


async function toggleWatchlist(id) {

    if (!currentUser) {

        openLogin();

        setLoginMessage(
            "SIGN IN FIRST TO SAVE MOVIES TO YOUR WATCHLIST.",
            "error"
        );

        return;

    }


    const movieId =
        Number(id);


    try {

        if (
            watchlist.includes(movieId)
        ) {

            await api(
                "/watchlist",
                {
                    method: "DELETE",

                    body:
                        JSON.stringify({
                            user_id:
                                currentUser.user_id,

                            movie_id:
                                movieId
                        })
                }
            );


            watchlist =
                watchlist.filter(
                    savedId =>
                        savedId !== movieId
                );


            showToast(
                "Movie removed from your watchlist."
            );


        } else {

            await api(
                "/watchlist",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            user_id:
                                currentUser.user_id,

                            movie_id:
                                movieId
                        })
                }
            );


            watchlist.push(
                movieId
            );


            showToast(
                "Movie added to your watchlist."
            );

        }


        updateWatchlistCount();

        renderMovies(
            currentMovies
        );

        renderWatchlist();


    } catch (error) {

        showToast(
            error.message ||
            "Unable to update watchlist."
        );

    }

}


function updateWatchlistCount() {

    document.getElementById(
        "watchlistCount"
    ).textContent =
        watchlist.length;

}


function showWatchlist() {

    renderWatchlist();


    document
        .querySelector(".watchlist-section")
        .scrollIntoView({
            behavior: "smooth"
        });

}


function renderWatchlist() {

    const area =
        document.getElementById(
            "watchlistArea"
        );


    if (!currentUser) {

        area.innerHTML = `

            <div class="empty-watchlist">

                <div>
                    ♡
                </div>

                <p>
                    Sign in to manage your watchlist.
                </p>

                <small>
                    Your saved movies will be linked
                    to your Cineverse profile.
                </small>

            </div>

        `;

        return;

    }


    const savedMovies =
        movies.filter(
            movie =>
                watchlist.includes(
                    movie.id
                )
        );


    if (
        savedMovies.length === 0
    ) {

        area.innerHTML = `

            <div class="empty-watchlist">

                <div>
                    ♡
                </div>

                <p>
                    Your watchlist is empty.
                </p>

                <small>
                    Use the heart icon on a movie
                    to save it here.
                </small>

            </div>

        `;

        return;

    }


    area.innerHTML = `

        <div class="watchlist-grid">

            ${savedMovies
                .map(movie => `

                    <div class="watch-item">

                        <strong>
                            ${escapeHtml(movie.title)}
                        </strong>

                        <span>
                            ★ ${Number(movie.rating).toFixed(1)}
                        </span>

                        <button
                            onclick="openMovie(${Number(movie.id)})"
                        >
                            VIEW
                        </button>

                    </div>

                `)
                .join("")}

        </div>

    `;

}


/* =====================================================
   RECOMMENDATIONS
   ===================================================== */

async function recommend(genre) {

    const status =
        document.getElementById(
            "recommendationStatus"
        );


    const result =
        document.getElementById(
            "recommendationResult"
        );


    status.textContent =
        "QUERYING DATABASE...";


    try {

        const results =
            await api(
                `/recommendations?genre=${encodeURIComponent(genre)}`
            );


        if (!results.length) {

            result.innerHTML = `

                <div class="recommend-result">

                    <strong>
                        NO MATCHING MOVIES
                    </strong>

                    <span>
                        Try another genre.
                    </span>

                </div>

            `;

            status.textContent =
                "NO MATCH";

            return;

        }


        const movie =
            results[0];


        result.innerHTML = `

            <div class="recommend-result">

                <strong>
                    ${escapeHtml(movie.title)}
                </strong>

                <span>

                    ★
                    ${Number(movie.rating).toFixed(1)}
                    •

                    ${escapeHtml(
                        String(movie.year)
                    )}

                    •

                    ${
                        movie.genre
                            ? movie.genre
                                .map(escapeHtml)
                                .join(" / ")
                            : genre
                    }

                </span>

            </div>

        `;


        status.textContent =
            "RECOMMENDATION READY";


    } catch (error) {

        status.textContent =
            "DATABASE ERROR";


        result.innerHTML = `

            <div class="recommend-result">

                <strong>
                    RECOMMENDATION UNAVAILABLE
                </strong>

                <span>
                    ${escapeHtml(error.message)}
                </span>

            </div>

        `;

    }

}


/* =====================================================
   LOGIN
   ===================================================== */

function restoreUserSession() {

    try {

        currentUser =
            JSON.parse(
                localStorage.getItem(
                    "cineverseUser"
                )
            ) || null;

    } catch (_) {

        currentUser =
            null;

    }

}


async function loginUser() {

    const username =
        document
            .getElementById("username")
            .value
            .trim();


    const email =
        document
            .getElementById("email")
            .value
            .trim();


    if (!username || !email) {

        setLoginMessage(
            "PLEASE ENTER BOTH USERNAME AND EMAIL.",
            "error"
        );

        return;

    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {

        setLoginMessage(
            "PLEASE ENTER A VALID EMAIL ADDRESS.",
            "error"
        );

        return;

    }


    setLoginMessage(
        "CONNECTING TO YOUR CINEVERSE PROFILE...",
        "loading"
    );


    try {

        const user =
            await api(
                "/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            username,
                            email
                        })
                }
            );


        currentUser =
            user;


        localStorage.setItem(
            "cineverseUser",
            JSON.stringify(user)
        );


        updateAccountUI();

        await loadWatchlist();


        setLoginMessage(
            `WELCOME BACK, ${user.username.toUpperCase()} • PROFILE CONNECTED ✓`,
            "success"
        );


        setTimeout(
            () => closeLogin(),
            900
        );


    } catch (error) {

        setLoginMessage(
            error.message ||
            "Unable to connect to profile.",
            "error"
        );

    }

}


function logoutUser() {

    const name =
        currentUser
            ? currentUser.username
            : "USER";


    currentUser =
        null;


    watchlist =
        [];


    localStorage.removeItem(
        "cineverseUser"
    );


    updateAccountUI();

    updateWatchlistCount();

    renderMovies(
        currentMovies
    );

    renderWatchlist();

    closeLogin();

    closeProfile();


    showToast(
        `${name.toUpperCase()} LOGGED OUT.`
    );

}


function updateAccountUI() {

    const guest =
        document.getElementById(
            "guestControls"
        );


    const user =
        document.getElementById(
            "userControls"
        );


    if (!currentUser) {

        guest.style.display =
            "";

        user.style.display =
            "none";

        return;

    }


    guest.style.display =
        "none";


    user.style.display =
        "flex";


    document.getElementById(
        "profileName"
    ).textContent =
        currentUser.username.toUpperCase();


    document.getElementById(
        "profileInitial"
    ).textContent =
        currentUser.username
            .charAt(0)
            .toUpperCase();

}


function openLogin() {

    if (currentUser) {

        openProfile();

        return;

    }


    document.getElementById(
        "loginTitle"
    ).innerHTML =
        `SIGN IN <span>TO CINEVERSE</span>`;


    document.getElementById(
        "loginDescription"
    ).textContent =
        "Enter your profile details to access your saved watchlist and contribute reviews to the community database.";


    document.getElementById(
        "username"
    ).value = "";


    document.getElementById(
        "email"
    ).value = "";


    document.getElementById(
        "loginMessage"
    ).textContent = "";


    document
        .getElementById("loginModal")
        .classList.add("show");

}


function closeLogin() {

    document
        .getElementById("loginModal")
        .classList.remove("show");

}


function openProfile() {

    if (!currentUser) {

        openLogin();

        return;

    }


    document.getElementById(
        "profileModalName"
    ).textContent =
        currentUser.username.toUpperCase();


    document.getElementById(
        "profileModalEmail"
    ).textContent =
        currentUser.email;


    document
        .getElementById("profileModal")
        .classList.add("show");

}


function closeProfile() {

    document
        .getElementById("profileModal")
        .classList.remove("show");

}


function setLoginMessage(
    message,
    type = "success"
) {

    const element =
        document.getElementById(
            "loginMessage"
        );


    element.textContent =
        message;


    element.dataset.state =
        type;

}


/* =====================================================
   REVIEWS
   ===================================================== */

async function loadReviews() {

    const grid =
        document.getElementById(
            "reviewsGrid"
        );


    try {

        const reviews =
            await api("/reviews");


        if (!reviews.length) {

            grid.innerHTML = `

                <article class="review-card">

                    <div class="review-user">

                        <div class="avatar">
                            C
                        </div>

                        <div>

                            <strong>
                                CINEVERSE
                            </strong>

                            <small>
                                NO REVIEWS YET
                            </small>

                        </div>

                    </div>


                    <div class="stars">
                        ★★★★★
                    </div>


                    <p>
                        Be the first user to write a review.
                    </p>


                    <span>
                        COMMUNITY
                    </span>

                </article>

            `;

            return;

        }


        grid.innerHTML =
            "";


        reviews
            .slice(0, 6)
            .forEach(review => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "review-card";


                const userRow =
                    document.createElement(
                        "div"
                    );


                userRow.className =
                    "review-user";


                const avatar =
                    document.createElement(
                        "div"
                    );


                avatar.className =
                    "avatar";


                avatar.textContent =
                    (
                        review.username ||
                        "U"
                    )
                        .charAt(0)
                        .toUpperCase();


                const userInfo =
                    document.createElement(
                        "div"
                    );


                const strong =
                    document.createElement(
                        "strong"
                    );


                strong.textContent =
                    (
                        review.username ||
                        "USER"
                    ).toUpperCase();


                const small =
                    document.createElement(
                        "small"
                    );


                small.textContent =
                    formatDate(
                        review.date
                    );


                userInfo.appendChild(
                    strong
                );

                userInfo.appendChild(
                    small
                );


                userRow.appendChild(
                    avatar
                );

                userRow.appendChild(
                    userInfo
                );


                const stars =
                    document.createElement(
                        "div"
                    );


                stars.className =
                    "stars";


                stars.textContent =
                    starString(
                        Number(review.rating)
                    );


                const text =
                    document.createElement(
                        "p"
                    );


                text.textContent =
                    `"${review.review}"`;


                const movie =
                    document.createElement(
                        "span"
                    );


                movie.textContent =
                    review.movie;


                card.appendChild(
                    userRow
                );

                card.appendChild(
                    stars
                );

                card.appendChild(
                    text
                );

                card.appendChild(
                    movie
                );


                grid.appendChild(
                    card
                );

            });


    } catch (error) {

        console.error(
            "Review loading error:",
            error
        );


        grid.innerHTML = `

            <article class="review-card">

                <div class="review-user">

                    <div class="avatar">
                        !
                    </div>

                    <div>

                        <strong>
                            DATABASE
                        </strong>

                        <small>
                            UNAVAILABLE
                        </small>

                    </div>

                </div>


                <div class="stars">
                    —
                </div>


                <p>
                    Community reviews could not be loaded.
                </p>


                <span>
                    CONNECTION ERROR
                </span>

            </article>

        `;

    }

}


async function submitReview() {

    if (!currentUser) {

        openLogin();

        setLoginMessage(
            "SIGN IN FIRST TO SUBMIT A REVIEW.",
            "error"
        );

        return;

    }


    const movie =
        document.getElementById(
            "reviewMovie"
        ).value;


    const rating =
        Number(
            document.getElementById(
                "reviewRating"
            ).value
        );


    const text =
        document
            .getElementById(
                "reviewText"
            )
            .value
            .trim();


    const message =
        document.getElementById(
            "reviewMessage"
        );


    const button =
        document.getElementById(
            "submitReviewBtn"
        );


    if (!text) {

        message.textContent =
            "PLEASE WRITE A REVIEW FIRST.";

        return;

    }


    button.disabled =
        true;


    button.textContent =
        "SAVING REVIEW...";


   message.textContent =
    "SUBMITTING REVIEW...";

    try {

        await api(
            "/reviews",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        username:
                            currentUser.username,

                        email:
                            currentUser.email,

                        movie,

                        rating,

                        review:
                            text
                    })
            }
        );


       message.textContent =
    "REVIEW SUBMITTED ✓";


        document.getElementById(
            "reviewText"
        ).value = "";


        await loadReviews();

        await loadStats();


       showToast(
    "Review submitted successfully ✓"
);

        setTimeout(
            () => {

                closeReview();

                message.textContent =
                    "";

            },
            1100
        );


    } catch (error) {

        message.textContent =
            `SUBMISSION FAILED: ${error.message}`;

    } finally {

        button.disabled =
            false;

        button.textContent =
            "SUBMIT REVIEW";

    }

}


function openReview() {

    if (!currentUser) {

        openLogin();

        setLoginMessage(
            "SIGN IN FIRST TO WRITE A REVIEW.",
            "error"
        );

        return;

    }


    if (selectedMovie) {

        const option =
            [
                ...document
                    .getElementById(
                        "reviewMovie"
                    )
                    .options
            ]
                .find(
                    item =>
                        item.text
                            .toLowerCase() ===
                        selectedMovie.title
                            .toLowerCase()
                );


        if (option) {

            document.getElementById(
                "reviewMovie"
            ).value =
                option.value;

        }

    }


    document.getElementById(
        "reviewMessage"
    ).textContent = "";


    document
        .getElementById("reviewModal")
        .classList.add("show");

}


function closeReview() {

    document
        .getElementById("reviewModal")
        .classList.remove("show");

}


/* =====================================================
   STATS
   ===================================================== */

async function loadStats() {

    try {

        const stats =
            await api("/stats");


        document.getElementById(
            "heroMovieCount"
        ).textContent =
            stats.total_movies;


        document.getElementById(
            "heroReviewCount"
        ).textContent =
            stats.total_reviews;


        document.getElementById(
            "heroUserCount"
        ).textContent =
            stats.total_users;


        document.getElementById(
            "databaseMovieCount"
        ).textContent =
            stats.total_movies;


        document.getElementById(
            "databaseReviewCount"
        ).textContent =
            stats.total_reviews;


        document.getElementById(
            "databaseUserCount"
        ).textContent =
            stats.total_users;


        document.getElementById(
            "databaseStatus"
        ).textContent =
            "ONLINE";


    } catch (error) {

        document.getElementById(
            "databaseStatus"
        ).textContent =
            "OFFLINE";


        console.error(
            "Stats error:",
            error
        );

    }

}


/* =====================================================
   NAVIGATION
   ===================================================== */

function scrollToMovies() {

    document
        .getElementById("movies")
        .scrollIntoView({
            behavior: "smooth"
        });

}


function scrollToRecommendations() {

    document
        .getElementById("recommendations")
        .scrollIntoView({
            behavior: "smooth"
        });

}


/* =====================================================
   UTILITIES
   ===================================================== */

function starString(rating) {

    const safeRating =
        Math.max(
            0,
            Math.min(
                5,
                Number(rating) || 0
            )
        );


    return (
        "★".repeat(safeRating) +
        "☆".repeat(5 - safeRating)
    );

}


function formatDate(value) {

    if (!value) {
        return "RECENTLY";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "RECENTLY";
    }


    return date.toLocaleDateString();

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeClass(value) {

    return String(
        value ?? ""
    ).replace(
        /[^a-zA-Z0-9_-]/g,
        ""
    );

}


function showToast(message) {

    let toast =
        document.getElementById(
            "cineverseToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "cineverseToast";


        toast.style.position =
            "fixed";

        toast.style.right =
            "24px";

        toast.style.bottom =
            "24px";

        toast.style.zIndex =
            "9999";

        toast.style.padding =
            "14px 18px";

        toast.style.background =
            "#071316";

        toast.style.border =
            "1px solid #00ffd5";

        toast.style.color =
            "#fff";

        toast.style.fontSize =
            "11px";

        toast.style.letterSpacing =
            "1px";

        toast.style.boxShadow =
            "0 0 25px rgba(0,255,213,.18)";


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    clearTimeout(
        window.cineverseToastTimer
    );


    window.cineverseToastTimer =
        setTimeout(
            () => {

                toast.remove();

            },
            2500
        );

}


/* =====================================================
   MODAL CLOSE
   ===================================================== */

window.addEventListener(
    "click",
    function (event) {

        const movieModal =
            document.getElementById(
                "movieModal"
            );


        const loginModal =
            document.getElementById(
                "loginModal"
            );


        const reviewModal =
            document.getElementById(
                "reviewModal"
            );


        const profileModal =
            document.getElementById(
                "profileModal"
            );


        if (
            event.target === movieModal
        ) {
            closeModal();
        }


        if (
            event.target === loginModal
        ) {
            closeLogin();
        }


        if (
            event.target === reviewModal
        ) {
            closeReview();
        }


        if (
            event.target === profileModal
        ) {
            closeProfile();
        }

    }
);