'use client';

import { useState } from 'react';
import { Employment, EMPLOYMENT_LABELS } from '@/lib/types/employment';

interface EmploymentFilterProps {
  selectedEmployment: Employment[];
  onEmploymentChange: (employment: Employment[]) => void;
}

export default function EmploymentFilter({ 
  selectedEmployment, 
  onEmploymentChange 
}: EmploymentFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (employment: Employment) => {
    console.log(`🔍 Фильтр занятости: клик по ${employment}`);
    if (selectedEmployment.includes(employment)) {
      const newSelection = selectedEmployment.filter(e => e !== employment);
      console.log(`🔍 Убираем ${employment}, новый выбор: [${newSelection.join(', ')}]`);
      onEmploymentChange(newSelection);
    } else {
      const newSelection = [...selectedEmployment, employment];
      console.log(`🔍 Добавляем ${employment}, новый выбор: [${newSelection.join(', ')}]`);
      onEmploymentChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allEmployment: Employment[] = ['full_time', 'part_time', 'project', 'contract', 'internship', 'temporary', 'freelance', 'remote'];
    onEmploymentChange(allEmployment);
  };

  const handleClearAll = () => {
    onEmploymentChange([]);
  };

  return (
    <div className="bg-white rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Тип занятости</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Все
          </button>
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Очистить
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(EMPLOYMENT_LABELS).map(([key, label]) => {
          const employment = key as Employment;
          const isSelected = selectedEmployment.includes(employment);
          
          return (
            <label key={employment} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(employment)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                {label}
              </span>
            </label>
          );
        })}
      </div>

      {selectedEmployment.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {selectedEmployment.map(employment => (
              <span
                key={employment}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {EMPLOYMENT_LABELS[employment]}
                <button
                  onClick={() => handleToggle(employment)}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                >
                  <span className="sr-only">Удалить</span>
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                    <path d="M5.5 3.5L4.5 2.5L3.5 3.5L2.5 2.5L1.5 3.5L2.5 4.5L1.5 5.5L2.5 6.5L3.5 5.5L4.5 6.5L5.5 5.5L4.5 4.5L5.5 3.5Z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}