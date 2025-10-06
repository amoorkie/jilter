// src/components/TextParserDemo.tsx
'use client';

import React, { useState } from 'react';
import { parseAndFormatVacancyText } from '@/lib/text-parser';
import VacancySections from './VacancySections';

const TextParserDemo: React.FC = () => {
  const [rawText, setRawText] = useState(`
Мы ищем талантливого UI/UX дизайнера для работы над инновационными проектами в области финтеха. Наша команда создает современные цифровые продукты, которые меняют индустрию.

Чем предстоит заниматься?
Создание пользовательских интерфейсов для веб и мобильных приложений
Проведение UX исследований и анализ пользовательского поведения
Создание wireframes, прототипов и интерактивных макетов
Работа с дизайн-системой и поддержание единого стиля
Сотрудничество с командой разработки для реализации дизайна

Требования:
- Опыт работы UI/UX дизайнером от 3 лет
- Отличное знание Figma, Sketch, Adobe Creative Suite
- Понимание принципов UX и современных трендов в дизайне
- Опыт создания дизайн-систем
- Знание HTML/CSS будет плюсом
- Портфолио с примерами работ обязательно

Условия работы:
Полная занятость в офисе или удаленно
Гибкий график работы
Зарплата от 150,000 до 250,000 рублей
Официальное трудоустройство

Что мы предлагаем:
• Работу в дружной и профессиональной команде
• Возможности для профессионального роста
• Участие в интересных и сложных проектах
• Современное оборудование и инструменты
• Корпоративные мероприятия и тимбилдинги
  `);

  const [parsedData, setParsedData] = useState(() => parseAndFormatVacancyText(rawText));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setRawText(newText);
    setParsedData(parseAndFormatVacancyText(newText));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Демо парсера текста вакансий
        </h1>
        <p className="text-gray-600">
          Введите сырой текст вакансии слева и посмотрите, как он структурируется справа
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Исходный текст */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Исходный текст вакансии
          </h2>
          <textarea
            value={rawText}
            onChange={handleTextChange}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none font-mono text-sm"
            placeholder="Вставьте сюда текст вакансии..."
          />
          <div className="text-sm text-gray-500">
            Символов: {rawText.length}
          </div>
        </div>

        {/* Структурированный результат */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Структурированный результат
          </h2>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <VacancySections 
              vacancy={{
                full_description: parsedData.full_description,
                requirements: parsedData.requirements,
                tasks: parsedData.tasks,
                conditions: parsedData.conditions,
                benefits: parsedData.benefits
              }} 
            />
          </div>
        </div>
      </div>

      {/* Статистика парсинга */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Статистика парсинга</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {parsedData.full_description ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Описание</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {parsedData.tasks ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Обязанности</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {parsedData.requirements ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Требования</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {parsedData.conditions ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Условия</div>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">
              {parsedData.benefits ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Льготы</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextParserDemo;











