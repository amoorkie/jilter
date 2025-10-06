// src/components/VacancyPreview.tsx
import React from 'react';

interface VacancyPreviewProps {
  vacancy: {
    full_description?: string;
    requirements?: string;
    tasks?: string;
    conditions?: string;
    benefits?: string;
    description?: string;
  };
}

const VacancyPreview: React.FC<VacancyPreviewProps> = ({ vacancy }) => {
  // Собираем полный текст
  const fullText = [
    vacancy.full_description,
    vacancy.description,
    vacancy.requirements && `Требования:\n${vacancy.requirements}`,
    vacancy.tasks && `Задачи:\n${vacancy.tasks}`,
    vacancy.conditions && `Условия:\n${vacancy.conditions}`,
    vacancy.benefits && `Льготы:\n${vacancy.benefits}`
  ].filter(Boolean).join('\n\n');

  // Если нет текста, показываем заглушку
  if (!fullText.trim()) {
    return (
      <div className="bg-gray-50 p-3 rounded-md">
        <p className="text-gray-500 text-xs italic">
          Описание отсутствует. Нажмите "Подробнее" для просмотра.
        </p>
      </div>
    );
  }

  // Функция для получения краткого превью текста
  const getPreview = (content: string, maxLength: number = 200) => {
    const textOnly = content.replace(/\s+/g, ' ').trim();
    return textOnly.length > maxLength 
      ? textOnly.substring(0, maxLength) + '...' 
      : textOnly;
  };

  return (
    <div className="bg-gray-50 p-3 rounded-md">
      <div className="text-xs">
        <span className="font-medium text-gray-700">📄 Описание:</span>
        <p className="text-gray-600 line-clamp-3 mt-1">
          {getPreview(fullText, 200)}
        </p>
      </div>
    </div>
  );
};

export default VacancyPreview;
