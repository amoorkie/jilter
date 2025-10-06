import React from 'react';

import { Vacancy as BaseVacancy } from '@/lib/parsers/unified-parser';

// Расширенный тип Vacancy с дополнительными полями из API
interface Vacancy extends BaseVacancy {
  publishedAt: string;
  score: number;
  matchedTokens: any[];
  reasons: string[];
  aiAnalysis: {
    specialization: string;
    employment: string[];
    experience: string;
    technologies: string[];
    remote: boolean;
    requirements: string[];
    benefits: string[];
    summary: string;
  };
}

interface VacancyCardProps {
  vacancy: Vacancy;
  index: number;
  onReaction: (vacancyId: string, reaction: 'like' | 'dislike' | 'save') => void;
  animations: Record<string, string>;
}

export const VacancyCard: React.FC<VacancyCardProps> = ({ 
  vacancy, 
  index, 
  onReaction, 
  animations
}) => {

  // Функция для очистки названия компании от дублей
  const cleanCompanyName = (company: string): string => {
    let cleaned = company;
    
    // Убираем HTML entities и нормализуем пробелы
    cleaned = cleaned.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Проверяем на точное дублирование всего названия
    const companyLength = cleaned.length;
    if (companyLength > 10) {
      const halfLength = Math.floor(companyLength / 2);
      const firstHalf = cleaned.substring(0, halfLength);
      const secondHalf = cleaned.substring(halfLength);
      
      // Если вторая половина ТОЧНО повторяет первую
      if (firstHalf === secondHalf && firstHalf.length > 5) {
        cleaned = firstHalf;
      }
    }
    
    return cleaned;
  };

  // Обработчики реакций
  const handleReaction = (reaction: 'like' | 'dislike' | 'save') => (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onReaction(vacancy.id, reaction);
  };

  // Обработчик клика по карточке
  const handleCardClick = () => {
    window.open(vacancy.url, '_blank');
  };

  return (
    <div 
      className="bg-white rounded-3xl p-4 hover:shadow-lg transition-shadow h-80 flex flex-col cursor-pointer"
      onClick={handleCardClick}
      style={{
        animation: animations[vacancy.id] || 'none'
      }}
    >
      {/* Заголовок с компанией и датой */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <p 
              className="text-sm text-gray-600"
              style={{
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                maxWidth: '200px'
              }}
            >
              {cleanCompanyName(vacancy.company)}
            </p>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

        {/* Название вакансии */}
        <h3 className="text-sm font-semibold text-gray-900 mb-2" style={{ fontSize: '14px', lineHeight: '120%' }}>
          {vacancy.title}
        </h3>

        {/* Зарплата */}
        <div className="mb-4">
          <p className="text-lg font-semibold text-gray-900" style={{ fontSize: '16px' }}>
            {typeof vacancy.salary === 'string' 
              ? vacancy.salary 
              : vacancy.salary?.min 
                ? `${vacancy.salary.min.toLocaleString()} - ${vacancy.salary.max?.toLocaleString() || ''} ${vacancy.salary.currency || 'RUB'}`
                : 'Не указана'
            }
          </p>
        </div>

        {/* Кнопки реакций */}
        <div className="mt-auto">
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleReaction('like')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              👍 Подходит
            </button>
            
            <button
              onClick={handleReaction('dislike')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              👎 Не подходит
            </button>
            
            <button
              onClick={handleReaction('save')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              🔖 Сохранить
            </button>
          </div>
        </div>

        {/* Информация о типе занятости */}
        {vacancy.aiAnalysis?.employment && vacancy.aiAnalysis.employment.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {vacancy.aiAnalysis.employment.map((emp, empIndex) => (
                <span 
                  key={empIndex}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {emp === 'full_time' ? 'Полная занятость' :
                   emp === 'part_time' ? 'Частичная занятость' :
                   emp === 'remote' ? 'Удаленная работа' :
                   emp === 'project' ? 'Проектная работа' :
                   emp === 'contract' ? 'Контракт' :
                   emp === 'internship' ? 'Стажировка' :
                   emp === 'temporary' ? 'Временная работа' :
                   emp === 'freelance' ? 'Фриланс' : emp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
