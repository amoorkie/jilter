// Тест всех парсеров
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

async function testParsers() {
  console.log('🧪 Тестирование всех парсеров');
  
  const parsers = [
    { name: 'HH.ru', url: 'http://localhost:3000/api/test/hh' },
    { name: 'Geekjob', url: 'http://localhost:3000/api/test/geekjob' },
    { name: 'HireHi', url: 'http://localhost:3000/api/test/hirehi' },
    { name: 'Хабр Карьера', url: 'http://localhost:3000/api/test/habr' },
    { name: 'Designer.ru', url: 'http://localhost:3000/api/test/designer-ru' },
    { name: 'GetMatch', url: 'http://localhost:3000/api/test/getmatch' }
  ];
  
  for (const parser of parsers) {
    try {
      console.log(`\n🔍 Тестируем ${parser.name}...`);
      const response = await fetch(parser.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${parser.name}: ${data.vacancies?.length || 0} вакансий`);
        if (data.vacancies && data.vacancies.length > 0) {
          console.log(`   Пример: "${data.vacancies[0].title}" - ${data.vacancies[0].company}`);
        }
      } else {
        console.log(`❌ ${parser.name}: Ошибка ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${parser.name}: ${error.message}`);
    }
  }
}

testParsers();














