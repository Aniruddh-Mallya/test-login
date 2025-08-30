const express = require('express');
const path = require('path');
const { Connection, Request, TYPES } = require('tedious');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Route
app.post('/api/test-login-db', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "Please provide both a username and a password." });
    }

    const dbConfig = {
        server: process.env.DB_SERVER,
        authentication: {
            type: 'default',
            options: {
                userName: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
            }
        },
        options: {
            database: process.env.DB_DATABASE,
            encrypt: true,
            trustServerCertificate: false
        }
    };

    if (!dbConfig.server || !dbConfig.authentication.options.userName || !dbConfig.authentication.options.password || !dbConfig.options.database) {
        return res.status(500).json({ status: "Database configuration is incomplete. Please check all DB settings." });
    }
    
    const connection = new Connection(dbConfig);

    try {
        await new Promise((resolve, reject) => {
            connection.on('connect', (err) => {
                if (err) reject(err);
                else resolve();
            });
            connection.connect();
        });

        const result = await new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(1) AS UserCount FROM Users WHERE Username = @username AND Password = @password`;
            const request = new Request(sql, (err, rowCount, rows) => {
                // --- THIS IS THE CORRECTED LOGIC ---
                if (err) {
                    reject(err);
                } else if (rowCount !== 1 || !rows || rows.length === 0) {
                    // This case handles when no rows are returned, which we treat as invalid.
                    resolve({ isValid: false });
                } else {
                    // Now that we know a row exists, we can safely access it.
                    const userCount = rows[0][0].value;
                    resolve({ isValid: userCount === 1 });
                }
                // ------------------------------------
            });

            request.addParameter('username', TYPES.NVarChar, username);
            request.addParameter('password', TYPES.NVarChar, password);
            
            connection.execSql(request);
        });

        if (result.isValid) {
            res.status(200).json({ status: "Login Successful" });
        } else {
            res.status(401).json({ status: "Invalid Credentials" });
        }

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ status: `Database error: ${err.message}` });
    } finally {
        if (connection && !connection.closed) {
            connection.close();
        }
    }
});

// Start the Server
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});