// test-geekjob-parser.ts
import { parseGeekjobVacancies } from './src/lib/parsers/geekjob';

const testParse = async () => {
  console.log("🚀 Запуск парсинга Geekjob.ru...");
  
  // Добавляем задержку перед тестом
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const vacancies = await parseGeekjobVacancies("javascript");
  console.log(`📊 Найдено вакансий: ${vacancies.length}`);
  
  if (vacancies.length > 0) {
    console.log("✅ Первые 3 вакансии:");
    vacancies.slice(0, 3).forEach((v, i) => {
      console.log(`${i + 1}. ${v.title} | ${v.company} | ${v.salary}`);
    });
  } else {
    console.log("❌ Вакансии не найдены. Возможно, Geekjob.ru изменил структуру сайта.");
  }
};

testParse();