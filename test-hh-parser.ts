// test-hh-parser.ts
import { parseHHVacancies } from './src/lib/parsers/hh';

const testHHParse = async () => {
  console.log("🚀 Запуск парсинга HH.ru...");
  
  // Добавляем задержку перед тестом
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const vacancies = await parseHHVacancies("javascript");
  console.log(`📊 Найдено вакансий: ${vacancies.length}`);
  
  if (vacancies.length > 0) {
    console.log("✅ Первые 3 вакансии:");
    vacancies.slice(0, 3).forEach((v, i) => {
      console.log(`${i + 1}. ${v.title} | ${v.company} | ${v.salary}`);
      console.log(`   URL: ${v.url}`);
      if (v.companyLogo) {
        console.log(`   Логотип: ${v.companyLogo}`);
      }
    });
  } else {
    console.log("❌ Вакансии не найдены. Возможно, HH.ru изменил структуру сайта.");
  }
};

testHHParse();
