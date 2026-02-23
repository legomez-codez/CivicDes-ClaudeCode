// news-desert-score.js
// Core scoring module — import this into your app wherever you need it

const fs = require('fs');
const path = require('path');

// Load both lookup files into memory once at startup (fast, no repeated disk reads)
const zipToCounty = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'zip_to_county.json'), 'utf8')
);
const countyNewsCounts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'county_news_counts.json'), 'utf8')
);

// County population data from Census (ACS 2020 estimates)
// For a full app, replace this with a real census population lookup.
// Here we use a fallback average so scoring still works without it.
const FALLBACK_COUNTY_POPULATION = 100000;

// You can optionally load a real county population file like this:
// const countyPopulation = JSON.parse(fs.readFileSync('county_populations.json', 'utf8'));
// Then use: countyPopulation[countyFIPS] || FALLBACK_COUNTY_POPULATION

/**
 * Calculate a news desert score for a given ZIP code.
 * Returns an object with score, label, color, and explanation.
 */
function getNewsDesertScore(zip) {
  const cleanZip = String(zip).trim().padStart(5, '0');

  // Step 1: ZIP → County FIPS
  const countyFIPS = zipToCounty[cleanZip];
  if (!countyFIPS) {
    return {
      score: null,
      label: 'Unknown',
      color: 'gray',
      explanation: `ZIP code ${cleanZip} could not be matched to a county.`,
      outletCount: null,
      countyFIPS: null,
    };
  }

  // Step 2: County FIPS → outlet count
  const outletCount = countyNewsCounts[countyFIPS] || 0;

  // Step 3: Calculate outlets per 100k residents
  // Replace FALLBACK_COUNTY_POPULATION with real census data for better accuracy
  const population = FALLBACK_COUNTY_POPULATION;
  const outletsPer100k = (outletCount / population) * 100000;

  // Step 4: Score on a 0–10 scale
  const { score, label, color } = calculateScore(outletCount, outletsPer100k);

  // Step 5: Build a plain-English explanation
  const explanation = buildExplanation(cleanZip, outletCount, score, label);

  return {
    score,
    label,
    color,
    explanation,
    outletCount,
    countyFIPS,
    outletsPer100k: Math.round(outletsPer100k * 10) / 10,
  };
}

/**
 * Scoring logic — combines raw outlet count AND outlets-per-capita.
 * Using both prevents a huge county with 5 outlets from scoring the same
 * as a tiny county with 5 outlets.
 */
function calculateScore(outletCount, outletsPer100k) {
  if (outletCount === 0) {
    return { score: 0, label: 'Full News Desert', color: '#d32f2f' }; // deep red
  }
  if (outletCount === 1 || outletsPer100k < 1) {
    return { score: 2, label: 'Severe Desert', color: '#e64a19' };    // red-orange
  }
  if (outletsPer100k < 2) {
    return { score: 4, label: 'At Risk', color: '#f57c00' };          // orange
  }
  if (outletsPer100k < 4) {
    return { score: 6, label: 'Underserved', color: '#fbc02d' };      // yellow
  }
  if (outletsPer100k < 8) {
    return { score: 8, label: 'Adequately Served', color: '#388e3c' };// green
  }
  return { score: 10, label: 'Well Served', color: '#1976d2' };       // blue
}

/**
 * Human-readable explanation for display in your app UI.
 */
function buildExplanation(zip, outletCount, score, label) {
  if (outletCount === 0) {
    return `ZIP ${zip} is in a full news desert — no local news outlets were found in this county.`;
  }
  if (score <= 2) {
    return `ZIP ${zip} has only ${outletCount} local news outlet(s) in its county. This area is severely underserved and at high risk.`;
  }
  if (score <= 4) {
    return `ZIP ${zip} has ${outletCount} local news outlet(s) in its county. Coverage is thin relative to the population size.`;
  }
  if (score <= 6) {
    return `ZIP ${zip} has ${outletCount} local news outlet(s) in its county. Some coverage exists but the area is underserved.`;
  }
  if (score <= 8) {
    return `ZIP ${zip} has ${outletCount} local news outlet(s) in its county. Local news coverage appears adequate.`;
  }
  return `ZIP ${zip} has ${outletCount} local news outlet(s) in its county. This area is well served by local news.`;
}

module.exports = { getNewsDesertScore };


// ─── Quick test: run directly with `node news-desert-score.js` ───────────────
if (require.main === module) {
  const testZips = ['10001', '60601', '90210', '59801', '73942'];

  console.log('News Desert Score Test\n' + '─'.repeat(50));
  testZips.forEach((zip) => {
    const result = getNewsDesertScore(zip);
    console.log(`\nZIP: ${zip}`);
    console.log(`  Score:       ${result.score ?? 'N/A'} / 10`);
    console.log(`  Label:       ${result.label}`);
    console.log(`  Outlets:     ${result.outletCount ?? 'N/A'}`);
    console.log(`  Per 100k:    ${result.outletsPer100k ?? 'N/A'}`);
    console.log(`  Explanation: ${result.explanation}`);
  });
}
