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

    // --- THIS IS THE CORRECTED CONFIGURATION LOGIC ---
    // 1. Read individual settings from environment variables
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

    // 2. Check if all required settings are present
    if (!dbConfig.server || !dbConfig.authentication.options.userName || !dbConfig.authentication.options.password || !dbConfig.options.database) {
        return res.status(500).json({ status: "Database configuration is incomplete. Please check all DB settings." });
    }
    
    // 3. Create the connection using the config object
    const connection = new Connection(dbConfig);
    // --------------------------------------------------

    try {
        // Promisify the connection process
        await new Promise((resolve, reject) => {
            connection.on('connect', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            connection.connect();
        });

        // Execute the query
        const result = await new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(1) AS UserCount FROM Users WHERE Username = @username AND Password = @password`;
            const request = new Request(sql, (err, rowCount, rows) => {
                if (err) {
                    reject(err);
                } else if (rowCount === 1 && rows[0][0].value === 1) {
                    resolve({ isValid: true });
                } else {
                    resolve({ isValid: false });
                }
            });

            request.addParameter('username', TYPES.NVarChar, username);
            request.addParameter('password', TYPES.NVarChar, password);
            
            connection.execSql(request);
        });

        // Send response
        if (result.isValid) {
            res.status(200).json({ status: "Login Successful" });
        } else {
            res.status(401).json({ status: "Invalid Credentials" });
        }

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ status: `Database error: ${err.message}` });
    } finally {
        // Always close the connection
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