// Тест мониторинга
const fs = require('fs');
const path = require('path');

// Загружаем переменные
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️ Не удалось загрузить .env.local:', error.message);
  }
}

loadEnvFile();

async function testMonitoring() {
  console.log('🧪 Тестирование системы мониторинга');
  
  try {
    // Тест запуска мониторинга
    console.log('\n1. Тест запуска мониторинга...');
    const startResponse = await fetch('http://localhost:3000/api/monitoring/start', {
      method: 'POST'
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ Мониторинг запущен:', startData.message);
    } else {
      const errorText = await startResponse.text();
      console.log('❌ Ошибка запуска:', errorText);
    }
    
    // Тест статистики
    console.log('\n2. Тест получения статистики...');
    const statsResponse = await fetch('http://localhost:3000/api/monitoring/stats');
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Статистика получена:', statsData.stats);
    } else {
      const errorText = await statsResponse.text();
      console.log('❌ Ошибка статистики:', errorText);
    }
    
    // Тест остановки мониторинга
    console.log('\n3. Тест остановки мониторинга...');
    const stopResponse = await fetch('http://localhost:3000/api/monitoring/stop', {
      method: 'POST'
    });
    
    if (stopResponse.ok) {
      const stopData = await stopResponse.json();
      console.log('✅ Мониторинг остановлен:', stopData.message);
    } else {
      const errorText = await stopResponse.text();
      console.log('❌ Ошибка остановки:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testMonitoring();














