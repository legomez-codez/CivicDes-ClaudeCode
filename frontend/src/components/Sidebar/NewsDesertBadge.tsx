import React, { useState } from 'react';
import type { NewsScore } from '../../hooks/useNewsScore';

interface Props {
  score: NewsScore;
  isLoading: boolean;
}

// Map score (0–10) to a filled pip count out of 5
function pips(score: number): number {
  return Math.round(score / 2);
}

export function NewsDesertBadge({ score, isLoading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse h-14 bg-gray-100 rounded-lg" />
    );
  }

  const filled = pips(score.score);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">📰</span>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-gray-700 leading-tight">
              Local News Coverage
            </p>
            <p
              className="text-xs font-bold leading-tight"
              style={{ color: score.color }}
            >
              {score.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Score pips */}
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: i < filled ? score.color : '#e5e7eb',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 w-6 text-right">
            {score.score}/10
          </span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 text-xs text-gray-600 space-y-2 border-t border-gray-100 bg-white">
          <p className="text-gray-500">{score.explanation}</p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-center">
            <div className="bg-gray-50 rounded p-1.5">
              <p className="font-bold text-gray-800 text-sm">{score.outlet_count}</p>
              <p className="text-gray-400" style={{ fontSize: '10px' }}>outlets</p>
            </div>
            <div className="bg-gray-50 rounded p-1.5">
              <p className="font-bold text-gray-800 text-sm">{score.outlets_per_100k}</p>
              <p className="text-gray-400" style={{ fontSize: '10px' }}>per 100k</p>
            </div>
            <div className="bg-gray-50 rounded p-1.5">
              <p className="font-bold text-gray-800 text-sm">
                {score.population > 0 ? (score.population / 1_000_000).toFixed(1) + 'M' : '—'}
              </p>
              <p className="text-gray-400" style={{ fontSize: '10px' }}>residents</p>
            </div>
          </div>
          <p className="text-gray-400" style={{ fontSize: '10px' }}>
            Source: sTechLab Local News Dataset · Census ACS 2022
          </p>
        </div>
      )}
    </div>
  );
}
