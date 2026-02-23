import React from 'react';

const STEPS = [
  {
    icon: '🔍',
    title: 'Search a county',
    desc: 'Type any US county name to load its Census tracts.',
  },
  {
    icon: '🗂️',
    title: 'Pick a service layer',
    desc: 'Choose Healthcare, Food Access, or Transit to change what infrastructure is measured.',
  },
  {
    icon: '🗺️',
    title: 'Read the map',
    desc: 'Yellow tracts have good access. Purple tracts are "civic deserts" — high need, distant services.',
  },
  {
    icon: '📋',
    title: 'Review worst tracts',
    desc: 'The sidebar lists the 5 most underserved tracts with a breakdown of what drives their score.',
  },
];

const FACTORS = [
  { label: 'Poverty rate', source: 'ACS B17001' },
  { label: 'Population 65+', source: 'ACS B01001' },
  { label: 'No-vehicle households', source: 'ACS B08201' },
];

export function AboutPanel() {
  return (
    <div className="space-y-5 text-sm">
      {/* Intro */}
      <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
        <p className="text-purple-900 font-semibold mb-1">What is this?</p>
        <p className="text-purple-700 text-xs leading-relaxed">
          A <strong>civic desert</strong> is a neighborhood where residents have high social vulnerability but poor access to essential services. This tool quantifies that gap for every Census tract in any US county.
        </p>
      </div>

      {/* How to use */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          How to use
        </p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-lg leading-none mt-0.5">{step.icon}</span>
              <div>
                <p className="font-medium text-gray-800">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Vulnerability factors */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Vulnerability factors
        </p>
        <div className="space-y-1.5">
          {FACTORS.map(({ label, source }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-700">{label}</span>
              <span className="text-xs text-gray-400 font-mono">{source}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Factors are summed (0–3 scale) and divided by the Haversine distance to the nearest service point. Scores are normalized 0–100 within the county.
        </p>
      </div>
    </div>
  );
}
