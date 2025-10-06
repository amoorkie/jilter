'use client';

import { useState, useEffect } from 'react';
import { VacancyRecord } from '@/lib/database/sqlite-service';
import PythonParserControl from '@/components/PythonParserControl';
import VacancyPreview from '@/components/VacancyPreview';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';
type TabType = 'vacancies' | 'parser';

export default function AdminPanel() {
  const [vacancies, setVacancies] = useState<VacancyRecord[]>([]);
  const [filteredVacancies, setFilteredVacancies] = useState<VacancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancy, setSelectedVacancy] = useState<VacancyRecord | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('vacancies');

  useEffect(() => {
    fetchAllVacancies();
  }, []);

  useEffect(() => {
    filterVacancies();
  }, [vacancies, filter, searchQuery]);

  const fetchAllVacancies = async () => {
    try {
      // Используем микросервисы API
      const response = await fetch('/api/microservices/vacancies');
      const data = await response.json();
      setVacancies(data.content || []);
    } catch (error) {
      console.error('Ошибка загрузки вакансий:', error);
      // Fallback на старый API
      try {
        const response = await fetch('/api/admin/pending');
        const data = await response.json();
        setVacancies(data.vacancies || []);
      } catch (fallbackError) {
        console.error('Ошибка fallback загрузки:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterVacancies = () => {
    let filtered = vacancies;

    // Фильтр по статусу
    if (filter === 'pending') {
      filtered = filtered.filter(v => !v.is_approved && !v.is_rejected);
    } else if (filter === 'approved') {
      filtered = filtered.filter(v => v.is_approved && !v.is_rejected);
    } else if (filter === 'rejected') {
      filtered = filtered.filter(v => v.is_rejected);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.company.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query))
      );
    }

    setFilteredVacancies(filtered);
  };

  const handleModeration = async (vacancyId: number, action: 'approve' | 'reject') => {
    try {
      // Используем микросервисы API
      const response = await fetch('/api/microservices/vacancies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: vacancyId,
          action,
          notes: moderationNotes,
          moderator: 'admin',
        }),
      });

      if (response.ok) {
        await fetchAllVacancies();
        setSelectedVacancy(null);
        setModerationNotes('');
      } else {
        console.error('Ошибка модерации');
        // Fallback на старый API
        const fallbackResponse = await fetch('/api/admin/moderate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: vacancyId,
            action,
            notes: moderationNotes,
            moderator: 'admin',
          }),
        });
        
        if (fallbackResponse.ok) {
          await fetchAllVacancies();
          setSelectedVacancy(null);
          setModerationNotes('');
        }
      }
    } catch (error) {
      console.error('Ошибка модерации:', error);
    }
  };

  const getStatusBadge = (vacancy: VacancyRecord) => {
    if (vacancy.is_approved) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Одобрено</span>;
    } else if (vacancy.is_rejected) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Отклонено</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">На модерации</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка вакансий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Админ-панель управления</h1>
            <p className="mt-1 text-sm text-gray-600">
              Модерация вакансий, парсинг и мониторинг системы
            </p>
          </div>

          {/* Вкладки навигации */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('vacancies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'vacancies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Вакансии ({filteredVacancies.length})
              </button>
              <button
                onClick={() => setActiveTab('parser')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'parser'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🐍 Парсер
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Контент вкладки Вакансии */}
            {activeTab === 'vacancies' && (
              <div>
                {/* Фильтры и поиск */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Поиск по названию, компании или описанию..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          filter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' && 'Все'}
                        {status === 'pending' && 'На модерации'}
                        {status === 'approved' && 'Одобрено'}
                        {status === 'rejected' && 'Отклонено'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Список вакансий */}
                <div className="space-y-4">
                  {filteredVacancies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Вакансии не найдены</p>
                    </div>
                  ) : (
                    filteredVacancies.map((vacancy) => (
                      <div key={vacancy.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{vacancy.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{vacancy.company} • {vacancy.source}</p>
                            {getStatusBadge(vacancy)}
                          </div>
                          <button
                            onClick={() => setSelectedVacancy(vacancy)}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Подробнее
                          </button>
                        </div>
                        
                        {/* Предварительный просмотр структурированного описания */}
                        <VacancyPreview 
                          vacancy={{
                            full_description: vacancy.full_description,
                            requirements: vacancy.requirements,
                            tasks: vacancy.tasks,
                            conditions: vacancy.conditions,
                            benefits: vacancy.benefits,
                            description: vacancy.description
                          }} 
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Контент вкладки Парсер */}
            {activeTab === 'parser' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">🐍 Python парсеры</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800">
                    <strong>Информация:</strong> Python парсеры работают с JavaScript сайтами. 
                    Go парсеры в разделе "🚀 Микросервисы" работают с простыми HTML сайтами.
                  </p>
                </div>
                <PythonParserControl />
              </div>
            )}

            {/* Контент вкладки Мониторинг */}
            {activeTab === 'monitoring' && (
              <div>
                <EnhancedMonitoringPanel />
              </div>
            )}

            {/* Контент вкладки Нормализатор */}
            {activeTab === 'normalizer' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Нормализация текста вакансий
                  </h2>
                  <p className="text-gray-600">
                    Приводите текст вакансий к единому формату: нормализуйте названия должностей, 
                    навыки, типы занятости и другие элементы.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Нормализация заголовков
                    </h3>
                    <TextNormalizer type="title" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Нормализация описаний
                    </h3>
                    <TextNormalizer type="description" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Нормализация требований
                    </h3>
                    <TextNormalizer type="requirements" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Нормализация условий
                    </h3>
                    <TextNormalizer type="conditions" />
                  </div>
                </div>
              </div>
            )}

            {/* Контент вкладки PDF Менеджер */}
            {activeTab === 'pdf' && (
              <div>
                <PDFManager />
              </div>
            )}

            {/* Контент вкладки Микросервисы */}
            {activeTab === 'microservices' && (
              <div>
                <MicroservicesControl />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно детального просмотра */}
      {selectedVacancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedVacancy.title}</h2>
                  <p className="text-gray-600">{selectedVacancy.company}</p>
                </div>
                <button
                  onClick={() => setSelectedVacancy(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Основная информация</h3>
                  <p className="text-gray-600 mb-2"><strong>Компания:</strong> {selectedVacancy.company}</p>
                  <p className="text-gray-600 mb-2"><strong>Источник:</strong> {selectedVacancy.source}</p>
                  <p className="text-gray-600 mb-2"><strong>URL:</strong> 
                    <a href={selectedVacancy.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                      Открыть
                    </a>
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">AI Анализ</h3>
                  <p className="text-gray-600 mb-1"><strong>Специализация:</strong> {selectedVacancy.ai_specialization}</p>
                  <p className="text-gray-600 mb-1">
                    <strong>Занятость:</strong> {
                      Array.isArray(selectedVacancy.ai_employment) 
                        ? selectedVacancy.ai_employment.join(', ') 
                        : selectedVacancy.ai_employment || 'Не указано'
                    }
                  </p>
                  <p className="text-gray-600 mb-1"><strong>Опыт:</strong> {selectedVacancy.ai_experience}</p>
                  <p className="text-gray-600 mb-1"><strong>Удаленно:</strong> {selectedVacancy.ai_remote ? 'Да' : 'Нет'}</p>
                  <p className="text-gray-600"><strong>Релевантность:</strong> {(selectedVacancy.ai_relevance_score * 100).toFixed(1)}%</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Описание вакансии</h3>
                <div className="bg-white p-4 rounded-lg border">
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedVacancy.full_description || selectedVacancy.description || 'Описание не найдено' 
                    }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Заметки модератора
                </label>
                <textarea
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Добавьте заметки о модерации..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedVacancy(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleModeration(selectedVacancy.id, 'reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  ❌ Отклонить
                </button>
                <button
                  onClick={() => handleModeration(selectedVacancy.id, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  ✅ Одобрить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
