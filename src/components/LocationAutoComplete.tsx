import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Check, ChevronDown } from 'lucide-react';
import { ConfiguredLocation, DEFAULT_ASSET_LOCATIONS, TmiiRegionName } from '../types';

interface LocationAutoCompleteProps {
  value: string;
  onChange: (value: string, matchedLoc?: ConfiguredLocation) => void;
  configuredLocations?: ConfiguredLocation[];
  locations?: ConfiguredLocation[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: React.ReactNode;
  id?: string;
}

export default function LocationAutoComplete({
  value,
  onChange,
  configuredLocations,
  locations,
  placeholder = 'Ketik atau pilih lokasi aset...',
  required = false,
  className = '',
  label,
  id
}: LocationAutoCompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = id || `loc-autofill-${Math.random().toString(36).substring(2, 9)}`;

  const effectiveLocationsList = locations || configuredLocations || [];

  // Combine configured locations with defaults if empty
  const activeLocations: ConfiguredLocation[] = useMemo(() => {
    if (effectiveLocationsList && effectiveLocationsList.length > 0) {
      return effectiveLocationsList;
    }
    return DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
      id: `default-${idx}`,
      name: loc.name,
      region: loc.region,
      category: loc.category,
      description: loc.description,
      createdAt: ''
    }));
  }, [effectiveLocationsList]);

  // Filter locations based on typed input
  const suggestions = useMemo(() => {
    if (!value || !value.trim()) {
      return activeLocations.slice(0, 30);
    }
    const term = value.toLowerCase().trim();
    return activeLocations.filter(loc => 
      loc.name.toLowerCase().includes(term) ||
      (loc.category && loc.category.toLowerCase().includes(term)) ||
      loc.region.toLowerCase().includes(term)
    );
  }, [activeLocations, value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const exactMatch = activeLocations.find(l => l.name.toLowerCase() === val.trim().toLowerCase());
    onChange(val, exactMatch);
    setIsOpen(true);
  };

  const handleSelectLocation = (loc: ConfiguredLocation) => {
    onChange(loc.name, loc);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={inputId}
          list={`${inputId}-datalist`}
          type="text"
          value={value}
          required={required}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={className || "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs font-bold text-slate-900 pr-8"}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Native HTML datalist for browser fallback & auto fill */}
      <datalist id={`${inputId}-datalist`}>
        {activeLocations.map(loc => (
          <option key={loc.id || loc.name} value={loc.name}>
            {loc.category ? `[${loc.category}] ` : ''}{loc.region}
          </option>
        ))}
      </datalist>

      {/* Custom Floating Dropdown Overlay */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-100 mb-1">
            <span>Pilihan Lokasi ({suggestions.length})</span>
            <span className="text-[9px] font-normal text-amber-700">Bisa diketik bebas</span>
          </div>

          {suggestions.map(loc => {
            const isSelected = value.trim().toLowerCase() === loc.name.toLowerCase();
            return (
              <button
                key={loc.id || loc.name}
                type="button"
                onClick={() => handleSelectLocation(loc)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected ? 'bg-amber-50 text-amber-900 font-extrabold' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MapPin size={13} className={isSelected ? 'text-amber-600 shrink-0' : 'text-slate-400 shrink-0'} />
                  <span className="truncate font-bold">{loc.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {loc.category && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 text-slate-700">
                      {loc.category}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800">
                    {loc.region}
                  </span>
                  {isSelected && <Check size={12} className="text-amber-600 ml-1" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
