// src/app/components/SearchForm.tsx
'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSearch: (query: string, salaryFilter: boolean) => void;
  initialQuery?: string;
  initialSalaryFilter?: boolean;
}

export default function SearchForm({ 
  onSearch, 
  initialQuery = '', 
  initialSalaryFilter = true 
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [salaryFilter, setSalaryFilter] = useState(initialSalaryFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, salaryFilter);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Поисковый запрос
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите ключевые слова (например: React, Python, дизайнер)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={salaryFilter}
              onChange={(e) => setSalaryFilter(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Только вакансии с указанной зарплатой
            </span>
          </label>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          🔍 Найти вакансии
        </button>
      </form>
    </div>
  );
}

