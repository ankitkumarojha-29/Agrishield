import React, { useState, useEffect } from 'react';
import { SOIL_TYPES_CATALOG, fetchSoilTypesCatalog, type SoilTypeInfo } from '../data/agriCatalog';

interface SoilTypeSelectProps {
  value: string;
  onChange: (soilType: string) => void;
  label?: string;
  className?: string;
}

export const SoilTypeSelect: React.FC<SoilTypeSelectProps> = ({
  value,
  onChange,
  label = 'Soil Type / मिट्टी का प्रकार',
  className = ''
}) => {
  const [soilsList, setSoilsList] = useState<SoilTypeInfo[]>(SOIL_TYPES_CATALOG);

  // Fetch dynamic soils from API with local fallback
  useEffect(() => {
    fetchSoilTypesCatalog().then(data => {
      if (data && data.length > 0) {
        setSoilsList(data);
      }
    });
  }, []);

  // Find currently selected soil to show its agronomic suitability hint
  const currentSoil = soilsList.find(
    s => s.name.toLowerCase() === (value || '').toLowerCase() ||
         s.id === (value || '').toLowerCase() ||
         s.hindi === value ||
         s.label === value
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            {soilsList.length}+ भारतीय मिट्टी किस्में (ICAR)
          </span>
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer shadow-2xs"
      >
        {soilsList.map(soil => (
          <option key={soil.id} value={soil.name}>
            {soil.name} — {soil.hindi}
          </option>
        ))}
      </select>
      {currentSoil && currentSoil.description && (
        <p className="text-[11px] text-slate-500 mt-1 pl-1 italic">
          🌱 {currentSoil.description}
        </p>
      )}
    </div>
  );
};
