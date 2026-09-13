import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { CROPS_CATALOG, fetchCropsCatalog, type CropInfo } from '../data/agriCatalog';

interface CropSearchSelectProps {
  value: string;
  onChange: (cropName: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

const CATEGORIES = [
  { key: 'all', label: 'सभी (All)' },
  { key: 'Cereals', label: 'अनाज (Cereals)' },
  { key: 'Pulses', label: 'दलहन (Pulses)' },
  { key: 'Oilseeds', label: 'तिलहन (Oilseeds)' },
  { key: 'Commercial', label: 'व्यापारिक (Commercial)' },
  { key: 'Spices', label: 'मसाले (Spices)' },
  { key: 'Vegetables', label: 'सब्जियां (Vegetables)' },
  { key: 'Fruits', label: 'फल (Fruits)' }
];

export const CropSearchSelect: React.FC<CropSearchSelectProps> = ({
  value,
  onChange,
  label = 'Primary Crop / मुख्य फसल',
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cropsList, setCropsList] = useState<CropInfo[]>(CROPS_CATALOG);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic crops from Mandi API with local fallback
  useEffect(() => {
    fetchCropsCatalog().then(data => {
      if (data && data.length > 0) {
        setCropsList(data);
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Find currently selected crop details
  const currentCrop = useMemo(() => {
    if (!value) return null;
    const vLower = value.trim().toLowerCase();
    return cropsList.find(
      c => c.name.toLowerCase() === vLower || 
           c.hindi.toLowerCase() === vLower ||
           c.id === vLower ||
           `${c.name} (${c.hindi})`.toLowerCase() === vLower ||
           vLower.includes(c.name.toLowerCase()) ||
           vLower.includes(c.hindi.toLowerCase())
    );
  }, [value, cropsList]);

  // Filter crops based on search query and category
  const filteredCrops = useMemo(() => {
    let list = cropsList;
    if (selectedCategory !== 'all') {
      list = list.filter(c => c.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        c => c.name.toLowerCase().includes(q) ||
             c.hindi.toLowerCase().includes(q) ||
             c.id.toLowerCase().includes(q) ||
             c.categoryHindi.toLowerCase().includes(q) ||
             (c.market && c.market.toLowerCase().includes(q))
      );
    }
    return list;
  }, [searchQuery, selectedCategory, cropsList]);

  const handleSelect = (crop: CropInfo) => {
    // Store canonical display name with Hindi so both are preserved
    onChange(`${crop.name} (${crop.hindi})`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomCropSelect = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            द्विभाषी खोज (Bilingual Search)
          </span>
        </label>
      )}

      {/* Main Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-left text-xs md:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base">{currentCrop?.icon || '🌾'}</span>
          <span className="font-semibold truncate">
            {currentCrop ? `${currentCrop.name} (${currentCrop.hindi})` : (value || 'फसल चुनें / Select Crop')}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="फसल खोजें (उदा. गेहूं, Mustard, चना, Onion, लहसुन)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 no-scrollbar text-[11px]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crops List */}
          <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-50">
            {filteredCrops.length > 0 ? (
              filteredCrops.map(c => {
                const isSelected = value.includes(c.name) || value.includes(c.hindi) || value === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{c.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{c.name}</span>
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                            {c.hindi}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {c.categoryHindi} &bull; {c.season} {c.benchmark_price ? `• MSP: ₹${c.benchmark_price}/qtl` : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-2">
                  सूची में &ldquo;{searchQuery}&rdquo; नहीं मिली।
                </p>
                <button
                  type="button"
                  onClick={handleCustomCropSelect}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  ➕ कस्टम फसल के रूप में जोड़ें: &ldquo;{searchQuery}&rdquo;
                </button>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>उपलब्ध फसलें: {cropsList.length}</span>
            <span>हिंदी या अंग्रेजी दोनों में खोज सकते हैं</span>
          </div>
        </div>
      )}
    </div>
  );
};
