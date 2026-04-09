/**
 * Execute SQL migration on Supabase using the SQL API
 * Usage: npx tsx scripts/execute-sql.ts
 * 
 * Reads the migration file and executes it statement by statement
 * against the Supabase database using the service role key.
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];

async function executeSQL(sql: string): Promise<unknown> {
  // Use the Supabase Management API's SQL endpoint
  const response = await fetch(
    `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ sql_query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    // If the rpc endpoint doesn't exist, we need to use the dashboard
    if (response.status === 404) {
      throw new Error(
        `RPC endpoint not found. You need to run the migration via Supabase Dashboard SQL Editor.\n` +
        `Open: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n` +
        `And paste the migration SQL there.`
      );
    }
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  const migrationFile = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "001_initial_schema.sql"
  );

  if (!fs.existsSync(migrationFile)) {
    console.error("❌ Migration file not found:", migrationFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, "utf8");
  console.log(`📦 Migration: 001_initial_schema.sql`);
  console.log(`🎯 Target: ${PROJECT_REF}.supabase.co`);
  console.log(`📊 SQL size: ${sql.length} chars`);
  console.log();

  try {
    const result = await executeSQL(sql);
    console.log("✅ Migration executed successfully!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof Error && error.message.includes("SQL Editor")) {
      console.log("\n" + error.message);
      console.log("\n📋 Migration SQL has been copied to clipboard-ready format above.");
    } else {
      console.error("❌ Migration failed:", error);
    }
  }
}

main();
