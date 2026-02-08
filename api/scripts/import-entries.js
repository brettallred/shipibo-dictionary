#!/usr/bin/env node

// Import dictionary entries from site/data/entries.json into D1 via the API.
//
// Usage:
//   ADMIN_TOKEN=xxx API_URL=https://shipibo-api.brett-5db.workers.dev node api/scripts/import-entries.js
//
// For local dev:
//   ADMIN_TOKEN=xxx API_URL=http://localhost:8787 node api/scripts/import-entries.js

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTRIES_PATH = resolve(__dirname, "../../site/data/entries.json");

const API_URL = process.env.API_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!API_URL || !ADMIN_TOKEN) {
  console.error("Usage: ADMIN_TOKEN=xxx API_URL=http://... node api/scripts/import-entries.js");
  process.exit(1);
}

const entries = JSON.parse(readFileSync(ENTRIES_PATH, "utf-8"));
console.log(`Loaded ${entries.length} entries from ${ENTRIES_PATH}`);

// Import in batches to avoid request size limits
const BATCH_SIZE = 50;
let totalImported = 0;
let totalUpdated = 0;

const START_AT = parseInt(process.env.START_AT || "0", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = START_AT; i < entries.length; i += BATCH_SIZE) {
  const batch = entries.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${API_URL}/api/entries/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    console.error(`Batch ${i}-${i + batch.length} failed:`, res.status, await res.text());
    process.exit(1);
  }

  const result = await res.json();
  totalImported += result.imported;
  totalUpdated += result.updated;
  console.log(`Batch ${i}-${i + batch.length}: ${result.imported} imported, ${result.updated} updated`);
  await sleep(500);
}

console.log(`Done! Total: ${totalImported} imported, ${totalUpdated} updated`);
