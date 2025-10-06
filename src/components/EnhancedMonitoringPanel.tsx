'use client';

import React, { useState, useEffect } from 'react';

interface SystemHealth {
  overallStatus: string;
  successRate: number;
  activeAlerts: number;
}

interface MonitoringStats {
  isRunning: boolean;
  lastHealthCheck: string | null;
  consecutiveFailures: number;
  totalVacancies: number;
  pendingVacancies: number;
  approvedVacancies: number;
  systemHealth: SystemHealth;
  message: string;
  config: {
    enabledSources: string[];
    enableCaching: boolean;
    enablePlaywright: boolean;
    maxPagesPerSource: number;
  };
}

interface ParsingResults {
  runtime: number;
  totalFound: number;
  totalSaved: number;
  totalFiltered: number;
  successRate: number;
}

export default function EnhancedMonitoringPanel() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [parseResults, setParseResults] = useState<ParsingResults | null>(null);

  // Загрузка статистики
  const loadStats = async () => {
    try {
      const response = await fetch('/api/monitoring/enhanced');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to load monitoring stats:', result.error);
      }
    } catch (error) {
      console.error('Error loading monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Автообновление каждые 30 секунд
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Действия мониторинга
  const handleAction = async (action: string, options?: any) => {
    setActionLoading(action);
    try {
      const response = await fetch('/api/monitoring/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, options }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (action === 'manual-parse' && result.data) {
          setParseResults(result.data);
        }
        
        // Обновляем статистику после действия
        setTimeout(loadStats, 1000);
        
        // Показываем уведомление
        alert(result.message || 'Action completed successfully');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Error performing ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'degraded': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Получение иконки статуса
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'degraded': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <p>Не удалось загрузить статистику мониторинга</p>
          <button 
            onClick={loadStats}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и основные действия */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            🚀 Улучшенный мониторинг парсинга
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleAction(stats.isRunning ? 'stop' : 'start')}
              disabled={actionLoading === 'start' || actionLoading === 'stop'}
              className={`px-4 py-2 rounded font-medium ${
                stats.isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:opacity-50`}
            >
              {actionLoading === 'start' || actionLoading === 'stop' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {stats.isRunning ? 'Останавливаем...' : 'Запускаем...'}
                </span>
              ) : (
                stats.isRunning ? '🛑 Остановить' : '▶️ Запустить'
              )}
            </button>
            
            <button
              onClick={() => handleAction('manual-parse', { pages: 2, extractDetails: true })}
              disabled={actionLoading === 'manual-parse'}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium disabled:opacity-50"
            >
              {actionLoading === 'manual-parse' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Парсим...
                </span>
              ) : (
                '🔧 Ручной парсинг'
              )}
            </button>
            
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
            >
              🔄 Обновить
            </button>
          </div>
        </div>

        {/* Статус системы */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Статус мониторинга</span>
              <span className={`text-lg font-bold ${stats.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                {stats.isRunning ? '🟢 Активен' : '🔴 Остановлен'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Здоровье системы</span>
              <span className={`text-lg font-bold ${getStatusColor(stats.systemHealth.overallStatus)}`}>
                {getStatusIcon(stats.systemHealth.overallStatus)} {stats.systemHealth.overallStatus}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Успешность</span>
              <span className="text-lg font-bold text-blue-600">
                {stats.systemHealth.successRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Детальная информация */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Всего вакансий:</span>
            <span className="ml-2 font-semibold">{stats.totalVacancies}</span>
          </div>
          <div>
            <span className="text-gray-500">На модерации:</span>
            <span className="ml-2 font-semibold text-orange-600">{stats.pendingVacancies}</span>
          </div>
          <div>
            <span className="text-gray-500">Одобрено:</span>
            <span className="ml-2 font-semibold text-green-600">{stats.approvedVacancies}</span>
          </div>
          <div>
            <span className="text-gray-500">Неудач подряд:</span>
            <span className={`ml-2 font-semibold ${stats.consecutiveFailures > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.consecutiveFailures}
            </span>
          </div>
        </div>
      </div>

      {/* Конфигурация */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Конфигурация</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Источники:</span>
            <span className="ml-2 font-semibold">{stats.config.enabledSources.join(', ')}</span>
          </div>
          <div>
            <span className="text-gray-500">Страниц на источник:</span>
            <span className="ml-2 font-semibold">{stats.config.maxPagesPerSource}</span>
          </div>
          <div>
            <span className="text-gray-500">Кэширование:</span>
            <span className={`ml-2 font-semibold ${stats.config.enableCaching ? 'text-green-600' : 'text-red-600'}`}>
              {stats.config.enableCaching ? '✅ Включено' : '❌ Отключено'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Playwright:</span>
            <span className={`ml-2 font-semibold ${stats.config.enablePlaywright ? 'text-green-600' : 'text-red-600'}`}>
              {stats.config.enablePlaywright ? '✅ Включен' : '❌ Отключен'}
            </span>
          </div>
        </div>
      </div>

      {/* Результаты последнего парсинга */}
      {parseResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Результаты последнего парсинга</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{parseResults.totalFound}</div>
              <div className="text-sm text-gray-600">Найдено</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{parseResults.totalSaved}</div>
              <div className="text-sm text-gray-600">Сохранено</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{parseResults.totalFiltered}</div>
              <div className="text-sm text-gray-600">Отфильтровано</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{parseResults.successRate}%</div>
              <div className="text-sm text-gray-600">Успешность</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">{parseResults.runtime}с</div>
              <div className="text-sm text-gray-600">Время</div>
            </div>
          </div>
        </div>
      )}

      {/* Информация об обновлении */}
      <div className="text-xs text-gray-500 text-center">
        Последнее обновление: {lastUpdate.toLocaleTimeString()}
        {stats.lastHealthCheck && (
          <span className="ml-4">
            Последняя проверка здоровья: {new Date(stats.lastHealthCheck).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}










