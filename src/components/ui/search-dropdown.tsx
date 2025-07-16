'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';

export function SearchDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { query, updateQuery, clearSearch, results, isLoading, error, hasResults } = useSearch();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show dropdown when there are results or loading
  useEffect(() => {
    setIsOpen(isFocused && (hasResults || isLoading || query.length > 0));
  }, [isFocused, hasResults, isLoading, query.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery(e.target.value);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleEventClick = (slug: string) => {
    router.push(`/events/${slug}`);
    setIsOpen(false);
    setIsFocused(false);
    clearSearch();
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-[500px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search markets"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {!isLoading && !error && query.length > 0 && !hasResults && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No events found for "{query}"
            </div>
          )}

          {!isLoading && !error && query.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Start typing to search events...
            </div>
          )}

          {hasResults && !isLoading && (
            <div className="py-2">
              {results.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event.slug)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-accent transition-colors duration-150 text-left"
                >
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 