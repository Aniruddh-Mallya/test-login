const { Connection, Request, TYPES } = require('tedious');

// Main function that is executed when the API is called
module.exports = async function (context, req) {
    // Get username and password from the request body sent by the front-end
    const { username, password } = req.body;

    // Basic validation to ensure we received the data we need
    if (!username || !password) {
        context.res = {
            status: 400,
            body: { status: "Please provide both a username and a password." }
        };
        return;
    }

    // Load the database connection string securely from Application Settings
    const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
    if (!connectionString) {
        context.res = {
            status: 500,
            body: { status: "Database connection string is not configured." }
        };
        return;
    }

    const connection = new Connection(JSON.parse(connectionString));

    // Promisify the connection process to use async/await
    const connectAsync = () => new Promise((resolve, reject) => {
        connection.on('connect', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
        connection.connect();
    });

    try {
        await connectAsync();

        // Use a Promise to handle the database query
        const result = await new Promise((resolve, reject) => {
            // Parameterized query to prevent SQL injection attacks
            const sql = `SELECT COUNT(1) AS UserCount FROM Users WHERE Username = @username AND Password = @password`;
            
            const request = new Request(sql, (err, rowCount, rows) => {
                if (err) {
                    reject(err);
                } else if (rowCount === 1 && rows[0][0].value === 1) {
                    // If we found exactly one matching user
                    resolve({ isValid: true });
                } else {
                    // If no user was found
                    resolve({ isValid: false });
                }
            });

            // Add parameters to the query
            request.addParameter('username', TYPES.NVarChar, username);
            request.addParameter('password', TYPES.NVarChar, password); // Note: In a real app, passwords should be hashed!

            connection.execSql(request);
        });

        // Send a response back to the front-end based on the query result
        if (result.isValid) {
            context.res = { status: 200, body: { status: "Login Successful" } };
        } else {
            context.res = { status: 401, body: { status: "Invalid Credentials" } };
        }

    } catch (err) {
        // Handle any errors during connection or query
        context.res = {
            status: 500,
            body: { status: `Database error: ${err.message}` }
        };
    } finally {
        // Always close the connection
        if (connection.closed) {
          connection.close();
        }
    }
};