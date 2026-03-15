import dotenv from 'dotenv';
dotenv.config();
import fetch from 'node-fetch';

const baseId = process.env.VITE_AIRTABLE_BASE_ID;
const pat = process.env.VITE_AIRTABLE_PAT;

async function test() {
  const rs = await fetch(`https://api.airtable.com/v0/${baseId}/Deliveries?maxRecords=1`, {
    headers: { Authorization: `Bearer ${pat}` }
  });
  const data = await rs.json();
  console.log("Deliveries rows:", JSON.stringify(data.records, null, 2));
}

test();
