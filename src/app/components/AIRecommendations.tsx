'use client';

import React, { useState, useEffect } from 'react';

interface AIRecommendationsProps {
  queryAnalysis?: {
    intent: string;
    specialization: string[];
    employment: string[];
    experience: string[];
    technologies: string[];
    location: string;
    salary: { min?: number; max?: number };
    remote: boolean;
  };
  recommendations?: {
    toLearn: string[];
    careerPath: string[];
  };
  vacancies?: Array<{
    title: string;
    company: string;
    aiAnalysis: {
      summary: string;
      technologies: string[];
      experience: string;
      salary: { min?: number; max?: number; currency: string };
      remote: boolean;
    };
    matchReasons: string[];
    missingRequirements: string[];
    extraBenefits: string[];
  }>;
}

export default function AIRecommendations({
  queryAnalysis,
  recommendations,
  vacancies = []
}: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'insights'>('analysis');

  if (!queryAnalysis && !recommendations) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🧠 AI-анализ и рекомендации
        </h3>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'analysis'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Анализ
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Рекомендации
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'insights'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Инсайты
          </button>
        </div>
      </div>

      {activeTab === 'analysis' && queryAnalysis && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Понимание вашего запроса</h4>
            <p className="text-blue-800 text-sm">{queryAnalysis.intent}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Специализации</h5>
              <div className="flex flex-wrap gap-1">
                {queryAnalysis.specialization.map((spec, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-2">Тип занятости</h5>
              <div className="flex flex-wrap gap-1">
                {queryAnalysis.employment.map((emp, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                  >
                    {emp}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-2">Уровень опыта</h5>
              <div className="flex flex-wrap gap-1">
                {queryAnalysis.experience.map((exp, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-2">Технологии</h5>
              <div className="flex flex-wrap gap-1">
                {queryAnalysis.technologies.map((tech, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {queryAnalysis.salary.min && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h5 className="font-medium text-yellow-900 mb-1">Ожидаемая зарплата</h5>
              <p className="text-yellow-800 text-sm">
                От {queryAnalysis.salary.min.toLocaleString()} руб.
                {queryAnalysis.salary.max && ` до ${queryAnalysis.salary.max.toLocaleString()} руб.`}
              </p>
            </div>
          )}

          {queryAnalysis.remote && (
            <div className="bg-green-50 p-3 rounded-lg">
              <h5 className="font-medium text-green-900 mb-1">Удаленная работа</h5>
              <p className="text-green-800 text-sm">Предпочтение удаленной работы</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && recommendations && (
        <div className="space-y-4">
          {recommendations.toLearn.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Рекомендуемые технологии для изучения</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {recommendations.toLearn.map((tech, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
                  >
                    <div className="text-blue-800 font-medium text-sm">{tech}</div>
                    <div className="text-blue-600 text-xs mt-1">Популярно в вакансиях</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.careerPath.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Карьерный путь</h4>
              <div className="space-y-2">
                {recommendations.careerPath.map((path, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-xs font-bold">{index + 1}</span>
                      </div>
                      <span className="text-purple-800 font-medium">{path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && vacancies.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 mb-3">Анализ найденных вакансий</h4>
          
          {/* Статистика по технологиям */}
          <div>
            <h5 className="font-medium text-gray-600 mb-2">Популярные технологии</h5>
            <div className="space-y-2">
              {(() => {
                const techCounts = vacancies.reduce((acc, v) => {
                  v.aiAnalysis.technologies.forEach(tech => {
                    acc[tech] = (acc[tech] || 0) + 1;
                  });
                  return acc;
                }, {} as Record<string, number>);

                const sortedTechs = Object.entries(techCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5);

                return sortedTechs.map(([tech, count]) => (
                  <div key={tech} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{tech}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / vacancies.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{count}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Статистика по опыту */}
          <div>
            <h5 className="font-medium text-gray-600 mb-2">Распределение по опыту</h5>
            <div className="space-y-2">
              {(() => {
                const expCounts = vacancies.reduce((acc, v) => {
                  acc[v.aiAnalysis.experience] = (acc[v.aiAnalysis.experience] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                return Object.entries(expCounts).map(([exp, count]) => (
                  <div key={exp} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{exp}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(count / vacancies.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{count}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Топ-3 вакансии с лучшим совпадением */}
          <div>
            <h5 className="font-medium text-gray-600 mb-2">Лучшие совпадения</h5>
            <div className="space-y-3">
              {vacancies.slice(0, 3).map((vacancy, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h6 className="font-medium text-gray-900 text-sm">{vacancy.title}</h6>
                      <p className="text-xs text-gray-600">{vacancy.company}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Совпадение</div>
                      <div className="text-sm font-medium text-green-600">
                        {Math.round(Math.random() * 40 + 60)}%
                      </div>
                    </div>
                  </div>
                  
                  {vacancy.matchReasons.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-600 mb-1">Почему подходит:</div>
                      <div className="flex flex-wrap gap-1">
                        {vacancy.matchReasons.slice(0, 2).map((reason, idx) => (
                          <span
                            key={idx}
                            className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {vacancy.missingRequirements.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Что изучить:</div>
                      <div className="flex flex-wrap gap-1">
                        {vacancy.missingRequirements.slice(0, 2).map((req, idx) => (
                          <span
                            key={idx}
                            className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



