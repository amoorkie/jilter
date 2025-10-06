// Тест основных API
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

async function testBasicAPIs() {
  console.log('🧪 Тест основных API');
  
  const apis = [
    { name: 'Главная страница', url: 'http://localhost:3000/' },
    { name: 'API вакансий', url: 'http://localhost:3000/api/vacancies' },
    { name: 'Админ панель', url: 'http://localhost:3000/admin' },
    { name: 'API админ панели', url: 'http://localhost:3000/api/admin/pending' }
  ];
  
  for (const api of apis) {
    try {
      console.log(`\n🔍 Тестируем ${api.name}...`);
      const response = await fetch(api.url);
      
      if (response.ok) {
        console.log(`✅ ${api.name}: OK (${response.status})`);
      } else {
        console.log(`❌ ${api.name}: Ошибка ${response.status}`);
        const errorText = await response.text();
        console.log(`   Детали: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ ${api.name}: ${error.message}`);
    }
  }
}

testBasicAPIs();















