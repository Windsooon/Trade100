import { useState, useEffect, useCallback } from 'react';

interface SearchEvent {
  id: string;
  title: string;
  slug: string;
  image: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
}

interface SearchResponse {
  events: SearchEvent[];
  tags: Array<{ id: string; label: string; slug: string; event_count: number }>;
  hasMore: boolean;
  error?: string;
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [eventStatus, setEventStatus] = useState<'active' | 'resolved'>('active');
  const [results, setResults] = useState<SearchResponse>({ events: [], tags: [], hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query or event status changes
  useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setResults({ events: [], tags: [], hasMore: false });
      setError(null);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&events_status=${eventStatus}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }
        
        setResults(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        setResults({ events: [], tags: [], hasMore: false });
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, eventStatus]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const updateEventStatus = useCallback((status: 'active' | 'resolved') => {
    setEventStatus(status);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setEventStatus('active'); // Reset to active when clearing
    setResults({ events: [], tags: [], hasMore: false });
    setError(null);
  }, []);

  return {
    query,
    eventStatus,
    updateQuery,
    updateEventStatus,
    clearSearch,
    results: results.events.slice(0, 5), // Limit to 5 results
    isLoading,
    error,
    hasResults: results.events.length > 0
  };
} 