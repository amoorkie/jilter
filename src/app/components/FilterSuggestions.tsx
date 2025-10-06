// src/app/components/FilterSuggestions.tsx
'use client';

import { useState, useEffect } from 'react';

interface FilterSuggestion {
  token_id: number;
  phrase_norm: string;
  hides_count: number;
  unique_users: number;
  recommendation_strength: number;
}

interface FilterSuggestionsProps {
  userId: string;
  onFilterToggle: (tokenId: number, action: 'hide' | 'show') => void;
}

export default function FilterSuggestions({ userId, onFilterToggle }: FilterSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilters, setUserFilters] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchSuggestions();
    fetchUserFilters();
  }, [userId]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/filter-suggestions?minUsers=50');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFilters = async () => {
    try {
      const response = await fetch(`/api/user-filters?userId=${userId}`);
      const data = await response.json();
      const activeFilters = new Set(
        data.filters
          .filter((f: any) => f.action === 'hide')
          .map((f: any) => f.token_id)
      );
      setUserFilters(activeFilters as Set<number>);
    } catch (error) {
      console.error('Ошибка загрузки фильтров пользователя:', error);
    }
  };

  const handleToggleFilter = async (tokenId: number) => {
    const isActive = userFilters.has(tokenId);
    const action = isActive ? 'show' : 'hide';

    try {
      const response = await fetch('/api/user-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: tokenId,
          action,
          user_id: userId
        })
      });

      if (response.ok) {
        const newFilters = new Set(userFilters);
        if (isActive) {
          newFilters.delete(tokenId);
        } else {
          newFilters.add(tokenId);
        }
        setUserFilters(newFilters);
        onFilterToggle(tokenId, action);
      }
    } catch (error) {
      console.error('Ошибка переключения фильтра:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Рекомендуемые фильтры</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Рекомендуемые фильтры</h3>
        <p className="text-gray-500">Нет рекомендаций для отображения</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Рекомендуемые слова для скрытия</h3>
      <p className="text-sm text-gray-600 mb-4">
        Эти фразы часто встречаются в плохих вакансиях
      </p>
      
      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const isActive = userFilters.has(suggestion.token_id);
          const strength = Math.min(5, suggestion.recommendation_strength);
          
          return (
            <div
              key={suggestion.token_id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                isActive
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    "{suggestion.phrase_norm}"
                  </span>
                  <div className="flex space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < strength ? 'bg-red-400' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Скрыли {suggestion.unique_users} пользователей
                </p>
              </div>
              
              <button
                onClick={() => handleToggleFilter(suggestion.token_id)}
                className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isActive ? 'Скрыто' : 'Скрыть'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

