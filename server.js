const express = require('express');
const path = require('path');
const { Connection, Request, TYPES } = require('tedious');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Route for Login
app.post('/api/test-login-db', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt for username:', username);
    
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

    console.log('Database config server:', dbConfig.server);
    console.log('Database config database:', dbConfig.options.database);

    // 2. Check if all required settings are present
    if (!dbConfig.server || !dbConfig.authentication.options.userName || !dbConfig.authentication.options.password || !dbConfig.options.database) {
        return res.status(500).json({ status: "Database configuration is incomplete. Please check all DB settings." });
    }
    
    // 3. Create the connection using the config object
    const connection = new Connection(dbConfig);

    try {
        console.log('Attempting database connection...');
        
        // Promisify the connection process
        await new Promise((resolve, reject) => {
            connection.on('connect', (err) => {
                if (err) {
                    console.error('Connection error:', err);
                    reject(err);
                } else {
                    console.log('Database connected successfully');
                    resolve();
                }
            });
            connection.connect();
        });

        console.log('Executing query for user:', username);
        
        // Execute the query
        const result = await new Promise((resolve, reject) => {
            const sql = `SELECT 1 FROM Users WHERE Username = @username AND Password = @password`;
            const request = new Request(sql, (err, rowCount) => {
                if (err) {
                    console.error('Query error:', err);
                    reject(err);
                } else {
                    console.log('Query result - rowCount:', rowCount);
                    
                    // If rowCount > 0, user exists; if 0, user doesn't exist
                    resolve({ isValid: rowCount > 0 });
                }
            });

            request.addParameter('username', TYPES.NVarChar, username);
            request.addParameter('password', TYPES.NVarChar, password);
            
            connection.execSql(request);
        });

        console.log('Query completed, result:', result);

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


// --- API Route for Adding Projects ---
app.post('/api/add-project', async (req, res) => {
    const { researcherName, projectTitle } = req.body;

    if (!researcherName || !projectTitle) {
        return res.status(400).json({ status: "Please provide both a researcher name and a project title." });
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
    
    const connection = new Connection(dbConfig);

    try {
        await new Promise((resolve, reject) => {
            connection.on('connect', (err) => {
                if (err) reject(err);
                else resolve();
            });
            connection.connect();
        });

        await new Promise((resolve, reject) => {
            const sql = `INSERT INTO Projects (ResearcherName, ProjectTitle) VALUES (@researcherName, @projectTitle)`;
            const request = new Request(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });

            request.addParameter('researcherName', TYPES.NVarChar, researcherName);
            request.addParameter('projectTitle', TYPES.NVarChar, projectTitle);
            
            connection.execSql(request);
        });

        res.status(201).json({ status: "Project added successfully!" });

    } catch (err) {
        console.error('Add project error:', err);
        res.status(500).json({ status: `Database error: ${err.message}` });
    } finally {
        if (connection && !connection.closed) {
            connection.close();
        }
    }
});

// ---  API Route for Getting Projects ---
app.get('/api/projects', async (req, res) => {
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
    
    const connection = new Connection(dbConfig);
    const projects = [];

    try {
        await new Promise((resolve, reject) => {
            connection.on('connect', (err) => {
                if (err) reject(err);
                else resolve();
            });
            connection.connect();
        });

        await new Promise((resolve, reject) => {
            const sql = `SELECT ResearcherName, ProjectTitle FROM Projects ORDER BY CreatedAt DESC`;
            const request = new Request(sql, (err) => {
                if (err) reject(err);
            });

            // This event fires for each row returned from the database
            request.on('row', (columns) => {
                projects.push({
                    researcherName: columns[0].value,
                    projectTitle: columns[1].value
                });
            });

            // This event fires when the query is complete
            request.on('requestCompleted', () => {
                resolve();
            });
            
            connection.execSql(request);
        });

        res.status(200).json(projects);

    } catch (err)
 {
        console.error('Get projects error:', err);
        res.status(500).json({ status: `Database error: ${err.message}` });
    } finally {
        if (connection && !connection.closed) {
            connection.close();
        }
    }
});

// --- Dashboard Route ---
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start the Server
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});