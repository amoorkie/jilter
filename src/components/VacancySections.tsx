// src/components/VacancySections.tsx
import React from 'react';
import FormattedText from './FormattedText';

// Простые SVG иконки вместо Heroicons
const DocumentTextIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClipboardDocumentListIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const CheckBadgeIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const BanknotesIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

interface VacancySectionsProps {
  vacancy: {
    full_description?: string;
    requirements?: string;
    tasks?: string;
    conditions?: string;
    benefits?: string;
    description?: string; // Fallback для старых данных
  };
}

interface SectionProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  bgColor?: string;
}

const Section: React.FC<SectionProps> = ({ title, content, icon, bgColor = 'bg-white' }) => {
  return (
    <div className={`${bgColor} p-6 rounded-xl shadow-sm border border-gray-100 vacancy-section`}>
      <div className="flex items-center mb-6">
        <div className="flex-shrink-0 w-8 h-8 text-blue-600 mr-3">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 flex-1">
          {title}
        </h3>
      </div>
      <div className="ml-11">
        <FormattedText text={content} className="formatted-text" />
      </div>
    </div>
  );
};

const VacancySections: React.FC<VacancySectionsProps> = ({ vacancy }) => {
  const sections = [
    {
      key: 'description',
      title: 'Описание вакансии',
      content: vacancy.full_description || vacancy.description || '',
      icon: <DocumentTextIcon />,
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50'
    },
    {
      key: 'tasks',
      title: 'Обязанности',
      content: vacancy.tasks || '',
      icon: <ClipboardDocumentListIcon />,
      bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50'
    },
    {
      key: 'requirements',
      title: 'Требования',
      content: vacancy.requirements || '',
      icon: <CheckBadgeIcon />,
      bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50'
    },
    {
      key: 'conditions',
      title: 'Условия работы',
      content: vacancy.conditions || '',
      icon: <BanknotesIcon />,
      bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50'
    },
    {
      key: 'benefits',
      title: 'Преимущества и льготы',
      content: vacancy.benefits || '',
      icon: <StarIcon />,
      bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50'
    }
  ];

  // Фильтруем секции с контентом
  const sectionsWithContent = sections.filter(section => 
    section.content && section.content.trim() !== ''
  );

  if (sectionsWithContent.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-xl text-center">
        <div className="w-16 h-16 text-gray-400 mx-auto mb-4">
          <DocumentTextIcon />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Подробное описание недоступно
        </h3>
        <p className="text-gray-600">
          Для получения полной информации о вакансии перейдите на сайт работодателя
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sectionsWithContent.map((section) => (
        <Section
          key={section.key}
          title={section.title}
          content={section.content}
          icon={section.icon}
          bgColor={section.bgColor}
        />
      ))}
      
      {/* Дополнительная информация */}
      <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-600">
          <strong>Совет:</strong> Внимательно изучите все разделы перед откликом. 
          Убедитесь, что ваши навыки соответствуют требованиям работодателя.
        </p>
      </div>
    </div>
  );
};

export default VacancySections;
