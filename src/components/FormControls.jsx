import React from 'react';

/** Baris pengaturan: judul di kiri, keterangan kecil di kanan */
export function Field({ label, hint, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{label}</h3>
        {hint && <span className="text-xs text-mute">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Pilihan tunggal berbentuk deretan chip */
export function Choice({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-paper font-semibold text-ink-950'
                : 'bg-white/5 text-mute hover:bg-white/10 hover:text-paper'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}