// src/app/components/SearchAndFilters.tsx
'use client';

import { useState } from 'react';

interface SearchAndFiltersProps {
  onSearch: (query: string, filters: FilterState, maxVacancies?: number) => void;
  onPaginationSearch?: (query: string, maxPages?: number) => void;
  loading: boolean;
}

interface FilterState {
  source: 'all' | 'geekjob' | 'hh';
  salary: 'all' | 'with-salary' | 'remote';
}

export default function SearchAndFilters({ onSearch, onPaginationSearch, loading }: SearchAndFiltersProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    source: 'all',
    salary: 'all'
  });
  const [maxVacancies, setMaxVacancies] = useState(200);
  const [maxPages, setMaxPages] = useState(5);

  const handleSearch = () => {
    onSearch(query, filters, maxVacancies);
  };

  const handlePaginationSearch = () => {
    if (onPaginationSearch) {
      onPaginationSearch(query, maxPages);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select 
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading}
            >
              <option value="all">Все источники</option>
              <option value="geekjob">Geekjob</option>
              <option value="hh">HH.ru</option>
            </select>
            
            <select 
              value={filters.salary}
              onChange={(e) => handleFilterChange('salary', e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading}
            >
              <option value="all">Все вакансии</option>
              <option value="with-salary">С зарплатой</option>
              <option value="remote">Удаленно</option>
            </select>
            
            <select 
              value={maxVacancies}
              onChange={(e) => setMaxVacancies(parseInt(e.target.value))}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading}
            >
              <option value="50">50 вакансий</option>
              <option value="100">100 вакансий</option>
              <option value="200">200 вакансий</option>
              <option value="500">500 вакансий</option>
            </select>
            
            {onPaginationSearch && (
              <select 
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value))}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                disabled={loading}
              >
                <option value="2">2 страницы</option>
                <option value="5">5 страниц</option>
                <option value="10">10 страниц</option>
                <option value="20">20 страниц</option>
              </select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Поиск...' : 'Найти'}
            </button>
            {onPaginationSearch && (
              <button
                onClick={handlePaginationSearch}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Парсинг...' : 'Все вакансии'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

