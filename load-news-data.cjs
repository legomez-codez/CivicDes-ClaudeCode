// load-news-data.js
// Run this once: node load-news-data.js

const https = require('https');
const fs = require('fs');
const csv = require('csv-parser'); // npm install csv-parser

const CSV_URL =
  'https://raw.githubusercontent.com/sTechLab/local-news-dataset/main/local_news_outlets_dataset.csv';
const OUTPUT_FILE = 'news_outlets.csv';

// Step 1: Download the CSV
function downloadCSV() {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(OUTPUT_FILE);
    https.get(CSV_URL, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ CSV downloaded');
        resolve();
      });
    }).on('error', reject);
  });
}

// Step 2: Parse it into a county-level lookup object
// { "06037": 42, "17031": 18, ... }  ← CountyFIPS → outlet count
function parseCSVToCountyMap() {
  return new Promise((resolve, reject) => {
    const countyMap = {};

    fs.createReadStream(OUTPUT_FILE)
      .pipe(csv())
      .on('data', (row) => {
        const fips = row['CountyFIPS'];
        // Skip rows with no county data
        if (!fips || fips === 'NA' || fips === 'non-US') return;

        countyMap[fips] = (countyMap[fips] || 0) + 1;
      })
      .on('end', () => {
        console.log(`✅ Parsed ${Object.keys(countyMap).length} counties`);
        resolve(countyMap);
      })
      .on('error', reject);
  });
}

// Step 3: Save the county map as JSON for fast lookups in your app
function saveCountyMap(countyMap) {
  fs.writeFileSync('county_news_counts.json', JSON.stringify(countyMap, null, 2));
  console.log('✅ Saved county_news_counts.json');
}

// Run it
async function main() {
  await downloadCSV();
  const countyMap = await parseCSVToCountyMap();
  saveCountyMap(countyMap);

  // Preview: show the top 5 counties by outlet count
  const sorted = Object.entries(countyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log('\nTop 5 counties by outlet count:');
  sorted.forEach(([fips, count]) => console.log(`  FIPS ${fips}: ${count} outlets`));
}

main().catch(console.error);
