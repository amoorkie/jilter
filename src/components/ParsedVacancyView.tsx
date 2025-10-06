// src/components/ParsedVacancyView.tsx
import React from 'react';
import { parseAndFormatVacancyText } from '@/lib/text-parser';

interface Vacancy {
  full_description?: string;
  requirements?: string;
  tasks?: string;
  conditions?: string;
  benefits?: string;
  description?: string;
}

interface ParsedVacancyViewProps {
  vacancy?: Vacancy;
  text?: string;
}

const ParsedVacancyView: React.FC<ParsedVacancyViewProps> = ({ vacancy, text }) => {
  console.log("DEBUG: Компонент ParsedVacancyView получил данные:", { vacancy, text });
  
  let fullText = '';
  
  if (text) {
    // Если передан прямой текст, используем его
    fullText = text;
  } else if (vacancy) {
    // Собираем полный текст для парсинга из всех доступных полей
    fullText = [
      vacancy.full_description,
      vacancy.description,
      vacancy.requirements && `Требования:\n${vacancy.requirements}`,
      vacancy.tasks && `Задачи:\n${vacancy.tasks}`,
      vacancy.conditions && `Условия:\n${vacancy.conditions}`,
      vacancy.benefits && `Льготы:\n${vacancy.benefits}`
    ].filter(Boolean).join('\n\n');
  }

  console.log("DEBUG: Полный текст для парсинга:", fullText);
  const parsed = parseAndFormatVacancyText(fullText);
  console.log("DEBUG: Результат парсинга в компоненте:", parsed);

  return (
    <div className="space-y-6">
      {/* Полное описание */}
      {parsed.full_description && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
            Описание вакансии
          </h3>
          <div 
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: parsed.full_description }} 
          />
        </div>
      )}

      {/* Секции */}
      {parsed.sections.map((section, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
            {section.title}
          </h3>
          <div 
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: section.content }} 
          />
        </div>
      ))}

      {/* Если нет структурированных данных, показываем исходные поля */}
      {!parsed.full_description && parsed.sections.length === 0 && vacancy && (
        <div className="space-y-4">
          {vacancy.full_description && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Описание</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {vacancy.full_description}
              </div>
            </div>
          )}
          
          {vacancy.requirements && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 Требования</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {vacancy.requirements}
              </div>
            </div>
          )}
          
          {vacancy.tasks && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">✅ Задачи</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {vacancy.tasks}
              </div>
            </div>
          )}
          
          {vacancy.conditions && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">💰 Условия</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {vacancy.conditions}
              </div>
            </div>
          )}
          
          {vacancy.benefits && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">⭐ Льготы</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {vacancy.benefits}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParsedVacancyView;

