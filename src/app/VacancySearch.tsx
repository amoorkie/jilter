// src/app/VacancySearch.tsx
'use client';

import { useState, useEffect } from 'react';
// Удаляем импорт fetchVacancies, будем использовать API route
import SearchForm from './components/SearchForm';

interface Vacancy {
  id: string;
  title: string;
  salary: string | { min?: number; max?: number; currency?: string };
  company: string;
  url: string;
  companyLogo?: string;
  companyUrl?: string;
}

export default function VacancySearch() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('javascript');
  const [currentSalaryFilter, setCurrentSalaryFilter] = useState(true);

  const handleSearch = async (query: string, salaryFilter: boolean) => {
    setLoading(true);
    setError(null);
    setCurrentQuery(query);
    setCurrentSalaryFilter(salaryFilter);
    
    console.log('🔍 Поиск вакансий через парсер:', { query, salaryFilter });
    
    try {
      const url = `/api/parse-vacancies?query=${encodeURIComponent(query)}&salary=${salaryFilter}`;
      console.log('📡 Запрос к API парсера:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Ответ API парсера:', { status: response.status, data });
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при парсинге вакансий');
      }
      
      console.log('✅ Найдено вакансий:', data.vacancies?.length || 0);
      setVacancies(data.vacancies);
    } catch (err) {
      console.error('❌ Ошибка парсинга:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при парсинге вакансий');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем вакансии при первом рендере
  useEffect(() => {
    handleSearch('javascript', true);
  }, []);

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🔍 Фильтр вакансий
        </h1>
        <p className="text-gray-600 text-lg">Найдите работу своей мечты</p>
      </div>

      <SearchForm 
        onSearch={handleSearch}
        initialQuery={currentQuery}
        initialSalaryFilter={currentSalaryFilter}
      />

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Парсим вакансии с HH.ru...</p>
          <p className="mt-2 text-sm text-gray-500">Это может занять 10-30 секунд</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && vacancies.length > 0 && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-lg font-semibold text-green-800">
              ✅ Найдено вакансий: {vacancies.length}
            </p>
            <p className="text-sm text-green-600 mt-1">
              По запросу: "{currentQuery}" {currentSalaryFilter ? '(с зарплатой)' : '(все вакансии)'}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                {/* Заголовок карточки */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {vacancy.title}
                    </h2>
                    {vacancy.companyLogo && (
                      <img 
                        src={vacancy.companyLogo} 
                        alt={vacancy.company}
                        className="w-12 h-12 rounded-lg object-cover ml-3 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <span className="text-lg font-bold text-green-600">
                      {typeof vacancy.salary === 'string' 
                        ? vacancy.salary 
                        : vacancy.salary?.min 
                          ? `${vacancy.salary.min.toLocaleString()} - ${vacancy.salary.max?.toLocaleString() || ''} ${vacancy.salary.currency || 'RUB'}`
                          : 'Зарплата не указана'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium">{vacancy.company}</span>
                    {vacancy.companyUrl && (
                      <a 
                        href={vacancy.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        👁️
                      </a>
                    )}
                  </div>
                </div>

                {/* Основная информация */}
                <div className="p-6 space-y-4">
                  {/* Дополнительная информация */}
                  <div className="text-sm text-gray-500">
                    <p>ID: {vacancy.id}</p>
                  </div>

                  {/* Кнопки действий */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <a 
                        href={vacancy.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        🚀 Откликнуться
                      </a>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        ❤️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && vacancies.length === 0 && (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">😔</div>
          <h2 className="text-3xl font-bold text-gray-700 mb-4">Нет вакансий</h2>
          <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
            По запросу "{currentQuery}" не найдено вакансий {currentSalaryFilter ? 'с указанной зарплатой' : ''}.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              💡 Попробуйте изменить поисковый запрос или отключить фильтр по зарплате.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
