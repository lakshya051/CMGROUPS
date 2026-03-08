const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ Error: DATABASE_URL not found in .env file.");
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function applySchema() {
    try {
        await client.connect();
        console.log("✅ Connected to NeonDB.");

        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("⏳ Applying schema...");
        await client.query(schemaSql);
        
        console.log("✅ Schema applied successfully! Tables created.");
        await client.end();
    } catch (err) {
        console.error("❌ Error applying schema:", err);
        process.exit(1);
    }
}

applySchema();
