// src/app/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  totalVacancies: number;
  totalUsers: number;
  totalActions: number;
  topToxicTokens: Array<{
    phrase_norm: string;
    hides_count: number;
    unique_users: number;
  }>;
  scoreDistribution: Array<{
    score_range: string;
    count: number;
  }>;
  recentActivity: Array<{
    user_id: string;
    action: string;
    created_at: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: В реальной реализации здесь будет запрос к API аналитики
      // Пока что возвращаем моковые данные
      const mockData: AnalyticsData = {
        totalVacancies: 1250,
        totalUsers: 89,
        totalActions: 342,
        topToxicTokens: [
          { phrase_norm: 'без зарплат', hides_count: 45, unique_users: 23 },
          { phrase_norm: 'молод динамичн коллектив', hides_count: 38, unique_users: 19 },
          { phrase_norm: 'сверхурочн', hides_count: 32, unique_users: 16 },
          { phrase_norm: 'в офис обязательн', hides_count: 28, unique_users: 14 },
          { phrase_norm: 'стажировк без оплат', hides_count: 25, unique_users: 12 }
        ],
        scoreDistribution: [
          { score_range: '2+ (Отличные)', count: 156 },
          { score_range: '0-2 (Хорошие)', count: 423 },
          { score_range: '-2-0 (Сомнительные)', count: 387 },
          { score_range: '-2- (Плохие)', count: 284 }
        ],
        recentActivity: [
          { user_id: 'user_123', action: 'hide_vacancy', created_at: '2024-01-15T10:30:00Z' },
          { user_id: 'user_456', action: 'thumbs_down', created_at: '2024-01-15T10:25:00Z' },
          { user_id: 'user_789', action: 'thumbs_up', created_at: '2024-01-15T10:20:00Z' }
        ]
      };

      setData(mockData);
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
      setError('Ошибка при загрузке аналитики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Загружаем аналитику...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Ошибка загрузки</h2>
            <p className="text-gray-500 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">📊 Аналитика фильтрации</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                ← Назад к поиску
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Всего вакансий</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalVacancies.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Активных пользователей</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Действий пользователей</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalActions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Топ токсичных токенов */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">🔥 Топ токсичных фраз</h3>
            <div className="space-y-3">
              {data.topToxicTokens.map((token, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">"{token.phrase_norm}"</p>
                    <p className="text-sm text-gray-600">
                      {token.hides_count} скрытий • {token.unique_users} пользователей
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="text-2xl font-bold text-red-600">#{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Распределение скоров */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">📈 Распределение качества</h3>
            <div className="space-y-3">
              {data.scoreDistribution.map((dist, index) => {
                const colors = [
                  'bg-green-100 text-green-800',
                  'bg-yellow-100 text-yellow-800',
                  'bg-orange-100 text-orange-800',
                  'bg-red-100 text-red-800'
                ];
                const colorClass = colors[index] || 'bg-gray-100 text-gray-800';
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-900">{dist.score_range}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
                      {dist.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Последняя активность */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">🕒 Последняя активность</h3>
          <div className="space-y-2">
            {data.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleString('ru-RU')}
                  </span>
                  <span className="font-medium text-gray-900">
                    {activity.user_id}
                  </span>
                  <span className="text-sm text-gray-600">
                    {activity.action === 'hide_vacancy' ? '🚫 Скрыл вакансию' :
                     activity.action === 'thumbs_down' ? '👎 Дизлайк' :
                     activity.action === 'thumbs_up' ? '👍 Лайк' : activity.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

