import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
}

export default function Select({ label, value, onChange, options, placeholder = 'Select an option' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedLabel = options.find(o => o.value === value)?.label || value || placeholder;
  const isSelected = !!value;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-bold text-stone-700 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-stone-50 border-2 rounded-xl text-left flex justify-between items-center transition-all font-medium
          ${isOpen ? 'border-violet-400 bg-white ring-4 ring-violet-100/50' : 'border-stone-100 text-stone-800 hover:bg-stone-100'}
        `}
      >
        <span className={isSelected ? 'text-stone-800' : 'text-stone-400'}>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left font-medium transition-colors flex items-center justify-between
                ${value === option.value 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-stone-600 hover:bg-emerald-50 hover:text-emerald-600'}
              `}
            >
              {option.label}
              {value === option.value && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
