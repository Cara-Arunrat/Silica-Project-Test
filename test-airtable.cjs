require('dotenv').config();
const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.VITE_AIRTABLE_PAT }).base(process.env.VITE_AIRTABLE_BASE_ID);

base('Users').select({ maxRecords: 3 }).firstPage((err, records) => {
  if (err) {
    console.error('Error fetching Users table:', err.message);
    return;
  }
  console.log('Success! Found Users:', records.length);
  records.forEach((r, i) => console.log(`Row ${i}:`, r.fields));
});
