const express = require('express');
const path = require('path');
const { Connection, Request, TYPES } = require('tedious');

// Create the Express app
const app = express();

// --- Middleware ---
// 1. Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// 2. Enable the server to parse JSON request bodies
app.use(express.json());


// --- API Route ---
// This is your login endpoint, which replaces the Azure Function
app.post('/api/test-login-db', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "Please provide both a username and a password." });
    }

    // Load the database connection string securely from environment variables
    const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
    if (!connectionString) {
        return res.status(500).json({ status: "Database connection string is not configured." });
    }

    const connection = new Connection(JSON.parse(connectionString));

    connection.on('connect', (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: `Database connection error: ${err.message}` });
        }
        
        // If connection is successful, execute the query
        executeStatement();
    });

    connection.connect();

    function executeStatement() {
        const sql = `SELECT COUNT(1) AS UserCount FROM Users WHERE Username = @username AND Password = @password`;
        const request = new Request(sql, (err, rowCount, rows) => {
            if (err) {
                res.status(500).json({ status: `Database query error: ${err.message}` });
            } else if (rowCount === 1 && rows[0][0].value === 1) {
                res.status(200).json({ status: "Login Successful" });
            } else {
                res.status(401).json({ status: "Invalid Credentials" });
            }
            // Always close the connection
            connection.close();
        });

        request.addParameter('username', TYPES.NVarChar, username);
        request.addParameter('password', TYPES.NVarChar, password); // Note: Remember to hash passwords in a real app!
        
        connection.execSql(request);
    }
});


// --- Start the Server ---
// App Service provides the port number via an environment variable
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});