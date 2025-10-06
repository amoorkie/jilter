// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Vacancy } from '@/lib/parsers/unified-parser';
import SearchAndFilters from './components/SearchAndFilters';
import FilterSuggestions from './components/FilterSuggestions';

interface FilterState {
  source: 'all' | 'geekjob' | 'hh';
  salary: 'all' | 'with-salary' | 'remote';
}

export default function Home() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreThreshold, setScoreThreshold] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('javascript');
  const [filters, setFilters] = useState<FilterState>({
    source: 'all',
    salary: 'all'
  });
  
  // Состояние реакций для каждой вакансии
  const [reactions, setReactions] = useState<Record<string, {
    likes: number;
    dislikes: number;
    hearts: number;
    bookmarks: number;
    userReaction: 'likes' | 'dislikes' | 'hearts' | 'bookmarks' | null;
  }>>({});
  
  // Состояние анимаций
  const [animations, setAnimations] = useState<Record<string, string>>({});

  const fetchVacancies = async (query: string, maxVacancies: number = 200) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        q: query,
        maxVacancies: maxVacancies.toString()
      });
      
      console.log(`🔍 Запрос вакансий: ${query}, максимум: ${maxVacancies}`);
      
      const response = await fetch(`/api/vacancies?${params}`);
      const data = await response.json();
      
      if (data.vacancies) {
        setVacancies(data.vacancies);
        console.log(`✅ Получено ${data.vacancies.length} вакансий`);
      } else {
        setError('Не удалось получить вакансии');
        console.error('❌ Ошибка API:', data);
      }
    } catch (err) {
      setError('Ошибка при загрузке вакансий');
      console.error('❌ Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies(currentQuery);
  }, [currentQuery]);

  const handleSearch = (query: string) => {
    setCurrentQuery(query);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleScoreThresholdChange = (threshold: number) => {
    setScoreThreshold(threshold);
  };

  const handleReaction = (vacancyId: string, reactionType: 'likes' | 'dislikes' | 'hearts' | 'bookmarks', event: React.MouseEvent) => {
    setReactions(prev => {
      const current = prev[vacancyId] || { likes: 0, dislikes: 0, hearts: 0, bookmarks: 0, userReaction: null };
      const newReactions = { ...current };
      
      // Если пользователь уже выбрал эту реакцию, убираем её
      if (current.userReaction === reactionType) {
        newReactions[reactionType] = Math.max(0, current[reactionType] - 1);
        newReactions.userReaction = null;
      } else {
        // Если пользователь выбрал другую реакцию, убираем предыдущую и добавляем новую
        if (current.userReaction && current.userReaction !== reactionType) {
          newReactions[current.userReaction] = Math.max(0, current[current.userReaction] - 1);
        }
        newReactions[reactionType] = current[reactionType] + 1;
        newReactions.userReaction = reactionType;
      }
      
      return { ...prev, [vacancyId]: newReactions };
    });

    // Создаем конфетти анимацию
    createConfetti(vacancyId, getReactionEmoji(reactionType), reactionType, event.clientX, event.clientY);
  };

  const getReactionEmoji = (reactionType: string) => {
    switch (reactionType) {
      case 'likes': return '👍';
      case 'dislikes': return '👎';
      case 'hearts': return '❤️';
      case 'bookmarks': return '🔖';
      default: return '👍';
    }
  };

  const createConfetti = (vacancyId: string, emoji: string, reactionType: string, clickX: number, clickY: number) => {
    // Находим конкретную кнопку реакции
    const button = document.querySelector(`[data-vacancy-id="${vacancyId}"][data-reaction="${reactionType}"]`);
    if (!button) return;

    const rect = button.getBoundingClientRect();
    
    // Используем координаты клика относительно кнопки
    const relativeX = clickX - rect.left;
    const relativeY = clickY - rect.top;
    
    // Ограничиваем координаты в пределах кнопки
    const finalX = Math.max(0, Math.min(relativeX, rect.width));
    const finalY = Math.max(0, Math.min(relativeY, rect.height));
    
    // Смещаем точку вылета вверх на 8px для более естественного эффекта
    const startX = rect.left + finalX;
    const startY = rect.top + finalY - 8;

    // Создаем 12 конфетти - 6 влево, 6 вправо
    for (let i = 0; i < 12; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-emoji';
      confetti.textContent = emoji;
      
      // Случайные размеры от 14px до 28px
      const size = Math.random() * 14 + 14;
      confetti.style.fontSize = `${size}px`;
      
      // Позиционируем в точке клика
      confetti.style.left = `${startX}px`;
      confetti.style.top = `${startY}px`;
      
      // Определяем направление (левая или правая половина)
      const isLeft = i < 6;
      confetti.classList.add(isLeft ? 'confetti-left' : 'confetti-right');
      
      // Добавляем случайный поворот для каждой иконки
      const randomRotation = Math.random() * 360;
      confetti.style.transform = `rotate(${randomRotation}deg)`;
      
      // Добавляем небольшую случайную задержку для более естественного эффекта
      const delay = Math.random() * 100;
      confetti.style.animationDelay = `${delay}ms`;
      
      document.body.appendChild(confetti);
      
      // Удаляем элемент после анимации
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 1200);
    }
  };

  const getEmploymentType = (title: string, description?: string) => {
    const text = (title + ' ' + (description || '')).toLowerCase();
    if (text.includes('удаленн') || text.includes('remote')) return 'Удаленно';
    if (text.includes('офис') || text.includes('office')) return 'Офис';
    return 'Гибрид';
  };

  const getGrade = (title: string, description?: string) => {
    const text = (title + ' ' + (description || '')).toLowerCase();
    if (text.includes('senior') || text.includes('сеньор') || text.includes('lead')) return 'Senior';
    if (text.includes('middle') || text.includes('миддл')) return 'Middle';
    if (text.includes('junior') || text.includes('джуниор')) return 'Junior';
    return 'Middle';
  };

  const filteredVacancies = vacancies.filter(vacancy => {
    if (filters.source !== 'all' && vacancy.source !== filters.source) return false;
    if (filters.salary === 'with-salary' && vacancy.salary === 'Не указана') return false;
    if (filters.salary === 'remote') {
      const text = (vacancy.title + ' ' + (vacancy.company || '')).toLowerCase();
      if (!text.includes('удаленн') && !text.includes('remote')) return false;
    }
    return vacancy.score === undefined || vacancy.score >= scoreThreshold;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Job Filter MVP</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Войти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <SearchAndFilters
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <FilterSuggestions 
              userId="anonymous"
              onFilterToggle={() => {}}
            />
          </div>

          {/* Vacancies */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Найдено вакансий: {filteredVacancies.length}
              </h2>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Загрузка вакансий...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVacancies.map((vacancy) => (
                  <div key={vacancy.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {vacancy.companyLogo && (
                          <img 
                            src={vacancy.companyLogo} 
                            alt={vacancy.company}
                            className="w-10 h-10 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <p className="text-sm text-gray-600">{vacancy.company}</p>
                          <p className="text-xs text-gray-500">
                            {new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {vacancy.title}
                    </h3>

                    <div className="mb-4">
                      <p className="text-2xl font-semibold text-gray-900">
                        {typeof vacancy.salary === 'string' 
                          ? vacancy.salary 
                          : vacancy.salary?.min 
                            ? `${vacancy.salary.min.toLocaleString()} - ${vacancy.salary.max?.toLocaleString() || ''} ${vacancy.salary.currency || 'RUB'}`
                            : 'Зарплата не указана'
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {getEmploymentType(vacancy.title)}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {getGrade(vacancy.title)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <button 
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition-colors text-center"
                        onClick={() => window.open(vacancy.url, '_blank')}
                      >
                        Откликнуться
                      </button>

                      <div className="flex justify-center space-x-2">
                        {(['likes', 'dislikes', 'hearts', 'bookmarks'] as const).map((reactionType) => {
                          const reaction = reactions[vacancy.id]?.[reactionType] || 0;
                          const isActive = reactions[vacancy.id]?.userReaction === reactionType;
                          
                          return (
                            <button
                              key={reactionType}
                              data-vacancy-id={vacancy.id}
                              data-reaction={reactionType}
                              onClick={(e) => handleReaction(vacancy.id, reactionType, e)}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                isActive 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {getReactionEmoji(reactionType)} {reaction}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && filteredVacancies.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Вакансии не найдены</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
