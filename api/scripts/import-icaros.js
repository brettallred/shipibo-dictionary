#!/usr/bin/env node

// Import icaros from site/data/icaros.json into D1 via the API
// Usage: ADMIN_TOKEN=xxx API_URL=http://localhost:8787 node api/scripts/import-icaros.js

const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:8787";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("Error: ADMIN_TOKEN environment variable is required");
  process.exit(1);
}

const icarosPath = path.resolve(__dirname, "../../site/data/icaros.json");

if (!fs.existsSync(icarosPath)) {
  console.error("Error: icaros.json not found at", icarosPath);
  process.exit(1);
}

const icaros = JSON.parse(fs.readFileSync(icarosPath, "utf-8"));
console.log(`Found ${icaros.length} icaros in ${icarosPath}`);

async function main() {
  const res = await fetch(`${API_URL}/api/icaros/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify(icaros),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Import failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Import complete: ${result.imported} new, ${result.updated} updated`);
}

main().catch((err) => {
  console.error("Import error:", err.message);
  process.exit(1);
});
