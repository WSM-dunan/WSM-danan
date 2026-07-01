import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface LocationSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  locations: string[];
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  locations,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = locations.filter((loc) =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block w-full min-w-[110px]" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full text-left border border-slate-200 px-2 py-1.5 text-[11px] rounded bg-white flex justify-between items-center hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate font-semibold text-slate-700">{value || 'เลือก Location'}</span>
        <span className="text-[8px] text-slate-400 ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 w-44 p-1.5 space-y-1">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาตำแหน่ง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 pl-6 pr-2 py-1 text-[10px] rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <Search className="w-3 h-3 absolute left-1.5 top-1.5 text-slate-400" />
          </div>

          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-2 text-[10px] text-slate-400 text-center">ไม่พบตำแหน่งจัดเก็บ</div>
            ) : (
              filtered.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    onChange(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-50 transition-colors block ${
                    loc === value ? 'bg-blue-50 font-bold text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {loc}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
