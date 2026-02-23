// build-zip-crosswalk.js
// Run this once after load-news-data.js: node build-zip-crosswalk.js

const https = require('https');
const fs = require('fs');
const readline = require('readline');

// Census Bureau's official ZIP (ZCTA) to County relationship file
// Tab-delimited, no login required
const CENSUS_URL =
  'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt';
const OUTPUT_FILE = 'zip_to_county.json';

function downloadAndParse() {
  return new Promise((resolve, reject) => {
    console.log('Downloading Census ZIP-to-county crosswalk...');

    https.get(CENSUS_URL, (response) => {
      const zipMap = {};
      const rl = readline.createInterface({ input: response });
      let isFirstLine = true;
      let headers = [];

      rl.on('line', (line) => {
        const cols = line.split('|');

        // First line is the header row
        if (isFirstLine) {
          headers = cols;
          isFirstLine = false;
          return;
        }

        const zip = cols[1]?.trim();        // GEOID_ZCTA5_20 — the 5-digit zip
        const countyFIPS = cols[9]?.trim(); // GEOID_COUNTY_20 — the 5-digit county FIPS

        if (!zip || !countyFIPS || zip === 'NA') return;

        // A zip can technically span multiple counties.
        // We pick the FIRST (largest overlap) county for simplicity.
        // The Census file is ordered so the dominant county appears first.
        if (!zipMap[zip]) {
          zipMap[zip] = countyFIPS;
        }
      });

      rl.on('close', () => {
        console.log(`✅ Mapped ${Object.keys(zipMap).length} ZIP codes to counties`);
        resolve(zipMap);
      });

      rl.on('error', reject);
    }).on('error', reject);
  });
}

function saveZipMap(zipMap) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(zipMap, null, 2));
  console.log(`✅ Saved ${OUTPUT_FILE}`);
}

async function main() {
  const zipMap = await downloadAndParse();
  saveZipMap(zipMap);

  // Preview a few entries
  const sample = Object.entries(zipMap).slice(0, 5);
  console.log('\nSample ZIP → County FIPS mappings:');
  sample.forEach(([zip, fips]) => console.log(`  ZIP ${zip} → County FIPS ${fips}`));

  // Sanity check: look up a well-known zip
  console.log('\nSpot checks:');
  console.log('  10001 (Manhattan, NY)  →', zipMap['10001'] || 'not found');
  console.log('  60601 (Chicago, IL)    →', zipMap['60601'] || 'not found');
  console.log('  90210 (Beverly Hills)  →', zipMap['90210'] || 'not found');
}

main().catch(console.error);
