/* =====================================================
   CINEVERSE V2
   MOVIE DATABASE JAVASCRIPT
   ===================================================== */


/* =====================================================
   MOVIE DATABASE
   ===================================================== */

const movies = [

    {
        id: 1,
        title: "INTERSTELLAR",
        year: 2014,
        genre: ["Sci-Fi", "Adventure"],
        rating: 4.8,
        tag: "MASTERPIECE",
        poster: "poster-1",
        icon: "◉",
        description:
            "A group of explorers travel through a wormhole in space in search of a new home for humanity."
    },

    {
        id: 2,
        title: "INCEPTION",
        year: 2010,
        genre: ["Sci-Fi", "Thriller"],
        rating: 4.7,
        tag: "TOP RATED",
        poster: "poster-2",
        icon: "◇",
        description:
            "A skilled thief who steals information through dreams is given a chance to erase his past."
    },

    {
        id: 3,
        title: "AVENGERS: ENDGAME",
        year: 2019,
        genre: ["Action", "Adventure"],
        rating: 4.6,
        tag: "POPULAR",
        poster: "poster-3",
        icon: "◆",
        description:
            "The Avengers face their biggest challenge as they attempt to restore what was lost."
    },

    {
        id: 4,
        title: "THE BATMAN",
        year: 2022,
        genre: ["Action", "Thriller"],
        rating: 4.5,
        tag: "DARK MODE",
        poster: "poster-4",
        icon: "▲",
        description:
            "Batman investigates a series of crimes that reveal a deeper conspiracy within Gotham."
    },

    {
        id: 5,
        title: "AVATAR",
        year: 2009,
        genre: ["Action", "Adventure"],
        rating: 4.4,
        tag: "VISUAL EPIC",
        poster: "poster-5",
        icon: "✦",
        description:
            "A marine joins an expedition to an alien world and becomes caught between two civilizations."
    },

    {
        id: 6,
        title: "DUNE",
        year: 2021,
        genre: ["Sci-Fi", "Adventure", "Drama"],
        rating: 4.6,
        tag: "EPIC",
        poster: "poster-6",
        icon: "△",
        description:
            "A young nobleman must travel to a dangerous desert planet and embrace a destiny greater than himself."
    }

];


/* =====================================================
   VARIABLES
   ===================================================== */

let currentMovies = [...movies];

let watchlist =
    JSON.parse(localStorage.getItem("cineverseWatchlist")) || [];

let selectedMovie = null;


/* =====================================================
   INITIALIZE WEBSITE
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    renderMovies(movies);

    updateWatchlistCount();

    setupFilters();

    setupSearch();

});


/* =====================================================
   RENDER MOVIES
   ===================================================== */

function renderMovies(movieList) {

    const grid =
        document.getElementById("movieGrid");

    grid.innerHTML = "";

    document.getElementById("movieCount").textContent =
        movieList.length;


    if (movieList.length === 0) {

        grid.innerHTML = `
            <div class="no-results">
                <h3>NO MOVIES FOUND</h3>
                <p>Try another search or category.</p>
            </div>
        `;

        return;
    }


    movieList.forEach((movie, index) => {

        const saved =
            watchlist.includes(movie.id);

        const card =
            document.createElement("article");

        card.className = "movie-card";

        card.innerHTML = `

            <div class="poster ${movie.poster}">

                <span class="poster-number">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <div class="poster-content">

                    <span class="poster-icon">
                        ${movie.icon}
                    </span>

                    ${movie.title}

                </div>

                <button
                    class="details-btn"
                    onclick="openMovie(${movie.id})"
                >
                    VIEW DETAILS
                </button>

            </div>


            <div class="movie-info">

                <h3>
                    ${movie.title}
                </h3>

                <p>
                    ${movie.year} •
                    ${movie.genre.join(" / ")}
                </p>


                <div class="movie-bottom">

                    <span class="rating">
                        ★ ${movie.rating}
                    </span>

                    <span class="tag">
                        ${movie.tag}
                    </span>

                    <button
                        class="watch-btn ${saved ? "saved" : ""}"
                        onclick="toggleWatchlist(${movie.id})"
                        title="Add to watchlist"
                    >
                        ${saved ? "♥" : "♡"}
                    </button>

                </div>

            </div>

        `;

        grid.appendChild(card);

    });

}


/* =====================================================
   FILTER SYSTEM
   ===================================================== */

function setupFilters() {

    const buttons =
        document.querySelectorAll(".filter");


    buttons.forEach(button => {

        button.addEventListener("click", function () {

            buttons.forEach(btn =>
                btn.classList.remove("active")
            );

            this.classList.add("active");

            const genre =
                this.dataset.genre;

            if (genre === "All") {

                currentMovies = [...movies];

            } else {

                currentMovies =
                    movies.filter(movie =>
                        movie.genre.includes(genre)
                    );

            }

            renderMovies(currentMovies);

            document.getElementById(
                "searchMessage"
            ).textContent = "";

        });

    });

}


/* =====================================================
   SEARCH
   ===================================================== */

function setupSearch() {

    const input =
        document.getElementById("searchInput");


    input.addEventListener("keypress", function (event) {

        if (event.key === "Enter") {

            searchMovies();

        }

    });

}


function searchMovies() {

    const input =
        document.getElementById("searchInput");

    const query =
        input.value.toLowerCase().trim();


    if (!query) {

        currentMovies = [...movies];

        renderMovies(currentMovies);

        document.getElementById(
            "searchMessage"
        ).textContent = "";

        return;
    }


    currentMovies =
        movies.filter(movie => {

            return (

                movie.title.toLowerCase().includes(query) ||

                movie.year.toString().includes(query) ||

                movie.genre.some(
                    genre =>
                        genre.toLowerCase().includes(query)
                )

            );

        });


    renderMovies(currentMovies);


    const message =
        document.getElementById("searchMessage");


    if (currentMovies.length > 0) {

        message.textContent =
            `${currentMovies.length} MOVIE(S) FOUND FOR "${query.toUpperCase()}"`;

    } else {

        message.textContent =
            `NO RESULTS FOUND FOR "${query.toUpperCase()}"`;

    }

}


/* =====================================================
   MOVIE DETAILS
   ===================================================== */

function openMovie(id) {

    const movie =
        movies.find(movie => movie.id === id);

    if (!movie) return;

    selectedMovie = movie;


    document.getElementById("modalTitle").textContent =
        movie.title;


    document.getElementById("modalMeta").textContent =
        `${movie.year} • ${movie.genre.join(" / ")}`;


    document.getElementById("modalRating").textContent =
        `★ ${movie.rating} / 5`;


    document.getElementById("modalDescription").textContent =
        movie.description;


    const button =
        document.getElementById("modalWatchlist");


    const saved =
        watchlist.includes(movie.id);


    button.textContent =
        saved
            ? "♥ REMOVE FROM WATCHLIST"
            : "♡ ADD TO WATCHLIST";


    button.onclick = function () {

        toggleWatchlist(movie.id);

        openMovie(movie.id);

    };


    document
        .getElementById("movieModal")
        .classList.add("show");

}


function closeModal() {

    document
        .getElementById("movieModal")
        .classList.remove("show");

}


/* =====================================================
   WATCHLIST
   ===================================================== */

function toggleWatchlist(id) {

    if (watchlist.includes(id)) {

        watchlist =
            watchlist.filter(movieId =>
                movieId !== id
            );

    } else {

        watchlist.push(id);

    }


    localStorage.setItem(
        "cineverseWatchlist",
        JSON.stringify(watchlist)
    );


    updateWatchlistCount();

    renderMovies(currentMovies);

    renderWatchlist();

}


function updateWatchlistCount() {

    document.getElementById(
        "watchlistCount"
    ).textContent = watchlist.length;

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
        document.getElementById("watchlistArea");


    const savedMovies =
        movies.filter(movie =>
            watchlist.includes(movie.id)
        );


    if (savedMovies.length === 0) {

        area.innerHTML = `

            <div class="empty-watchlist">

                <div>♡</div>

                <p>
                    Your watchlist is empty.
                </p>

                <small>
                    Add movies you want to watch later.
                </small>

            </div>

        `;

        return;

    }


    area.innerHTML = `

        <div class="watchlist-grid">

            ${savedMovies.map(movie => `

                <div class="watch-item">

                    <strong>
                        ${movie.title}
                    </strong>

                    <span>
                        ★ ${movie.rating}
                    </span>

                    <button
                        onclick="openMovie(${movie.id})"
                    >
                        VIEW
                    </button>

                </div>

            `).join("")}

        </div>

    `;

}


/* =====================================================
   RECOMMENDATION ENGINE
   ===================================================== */

function recommend(genre) {

    const matches =
        movies.filter(movie =>
            movie.genre.includes(genre)
        );


    if (matches.length === 0) {

        return;

    }


    matches.sort(
        (a, b) =>
            b.rating - a.rating
    );


    const movie =
        matches[0];


    document.getElementById(
        "recommendationResult"
    ).innerHTML = `

        <div class="recommend-result">

            <strong>
                ${movie.title}
            </strong>

            <span>
                ★ ${movie.rating} •
                ${movie.year} •
                ${movie.genre.join(" / ")}
            </span>

        </div>

    `;

}


/* =====================================================
   LOGIN
   ===================================================== */

function openLogin() {

    document
        .getElementById("loginModal")
        .classList.add("show");

}


function closeLogin() {

    document
        .getElementById("loginModal")
        .classList.remove("show");

}


function loginUser() {

    const username =
        document.getElementById("username").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const message =
        document.getElementById("loginMessage");


    if (!username || !email) {

        message.textContent =
            "PLEASE ENTER YOUR USERNAME AND EMAIL.";

        return;

    }


    message.textContent =
        `WELCOME, ${username.toUpperCase()} • ACCESS GRANTED`;


    localStorage.setItem(
        "cineverseUser",
        username
    );

}


/* =====================================================
   REVIEW SYSTEM
   ===================================================== */

function openReview() {

    closeModal();

    document
        .getElementById("reviewModal")
        .classList.add("show");

}


function closeReview() {

    document
        .getElementById("reviewModal")
        .classList.remove("show");

}


function submitReview() {

    const movie =
        document.getElementById("reviewMovie").value;

    const rating =
        document.getElementById("reviewRating").value;

    const text =
        document.getElementById("reviewText").value.trim();

    const message =
        document.getElementById("reviewMessage");


    if (!text) {

        message.textContent =
            "PLEASE WRITE A REVIEW FIRST.";

        return;

    }


    const reviews =
        JSON.parse(
            localStorage.getItem("cineverseReviews")
        ) || [];


    reviews.push({

        movie: movie,

        rating: rating,

        review: text,

        date: new Date().toLocaleDateString()

    });


    localStorage.setItem(
        "cineverseReviews",
        JSON.stringify(reviews)
    );


    message.textContent =
        "REVIEW SAVED TO LOCAL DATABASE ✓";


    document.getElementById(
        "reviewText"
    ).value = "";

}


/* =====================================================
   NAVIGATION HELPERS
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
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ===================================================== */

window.addEventListener("click", function (event) {

    const movieModal =
        document.getElementById("movieModal");

    const loginModal =
        document.getElementById("loginModal");

    const reviewModal =
        document.getElementById("reviewModal");


    if (event.target === movieModal) {

        closeModal();

    }


    if (event.target === loginModal) {

        closeLogin();

    }


    if (event.target === reviewModal) {

        closeReview();

    }

});

