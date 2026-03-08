// Simple script to test Postgres connection
// Usage: node server/db_test.js

const { Client } = require('pg');
require('dotenv').config();

// Retrieve connection string from environment variable or argument
const connectionString = process.env.DATABASE_URL || process.argv[2];

if (!connectionString) {
    console.error("Error: Please provide a connection string.");
    console.error("Usage: node server/db_test.js <postgres_connection_string>");
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testConnection() {
    try {
        await client.connect();
        console.log("✅ Successfully connected to NeonDB PostgreSQL!");

        const res = await client.query('SELECT NOW()');
        console.log('Current Database Time:', res.rows[0].now);

        await client.end();
    } catch (err) {
        console.error("❌ Connection failed:", err);
        process.exit(1);
    }
}

testConnection();
