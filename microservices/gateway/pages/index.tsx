import React from 'react';
import Head from 'next/head';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Job Filter MVP - Gateway</title>
        <meta name="description" content="API Gateway for Job Filter MVP" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Job Filter MVP - Gateway
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Admin Service</h2>
            <p className="text-gray-600 mb-4">Управление вакансиями и модерация</p>
            <a 
              href="/api/admin/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Parser Service</h2>
            <p className="text-gray-600 mb-4">Парсинг вакансий с различных сайтов</p>
            <a 
              href="/api/parser/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Database Service</h2>
            <p className="text-gray-600 mb-4">Работа с базой данных</p>
            <a 
              href="/api/database/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Queue Service</h2>
            <p className="text-gray-600 mb-4">Обработка очередей задач</p>
            <a 
              href="/api/queue/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Search Service</h2>
            <p className="text-gray-600 mb-4">Полнотекстовый поиск</p>
            <a 
              href="/api/search/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">AI Service</h2>
            <p className="text-gray-600 mb-4">Обработка текста и AI анализ</p>
            <a 
              href="/api/ai/health" 
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
            >
              Проверить статус
            </a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Микросервисная архитектура</h2>
          <p className="text-gray-600">
            Все сервисы работают независимо и могут масштабироваться по отдельности
          </p>
        </div>
      </main>
    </div>
  );
}







