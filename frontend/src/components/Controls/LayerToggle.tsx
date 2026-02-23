import React from 'react';
import type { LayerType } from '../../types';

interface Props {
  active: LayerType;
  onChange: (layer: LayerType) => void;
  disabled?: boolean;
}

const LAYERS: Array<{ id: LayerType; label: string; icon: string }> = [
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'food', label: 'Food Access', icon: '🛒' },
  { id: 'transit', label: 'Transit', icon: '🚌' },
  { id: 'news', label: 'Local News', icon: '📰' },
];

export function LayerToggle({ active, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {LAYERS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          disabled={disabled}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
            active === id
              ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-700',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
