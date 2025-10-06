'use client';

import React, { useState } from 'react';
import ParsedVacancyViewDemo from '@/components/ParsedVacancyViewDemo';

const demoText = `Описание компании:
Мы - динамично развивающаяся IT-компания, специализирующаяся на создании инновационных цифровых продуктов. Наша команда состоит из профессионалов высокого уровня, объединенных общей целью - делать мир лучше через технологии.

Основные задачи:
• Создание пользовательских интерфейсов для мобильных и веб-приложений
• Проведение UX-исследований и тестирования
• Работа с дизайн-системами и UI-китами
• Создание прототипов и wireframes
• Участие в планировании продукта

Требования к кандидату:
1. Опыт работы в Figma не менее 2 лет
2. Знание принципов UX/UI дизайна
3. Понимание принципов адаптивной верстки
4. Опыт создания дизайн-систем
5. Базовые знания HTML/CSS будут плюсом

Дополнительные навыки:
• Знание Adobe Creative Suite
• Опыт работы с React или Vue.js
• Понимание принципов accessibility

Условия работы:
- Полная занятость, офис в центре Москвы
- Гибкий график работы
- Возможность удаленной работы 2 дня в неделю
- Медицинская страховка
- Корпоративное обучение

Мы предлагаем:
• Конкурентную заработную плату от 120 000 до 180 000 рублей
• Ежегодные премии по результатам работы
• Оплачиваемый отпуск 28 календарных дней
• Компенсация спортзала и образовательных курсов
• Дружный коллектив и комфортную рабочую атмосферу

Льготы и бонусы:
- Бесплатные обеды в офисе
- Корпоративные мероприятия
- Программа менторства`;

export default function DemoPage() {
  const [text, setText] = useState(demoText);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Тестирование парсера текста вакансий
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - редактор текста */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Исходный текст
            </h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Вставьте текст вакансии для парсинга..."
            />
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Подсказка:</strong> Попробуйте добавить разные секции:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>Обязанности:</code> или <code>Задачи:</code></li>
                <li><code>Требования:</code> или <code>Ожидания:</code></li>
                <li><code>Условия работы:</code> или <code>Мы предлагаем:</code></li>
                <li><code>Льготы:</code> или <code>Преимущества:</code></li>
              </ul>
            </div>
          </div>

          {/* Правая колонка - результат парсинга */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Результат парсинга
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <ParsedVacancyViewDemo text={text} />
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Как использовать парсер:
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>1. <strong>Вставьте текст</strong> вакансии в левое поле</p>
            <p>2. <strong>Парсер автоматически</strong> найдет заголовки секций и разобьет текст</p>
            <p>3. <strong>Списки форматируются</strong> автоматически (• - • 1. 2. 3.)</p>
            <p>4. <strong>Абзацы разделяются</strong> для лучшей читаемости</p>
            <p>5. <strong>Откройте DevTools</strong> (F12) → Console для отладочной информации</p>
          </div>
        </div>
      </div>
    </div>
  );
}