#!/usr/bin/env node
/**
 * Простой тест Node.js парсера через API
 */

const http = require('http');

async function testNodeJSParserViaAPI() {
  console.log('=== ТЕСТ NODE.JS ПАРСЕРА ЧЕРЕЗ API ===');
  
  const startTime = Date.now();
  
  try {
    // Делаем запрос к API парсинга
    const response = await fetch('http://localhost:3000/api/force-parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Результаты Node.js парсера (через API):`);
    console.log(`   Статус: ${data.success ? 'Успешно' : 'Ошибка'}`);
    console.log(`   Сообщение: ${data.message}`);
    console.log(`   Время выполнения: ${duration.toFixed(2)} секунд`);
    
    if (data.stats) {
      console.log(`\n📈 Статистика:`);
      console.log(`   Всего: ${data.stats.total}`);
      console.log(`   Ожидают модерации: ${data.stats.pending}`);
      console.log(`   Одобрено: ${data.stats.approved}`);
      
      if (data.stats.sources) {
        console.log(`\n📋 По источникам:`);
        Object.entries(data.stats.sources).forEach(([source, count]) => {
          console.log(`   ${source}: ${count} вакансий`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования Node.js парсера:', error.message);
  }
}

// Проверяем, запущен ли сервер
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Next.js сервер не запущен на localhost:3000');
    console.log('Запустите сервер командой: npm run dev');
    return;
  }
  
  await testNodeJSParserViaAPI();
}

main().catch(console.error);











