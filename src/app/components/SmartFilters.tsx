'use client';

import React, { useState, useEffect } from 'react';
import { Employment, Specialization, EMPLOYMENT_LABELS, SPECIALIZATION_LABELS } from '@/lib/types/employment';

interface SmartFiltersProps {
  onFiltersChange: (filters: SmartFilterState) => void;
  queryAnalysis?: any;
  recommendations?: any;
  appliedFilters?: string[];
  suggestedFilters?: string[];
}

interface SmartFilterState {
  specialization: Specialization[];
  employment: Employment[];
  experience: string[];
  technologies: string[];
  minSalary?: number;
  maxSalary?: number;
  remote?: boolean;
}

export default function SmartFilters({
  onFiltersChange,
  queryAnalysis,
  recommendations,
  appliedFilters = [],
  suggestedFilters = []
}: SmartFiltersProps) {
  const [filters, setFilters] = useState<SmartFilterState>({
    specialization: [],
    employment: [],
    experience: [],
    technologies: []
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Применяем фильтры при изменении
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // Автоматически применяем фильтры из анализа запроса
  useEffect(() => {
    if (queryAnalysis) {
      setFilters(prev => ({
        ...prev,
        specialization: queryAnalysis.specialization || [],
        employment: queryAnalysis.employment || [],
        experience: queryAnalysis.experience || [],
        technologies: queryAnalysis.technologies || [],
        remote: queryAnalysis.remote
      }));
    }
  }, [queryAnalysis]);

  const handleSpecializationChange = (spec: Specialization, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      specialization: checked
        ? [...prev.specialization, spec]
        : prev.specialization.filter(s => s !== spec)
    }));
  };

  const handleEmploymentChange = (emp: Employment, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      employment: checked
        ? [...prev.employment, emp]
        : prev.employment.filter(e => e !== emp)
    }));
  };

  const handleExperienceChange = (exp: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      experience: checked
        ? [...prev.experience, exp]
        : prev.experience.filter(e => e !== exp)
    }));
  };

  const handleTechnologyChange = (tech: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      technologies: checked
        ? [...prev.technologies, tech]
        : prev.technologies.filter(t => t !== tech)
    }));
  };

  const handleSalaryChange = (field: 'minSalary' | 'maxSalary', value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value ? parseInt(value) : undefined
    }));
  };

  const handleRemoteChange = (remote: boolean) => {
    setFilters(prev => ({
      ...prev,
      remote
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      specialization: [],
      employment: [],
      experience: [],
      technologies: []
    });
  };

  const applySuggestedFilter = (filter: string) => {
    // Простая логика применения предложенных фильтров
    if (filter.includes('Специализация:')) {
      const spec = filter.replace('Специализация: ', '') as Specialization;
      if (Object.values(SPECIALIZATION_LABELS).includes(spec)) {
        handleSpecializationChange(spec, true);
      }
    } else if (filter.includes('Технология:')) {
      const tech = filter.replace('Технология: ', '');
      handleTechnologyChange(tech, true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🧠 Умные фильтры
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>

      {/* Примененные фильтры */}
      {appliedFilters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Примененные фильтры:</h4>
          <div className="flex flex-wrap gap-2">
            {appliedFilters.map((filter, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {filter}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Предложенные фильтры */}
      {suggestedFilters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Рекомендуемые фильтры:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestedFilters.map((filter, index) => (
              <button
                key={index}
                onClick={() => applySuggestedFilter(filter)}
                className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
              >
                + {filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-6">
          {/* Специализация */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Специализация</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SPECIALIZATION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.specialization.includes(key as Specialization)}
                    onChange={(e) => handleSpecializationChange(key as Specialization, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Тип занятости */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Тип занятости</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EMPLOYMENT_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.employment.includes(key as Employment)}
                    onChange={(e) => handleEmploymentChange(key as Employment, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Опыт */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Уровень опыта</h4>
            <div className="grid grid-cols-2 gap-2">
              {['junior', 'middle', 'senior', 'lead'].map((exp) => (
                <label key={exp} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.experience.includes(exp)}
                    onChange={(e) => handleExperienceChange(exp, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{exp}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Технологии */}
          {recommendations?.toLearn && recommendations.toLearn.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Популярные технологии</h4>
              <div className="flex flex-wrap gap-2">
                {recommendations.toLearn.map((tech: string, index: number) => (
                  <label key={index} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.technologies.includes(tech)}
                      onChange={(e) => handleTechnologyChange(tech, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{tech}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Зарплата */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Зарплата (руб.)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">От</label>
                <input
                  type="number"
                  value={filters.minSalary || ''}
                  onChange={(e) => handleSalaryChange('minSalary', e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">До</label>
                <input
                  type="number"
                  value={filters.maxSalary || ''}
                  onChange={(e) => handleSalaryChange('maxSalary', e.target.value)}
                  placeholder="200000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Удаленная работа */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Удаленная работа</h4>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="remote"
                  checked={filters.remote === true}
                  onChange={() => handleRemoteChange(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Да</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="remote"
                  checked={filters.remote === false}
                  onChange={() => handleRemoteChange(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Нет</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="remote"
                  checked={filters.remote === undefined}
                  onChange={() => handleRemoteChange(undefined as any)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Не важно</span>
              </label>
            </div>
          </div>

          {/* Карьерные рекомендации */}
          {recommendations?.careerPath && recommendations.careerPath.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Карьерный путь</h4>
              <div className="bg-blue-50 p-3 rounded-md">
                {recommendations.careerPath.map((path: string, index: number) => (
                  <div key={index} className="text-sm text-blue-800 mb-1">
                    {path}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопки управления */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Очистить все
            </button>
            <div className="text-sm text-gray-500">
              Активных фильтров: {Object.values(filters).flat().filter(Boolean).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



