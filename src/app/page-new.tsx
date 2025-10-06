// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar from './components/SearchBar';
import SpecializationTabs from './components/SpecializationTabs';
import EmploymentFilter from './components/EmploymentFilter';
import FilterSuggestions from './components/FilterSuggestions';
import { Vacancy } from '@/lib/parsers/unified-parser';
import { Employment, Specialization } from '@/lib/types/employment';

// Используем интерфейс из unified-parser

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
  const [currentSpecialization, setCurrentSpecialization] = useState<Specialization>('frontend');
  const [currentEmployment, setCurrentEmployment] = useState<Employment[]>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  const fetchVacancies = async (query: string, specialization: Specialization, employment: Employment[]) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        q: query,
        specialization,
        scoreMin: scoreThreshold.toString()
      });
      
      if (employment.length > 0) {
        params.set('employment', employment.join(','));
      }
      
      const response = await fetch(`/api/vacancies?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке вакансий');
      }
      
      setVacancies(data.items || []);
      setCurrentQuery(query);
      setCurrentSpecialization(specialization);
      setCurrentEmployment(employment);
    } catch (err) {
      console.error('Ошибка загрузки вакансий:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке вакансий');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    fetchVacancies(query, currentSpecialization, currentEmployment);
  };

  const handleSpecializationChange = (specialization: Specialization) => {
    setCurrentSpecialization(specialization);
    fetchVacancies(currentQuery, specialization, currentEmployment);
  };

  const handleEmploymentChange = (employment: Employment[]) => {
    setCurrentEmployment(employment);
    fetchVacancies(currentQuery, currentSpecialization, employment);
  };

  const handlePaginationSearch = async (query: string, maxPages?: number) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentQuery(query);
      
      const url = `/api/parse-vacancies-pagination?query=${encodeURIComponent(query)}${maxPages ? `&maxPages=${maxPages}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке вакансий с пагинацией');
      }

      setVacancies(data.vacancies);
      
      console.log(`🎉 Загружено ${data.vacancies.length} вакансий с ${data.sources.geekjob} от Geekjob и ${data.sources.hh} от HH.ru`);
    } catch (err) {
      console.error('Ошибка загрузки вакансий с пагинацией:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке вакансий с пагинацией');
    } finally {
      setLoading(false);
    }
  };

  // Функция для определения типа занятости
  const getEmploymentType = (vacancy: Vacancy) => {
    const title = vacancy.title.toLowerCase();
    const description = typeof vacancy.salary === 'string' ? vacancy.salary.toLowerCase() : '';
    
    if (title.includes('удаленн') || title.includes('remote') || description.includes('удаленн')) {
      return 'удалённо';
    }
    if (title.includes('офис') || title.includes('office')) {
      return 'офис';
    }
    if (title.includes('гибрид') || title.includes('hybrid')) {
      return 'гибрид';
    }
    return 'удалённо'; // по умолчанию
  };

  // Функция для определения грейда
  const getGrade = (vacancy: Vacancy) => {
    const title = vacancy.title.toLowerCase();
    
    if (title.includes('senior') || title.includes('сеньор') || title.includes('ведущий')) {
      return 'senior';
    }
    if (title.includes('middle') || title.includes('мидл') || title.includes('средний')) {
      return 'middle';
    }
    if (title.includes('junior') || title.includes('джуниор') || title.includes('младший')) {
      return 'junior';
    }
    if (title.includes('lead') || title.includes('лид') || title.includes('руководитель')) {
      return 'lead';
    }
    return 'middle'; // по умолчанию
  };

  // Функция для создания конфетти
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

  // Функция для обработки реакций
  const handleReaction = (vacancyId: string, reactionType: 'likes' | 'dislikes' | 'hearts' | 'bookmarks', event: React.MouseEvent) => {
    // Эмодзи для конфетти
    const emojiMap = {
      likes: '👍',
      dislikes: '👎',
      hearts: '❤️',
      bookmarks: '🔖'
    };

    // Получаем координаты клика
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Создаем конфетти с координатами клика
    createConfetti(vacancyId, emojiMap[reactionType], reactionType, clickX, clickY);

    setReactions(prev => {
      const currentReactions = prev[vacancyId] || {
        likes: 0,
        dislikes: 0,
        hearts: 0,
        bookmarks: 0,
        userReaction: null
      };

      const newReactions = { ...currentReactions };

      // Если пользователь уже выбрал эту реакцию, убираем её
      if (currentReactions.userReaction === reactionType) {
        newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
        newReactions.userReaction = null;
      } else {
        // Если была другая реакция, убираем её
        if (currentReactions.userReaction && currentReactions.userReaction !== reactionType) {
          newReactions[currentReactions.userReaction] = Math.max(0, newReactions[currentReactions.userReaction] - 1);
        }
        
        // Добавляем новую реакцию
        newReactions[reactionType] = newReactions[reactionType] + 1;
        newReactions.userReaction = reactionType;
      }

      return {
        ...prev,
        [vacancyId]: newReactions
      };
    });
  };

  const applyFilters = (vacancies: Vacancy[], filters: FilterState) => {
    return vacancies.filter(vacancy => {
      // Фильтр по источнику
      if (filters.source !== 'all' && vacancy.source !== filters.source) {
        return false;
      }
      
      // Фильтр по зарплате
      if (filters.salary === 'with-salary' && vacancy.salary === 'Не указана') {
        return false;
      }
      
      // Фильтр по удаленной работе (пока не реализован, так как нет данных)
      // if (filters.salary === 'remote' && !vacancy.isRemote) {
      //   return false;
      // }
      
      return true;
    });
  };

  // Инициализация из URL
  useEffect(() => {
    const query = searchParams.get('q') || 'javascript';
    const specialization = (searchParams.get('specialization') as Specialization) || 'frontend';
    const employment = searchParams.get('employment')?.split(',') as Employment[] || [];
    
    setCurrentQuery(query);
    setCurrentSpecialization(specialization);
    setCurrentEmployment(employment);
    
    fetchVacancies(query, specialization, employment);
  }, [searchParams]);
  
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">J</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">JobFilter</h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Поиск</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Фильтры</a>
                <a href="/analytics" className="text-gray-600 hover:text-gray-900 text-sm">Аналитика</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">☀</span>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">🌙</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm">👤</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Specialization Tabs */}
      <SpecializationTabs
        onSpecializationChange={handleSpecializationChange}
        loading={loading}
      />

      {/* Score Threshold Slider */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Порог адекватности:
            </label>
            <input
              type="range"
              min="-2"
              max="5"
              step="0.5"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <span className="text-sm text-gray-600 min-w-[3rem]">
              {scoreThreshold >= 0 ? `+${scoreThreshold}` : scoreThreshold}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Heading */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-bold text-gray-900">разработчикам</h1>
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span className="text-lg font-medium">{vacancies.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar with Filters */}
          <div className="lg:col-span-1 space-y-6">
            {/* Employment Filter */}
            <EmploymentFilter
              selectedEmployment={currentEmployment}
              onEmploymentChange={handleEmploymentChange}
            />
            
            {/* Filter Suggestions */}
            <FilterSuggestions
              userId="anonymous"
              onFilterToggle={(tokenId, action) => {
                console.log(`Filter toggled: ${tokenId} -> ${action}`);
                // TODO: Обновить фильтры и пересчитать результаты
              }}
            />
          </div>

          {/* Vacancies Grid */}
          <div className="lg:col-span-3">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Загружаем вакансии...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Ошибка загрузки</h2>
            <p className="text-gray-500 text-lg">{error}</p>
          </div>
        ) : vacancies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {vacancies.map((v) => (
              <div key={v.id} className="bg-white rounded-3xl border border-gray-200 hover:border-gray-300 transition-all duration-200 flex flex-col h-full">
                <div className="p-4 flex flex-col h-full">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      getEmploymentType(v) === 'удалённо' ? 'bg-green-100 text-green-700' :
                      getEmploymentType(v) === 'офис' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {getEmploymentType(v)}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {getGrade(v)}
                    </span>
                    {v.score !== undefined && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        v.score >= 2 ? 'bg-green-100 text-green-700' :
                        v.score >= 0 ? 'bg-yellow-100 text-yellow-700' :
                        v.score >= -2 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {v.score >= 0 ? `+${v.score}` : v.score}
                      </span>
                    )}
                  </div>

                  {/* Company Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {v.companyLogo ? (
                        <img
                          src={v.companyLogo}
                          alt={v.company}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {v.company.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-gray-600 truncate max-w-[120px]">
                        {v.company}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">сегодня</span>
                  </div>

                  {/* Job Title */}
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2" style={{ fontSize: '16px' }}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                      {v.title}
                    </a>
                  </h2>

                  {/* Salary */}
                  {v.salary !== 'Не указана' && (
                    <div className="font-semibold text-gray-900 mb-4" style={{ fontSize: '20px' }}>
                      {typeof v.salary === 'string' 
                        ? v.salary 
                        : v.salary?.min 
                          ? `${v.salary.min.toLocaleString()} - ${v.salary.max?.toLocaleString() || ''} ${v.salary.currency || 'RUB'}`
                          : 'Зарплата не указана'
                      }
                    </div>
                  )}

                  {/* Spacer to push actions to bottom */}
                  <div className="flex-1"></div>

                  {/* Actions */}
                  <div className="mt-4">
            <a 
              href={v.url} 
              target="_blank" 
              rel="noopener noreferrer"
                      className="w-full text-center px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Откликнуться
            </a>
                    
                    {/* Reaction Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(() => {
                        const vacancyReactions = reactions[v.id] || {
                          likes: 0,
                          dislikes: 0,
                          hearts: 0,
                          bookmarks: 0,
                          userReaction: null
                        };
                        
                        return (
                          <>
                            <button
                              data-vacancy-id={v.id}
                              data-reaction="likes"
                              onClick={(e) => handleReaction(v.id, 'likes', e)}
                              className={`px-3 py-0.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                vacancyReactions.userReaction === 'likes'
                                  ? 'bg-green-100 text-green-700 border border-green-300 shadow-sm'
                                  : 'text-green-600 hover:text-green-800 border border-green-300 hover:border-green-400 hover:bg-green-50'
                              }`}
                            >
                              <span className="text-lg">👍</span> <span className="text-gray-500 text-xs">{vacancyReactions.likes}</span>
                            </button>
                            <button
                              data-vacancy-id={v.id}
                              data-reaction="dislikes"
                              onClick={(e) => handleReaction(v.id, 'dislikes', e)}
                              className={`px-3 py-0.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                vacancyReactions.userReaction === 'dislikes'
                                  ? 'bg-red-100 text-red-700 border border-red-300 shadow-sm'
                                  : 'text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 hover:bg-red-50'
                              }`}
                            >
                              <span className="text-lg">👎</span> <span className="text-gray-500 text-xs">{vacancyReactions.dislikes}</span>
                            </button>
                            <button
                              data-vacancy-id={v.id}
                              data-reaction="hearts"
                              onClick={(e) => handleReaction(v.id, 'hearts', e)}
                              className={`px-3 py-0.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                vacancyReactions.userReaction === 'hearts'
                                  ? 'bg-pink-100 text-pink-700 border border-pink-300 shadow-sm'
                                  : 'text-pink-600 hover:text-pink-800 border border-pink-300 hover:border-pink-400 hover:bg-pink-50'
                              }`}
                            >
                              <span className="text-lg">❤️</span> <span className="text-gray-500 text-xs">{vacancyReactions.hearts}</span>
                            </button>
                            <button
                              data-vacancy-id={v.id}
                              data-reaction="bookmarks"
                              onClick={(e) => handleReaction(v.id, 'bookmarks', e)}
                              className={`px-3 py-0.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 ${
                                vacancyReactions.userReaction === 'bookmarks'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                                  : 'text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              <span className="text-lg">🔖</span> <span className="text-gray-500 text-xs">{vacancyReactions.bookmarks}</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Нет вакансий</h2>
            <p className="text-gray-500 text-lg">
              Попробуйте изменить поисковый запрос или подождите немного.
            </p>
          </div>
        )}
          </div>
        </div>
      </div>
    </main>
  );
}