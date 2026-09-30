CINEVERSE - XAMPP LOCAL DBMS

1. Start Apache and MySQL in XAMPP.
2. Open http://localhost/phpmyadmin/
3. Import cineverse.sql.
4. Keep your exact existing index.html, style.css and script.js in frontend/.
5. Install:
   pip install -r requirements.txt
6. Run:
   python server.py
7. Open:
   http://127.0.0.1:5000/

IMPORTANT:
Your current script.js still uses the JavaScript movie array and localStorage.
Therefore the database/API layer in server.py is ready, but the current frontend
does not call these API endpoints yet. The visual frontend is unchanged.
To make search/watchlist/reviews/login actually read/write MySQL, only the data
functions in script.js need to be connected to the API in the next step.

XAMPP uses MariaDB rather than MySQL in current XAMPP releases. It uses the
same SQL commands/tools for this purpose. XAMPP's default database port is 3306.
If your old Windows MySQL84 service is still using 3306, stop that service
before starting XAMPP's MySQL/MariaDB.
