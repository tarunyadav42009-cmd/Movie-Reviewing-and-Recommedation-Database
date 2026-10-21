# Cineverse — MSBTE K-Scheme DBMS Mini Project

A movie review, recommendation and watchlist database application upgraded from the original Cineverse frontend.

## Website
https://cineverse-x6ep.onrender.com/   

## Stack

- HTML / CSS / JavaScript — original presentation layer
- Python Flask — backend/API
- MySQL — relational database
- SQL + MySQL stored procedure — DBMS implementation
- Oracle PL/SQL companion — CO4 classroom/practical demonstration

## Main DBMS tables

`users`, `movies`, `genres`, `movie_genres`, `reviews`, `watchlist`

## Project flow

```text
Browser
   ↓
index.html + style.css + script.js
   ↓ HTTP / JSON
Flask API
   ↓ SQL
MySQL / Cineverse database
```

## Important

The original frontend was intentionally preserved. The database layer is the major upgrade: movie/search/recommendation data, users, reviews and watchlists are now designed to live in the relational database instead of browser `localStorage`.
