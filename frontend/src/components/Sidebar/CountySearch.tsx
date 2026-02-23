import React, { useRef, useState } from 'react';
import type { County } from '../../types';
import { useCountySearch } from '../../hooks/useCountySearch';

interface Props {
  selectedCounty: County | null;
  onSelect: (county: County) => void;
}

export function CountySearch({ selectedCounty, onSelect }: Props) {
  const { query, setQuery, results, isLoading } = useCountySearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(county: County) {
    onSelect(county);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        County
      </label>

      {selectedCounty && (
        <div className="mb-2 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-purple-900">{selectedCounty.name}</p>
            <p className="text-xs text-purple-600">{selectedCounty.state} · FIPS {selectedCounty.fips}</p>
          </div>
          <button
            onClick={() => onSelect({ fips: '', name: '', state: '', full: '' })}
            className="text-purple-400 hover:text-purple-700 text-lg leading-none ml-2"
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search county…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {isLoading && (
          <span className="absolute right-3 top-2.5 text-gray-400 text-xs">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {results.map((county) => (
            <li key={county.fips}>
              <button
                onMouseDown={() => handleSelect(county)}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{county.name}</p>
                <p className="text-xs text-gray-500">{county.state}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
