'use client';

import type { ReactNode } from 'react';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'select' | 'date';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export function ListFilters({
  fields,
  values,
  onChange,
  onSubmit,
  onReset,
  extra,
}: {
  fields: Field[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="card filter-bar" style={{ marginBottom: 14 }}>
      <div className="filter-grid">
        {fields.map((field) => (
          <label key={field.name} className="label">
            {field.label}
            {field.type === 'select' ? (
              <select className="input" value={values[field.name] ?? ''} onChange={(e) => onChange(field.name, e.target.value)}>
                <option value="">All</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={field.type ?? 'text'}
                value={values[field.name] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            )}
          </label>
        ))}
        {extra}
      </div>
      <div className="stack-inline" style={{ marginTop: 12 }}>
        <button type="button" className="button" onClick={onSubmit}>
          Apply filters
        </button>
        <button type="button" className="button button-secondary" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
