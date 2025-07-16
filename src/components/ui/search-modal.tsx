'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { Input } from '@/components/ui/input';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { query, updateQuery, clearSearch, results, isLoading, error, hasResults } = useSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery(e.target.value);
  };

  const handleEventClick = (slug: string) => {
    router.push(`/events/${slug}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center flex-1 space-x-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search markets"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent focus:ring-0 text-base placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
                      <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Search Content */}
      <div className="p-4">

        {/* Search Results */}
        {query.length > 0 && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-destructive text-center bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}

            {!isLoading && !error && !hasResults && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No events found for "{query}"
              </div>
            )}

            {hasResults && !isLoading && (
              <div className="space-y-3">
                {results.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event.slug)}
                    className="w-full flex items-center space-x-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors text-left"
                  >
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
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
    </div>
  );
} 