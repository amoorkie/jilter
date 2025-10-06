'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
  name: string;
  status: 'UP' | 'DOWN';
  response?: any;
  error?: string;
  url: string;
}

interface HealthStatus {
  timestamp: string;
  services: ServiceStatus[];
  overall: 'healthy' | 'degraded' | 'down';
}

export default function MicroservicesControl() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseForm, setParseForm] = useState({
    query: 'дизайнер',
    pages: 2,
    sources: ['geekjob', 'hh', 'habr', 'getmatch']
  });

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/microservices/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Ошибка проверки здоровья сервисов:', error);
    } finally {
      setLoading(false);
    }
  };

  const startParsing = async () => {
    setParseLoading(true);
    setParseResult(null);
    try {
      // Используем API маршрут Next.js для парсинга
      const response = await fetch('/api/microservices/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sources: parseForm.sources,
          query: parseForm.query,
          pages: parseForm.pages
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setParseResult(data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка парсинга:', error);
      setParseResult({ success: false, error: 'Ошибка парсинга' });
    } finally {
      setParseLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP': return 'text-green-600 bg-green-100';
      case 'DOWN': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          🚀 Управление микросервисами
        </h2>
        <p className="text-gray-600">
          Мониторинг и управление микросервисной архитектурой
        </p>
      </div>

      {/* Статус сервисов */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Статус сервисов</h3>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Проверка...' : 'Обновить'}
          </button>
        </div>

        {healthStatus && (
          <div className="space-y-4">
            {/* Общий статус */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Общий статус:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOverallColor(healthStatus.overall)}`}>
                {healthStatus.overall === 'healthy' && '✅ Все сервисы работают'}
                {healthStatus.overall === 'degraded' && '⚠️ Некоторые сервисы недоступны'}
                {healthStatus.overall === 'down' && '❌ Сервисы недоступны'}
              </span>
            </div>

            {/* Список сервисов */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthStatus.services.map((service, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{service.url}</p>
                  {service.error && (
                    <p className="text-sm text-red-600">{service.error}</p>
                  )}
                  {service.response && (
                    <div className="text-xs text-gray-500">
                      <p>Время ответа: {service.response.timestamp || 'N/A'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Парсинг */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Парсинг вакансий</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Поисковый запрос
            </label>
            <input
              type="text"
              value={parseForm.query}
              onChange={(e) => setParseForm({...parseForm, query: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="дизайнер"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество страниц
            </label>
            <input
              type="number"
              value={parseForm.pages}
              onChange={(e) => setParseForm({...parseForm, pages: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Источники
            </label>
            <div className="space-y-1">
              {['geekjob', 'hh', 'habr', 'getmatch'].map((source) => (
                <label key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={parseForm.sources.includes(source)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setParseForm({
                          ...parseForm,
                          sources: [...parseForm.sources, source]
                        });
                      } else {
                        setParseForm({
                          ...parseForm,
                          sources: parseForm.sources.filter(s => s !== source)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{source}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startParsing}
          disabled={parseLoading || parseForm.sources.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {parseLoading ? 'Парсинг...' : 'Запустить парсинг'}
        </button>

        {parseResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Результат парсинга:</h4>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(parseResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}