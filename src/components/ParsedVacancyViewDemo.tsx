// src/components/ParsedVacancyViewDemo.tsx
import React from 'react';
import { parseAndFormatVacancyText } from '@/lib/text-parser';

interface ParsedVacancyViewDemoProps {
  text: string;
}

const ParsedVacancyViewDemo: React.FC<ParsedVacancyViewDemoProps> = ({ text }) => {
  console.log("DEBUG: Компонент ParsedVacancyView получил текст:", text);
  const parsed = parseAndFormatVacancyText(text);

  console.log("DEBUG: Результат парсинга в компоненте:", parsed);

  return (
    <div className="space-y-6">
      {/* Полное описание */}
      {parsed.full_description && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-3">Описание вакансии</h3>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: parsed.full_description }} />
        </div>
      )}

      {/* Секции */}
      {parsed.sections.map((section, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: section.content }} />
        </div>
      ))}
    </div>
  );
};

export default ParsedVacancyViewDemo;










