'use client';

import { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder: string;
  onSearch: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder, onSearch, onFocus, onBlur }, ref) => (
    <div className="relative flex items-center w-[360px]">
      <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-500 -translate-y-1/2 pointer-events-none" />
      <input
        ref={ref}
        type="text"
        className="bg-white focus:shadow-neumorphic-button-hover py-2 pr-3 pl-9 rounded-full focus:outline-none w-full h-9 text-sm transition-shadow"
        placeholder={placeholder}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  )
);

SearchInput.displayName = 'SearchInput';
