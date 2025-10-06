#!/usr/bin/env node
/**
 * Прямой тест Geekjob парсера без TypeScript
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Ключевые слова для дизайнерских вакансий
const DESIGN_KEYWORDS = [
  'дизайн', 'дизайнер', 'ui/ux', 'ux/ui', 'продуктовый дизайн',
  'веб-дизайн', 'графический дизайн', 'визуальный дизайн',
  'ui-дизайнер', 'ux-дизайнер', 'продуктовый дизайнер',
  'designer', 'ui designer', 'ux designer', 'product designer'
];

function isRelevantVacancy(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  return DESIGN_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

async function parseGeekjobPage(query, page) {
  const url = `https://geekjob.ru/vacancies?q=${encodeURIComponent(query)}&page=${page}`;
  
  try {
    console.log(`🔍 Парсинг страницы ${page}: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем ссылки на вакансии
    const vacancyLinks = $('a[href*="/vacancy/"]');
    console.log(`   Найдено ссылок: ${vacancyLinks.length}`);
    
    if (vacancyLinks.length === 0) {
      console.log(`   ⚠️ На странице ${page} не найдено ссылок на вакансии`);
      return [];
    }
    
    // Группируем ссылки по ID вакансии
    const vacanciesData = new Map();
    
    vacancyLinks.each((index, element) => {
      try {
        const $el = $(element);
        const href = $el.attr('href') || '';
        const text = $el.text().trim();
        
        if (!href || !text) return;
        
        // Извлекаем ID вакансии
        const vacancyId = href.split('/vacancy/')[1]?.split('?')[0]?.split('/')[0];
        if (!vacancyId) return;
        
        const fullUrl = href.startsWith('http') ? href : `https://geekjob.ru${href}`;
        
        if (!vacanciesData.has(vacancyId)) {
          vacanciesData.set(vacancyId, {
            id: `geekjob-nodejs-${vacancyId}`,
            url: fullUrl,
            title: '',
            company: '',
            salary: '',
            location: '',
            description: ''
          });
        }
        
        const vacancy = vacanciesData.get(vacancyId);
        
        // Определяем тип информации
        if (text.includes('₽') || text.includes('€') || text.includes('$') || text.includes('руб')) {
          vacancy.salary = text;
        } else if (text.length > 50) {
          if (!vacancy.title) {
            vacancy.title = text;
          } else if (!vacancy.description) {
            vacancy.description = text;
          }
        } else if (text.length < 50 && !text.includes('₽') && !text.includes('€') && !text.includes('$')) {
          if (!vacancy.company) {
            vacancy.company = text;
          }
        } else if (text.includes('Москва') || text.includes('Санкт-Петербург') || text.includes('remote')) {
          vacancy.location = text;
        }
        
      } catch (error) {
        console.log(`   ⚠️ Ошибка обработки ссылки: ${error.message}`);
      }
    });
    
    // Фильтруем релевантные вакансии
    const relevantVacancies = [];
    vacanciesData.forEach((vacancy, vacancyId) => {
      if (vacancy.title && isRelevantVacancy(vacancy.title, vacancy.description)) {
        relevantVacancies.push(vacancy);
        console.log(`   ✅ Релевантная: ${vacancy.title}`);
      } else {
        console.log(`   ❌ Не релевантная: ${vacancy.title || 'Без названия'}`);
      }
    });
    
    return relevantVacancies;
    
  } catch (error) {
    console.error(`❌ Ошибка парсинга страницы ${page}:`, error.message);
    return [];
  }
}

async function testNodeJSParser() {
  console.log('=== ТЕСТ NODE.JS ПАРСЕРА (ПРЯМОЙ) ===');
  
  const startTime = Date.now();
  const query = 'дизайнер';
  const pages = 2;
  
  console.log(`Запрос: "${query}", страниц: ${pages}`);
  
  try {
    const allVacancies = [];
    
    for (let page = 1; page <= pages; page++) {
      const pageVacancies = await parseGeekjobPage(query, page);
      allVacancies.push(...pageVacancies);
      
      // Пауза между страницами
      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Результаты Node.js парсера:`);
    console.log(`   Найдено вакансий: ${allVacancies.length}`);
    console.log(`   Время выполнения: ${duration.toFixed(2)} секунд`);
    
    if (allVacancies.length > 0) {
      console.log(`\n📋 Найденные вакансии:`);
      allVacancies.forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title}`);
        console.log(`   Компания: ${vacancy.company}`);
        console.log(`   Зарплата: ${vacancy.salary}`);
        console.log(`   Локация: ${vacancy.location}`);
        console.log(`   URL: ${vacancy.url}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Релевантные вакансии не найдены');
    }
    
    return allVacancies;
    
  } catch (error) {
    console.error('❌ Общая ошибка парсинга:', error);
    return [];
  }
}

// Запуск теста
testNodeJSParser().catch(console.error);











