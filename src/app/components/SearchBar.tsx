'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { POPULAR_QUERIES } from '@/lib/config/popular-queries';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Инициализация из URL
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Обновляем URL
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    router.replace(`?${params.toString()}`);
    
    // Триггерим поиск
    onSearch(searchQuery);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleTagClick = (tag: string) => {
    handleSearch(tag);
  };

  return (
    <div className="bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Поисковый инпут */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск вакансий..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-4 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg placeholder-gray-400 text-gray-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Популярные запросы */}
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500 mb-3">Популярные запросы:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_QUERIES.slice(0, 20).map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 rounded-full text-sm transition-colors"
                disabled={loading}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
