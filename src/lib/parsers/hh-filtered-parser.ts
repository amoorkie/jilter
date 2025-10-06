// Парсер HH.ru с использованием встроенных фильтров по типу занятости
import { chromium } from 'playwright';
import { Vacancy } from './unified-parser';

export async function parseHHWithEmploymentFilter(
  query: string = "javascript",
  employmentType: string = "full_time"
): Promise<Vacancy[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    // Маппинг типов занятости на параметры HH.ru
    const employmentParams: Record<string, string> = {
      'full_time': 'employment=full',
      'part_time': 'employment=part', 
      'project': 'employment=project',
      'contract': 'employment=contract',
      'internship': 'employment=probation',
      'temporary': 'employment=temporary',
      'freelance': 'employment=freelance',
      'remote': 'schedule=remote'
    };

    const employmentParam = employmentParams[employmentType] || 'employment=full';
    
    // Строим URL с фильтром по типу занятости
    const url = `https://hh.ru/search/vacancy?text=${encodeURIComponent(query)}&area=1&${employmentParam}`;
    
    console.log(`🔍 Парсинг HH.ru с фильтром занятости: ${employmentType} (${employmentParam})`);
    console.log(`📄 URL: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Извлекаем вакансии (ограничиваем до 10 для ускорения)
    const vacancies = await page.evaluate((config) => {
      const cards = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]');
      const results = [];
      
      console.log(`🔍 Найдено ${cards.length} карточек с фильтром ${config.employmentType}`);
      
      // Увеличиваем лимит до 50 вакансий
      const limitedCards = Array.from(cards).slice(0, 50);
      
      limitedCards.forEach((card, index) => {
        try {
          const titleElement = card.querySelector('[data-qa="serp-item__title"]');
          const title = titleElement?.textContent?.trim() || '';
          
          const companyElement = card.querySelector('[data-qa="vacancy-serp__vacancy-employer"]');
          const company = companyElement?.textContent?.trim() || '';
          
          const salaryElement = card.querySelector('[data-qa="vacancy-serp__vacancy-compensation"]') || 
                               card.querySelector('.bloko-header-section-2');
          const salary = salaryElement?.textContent?.trim() || 'Не указана';
          
          const vacancyLink = card.querySelector('[data-qa="serp-item__title"]') as HTMLAnchorElement;
          const url = vacancyLink?.href || '';
          
          const logoElement = card.querySelector('.vacancy-serp-item__logo img');
          const logo = logoElement?.getAttribute('src') || '';
          
          const companyUrlElement = card.querySelector('[data-qa="vacancy-serp__vacancy-employer"]') as HTMLAnchorElement;
          const companyUrl = companyUrlElement?.href || '';

          if (title && company && url) {
            // Строгий фильтр только для разработчиков и дизайнеров
            const developerKeywords = [
              'разработчик', 'developer', 'программист', 'programmer', 'кодер', 'coder',
              'frontend', 'backend', 'fullstack', 'mobile', 'devops', 'sre',
              'javascript', 'python', 'java', 'react', 'node', 'angular', 'vue',
              'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter',
              'html', 'css', 'sql', 'nosql', 'api', 'rest', 'graphql',
              'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
              'git', 'github', 'gitlab', 'bitbucket', 'ci/cd',
              'linux', 'unix', 'windows', 'macos', 'ios', 'android'
            ];

            const designerKeywords = [
              'дизайнер', 'designer', 'ui', 'ux', 'графический', 'веб', 'интерфейс', 'продуктовый', 'продукт',
              'figma', 'sketch', 'photoshop', 'illustrator', 'adobe'
            ];

            // Исключаем нежелательные профессии
            const excludeKeywords = [
              'маркетолог', 'marketing', 'менеджер', 'manager', 'аналитик', 'analyst',
              'тестировщик', 'tester', 'qa', 'автоматизатор', 'scientist', 'data',
              'контент', 'content', 'копирайтер', 'copywriter', 'smm', 'seo',
              'продажи', 'sales', 'рекрутер', 'hr', 'кадры', 'кадровый'
            ];

            const isExcluded = excludeKeywords.some(keyword => title.toLowerCase().includes(keyword));

            // Проверяем, что это разработчик ИЛИ дизайнер И не исключенная профессия
            const isDeveloper = developerKeywords.some(keyword => title.toLowerCase().includes(keyword));
            const isDesigner = designerKeywords.some(keyword => title.toLowerCase().includes(keyword));
            const isItVacancy = (isDeveloper || isDesigner) && !isExcluded;
            
            if (isItVacancy) {
              results.push({
                id: `hh-filtered-${config.employmentType}-${index}`,
                title,
                salary,
                company,
                url,
                companyLogo: logo ? (logo.startsWith('http') ? logo : `https://hh.ru${logo}`) : undefined,
                companyUrl: companyUrl ? (companyUrl.startsWith('http') ? companyUrl : `https://hh.ru${companyUrl}`) : undefined,
                employment: [config.employmentType] // Устанавливаем тип занятости на основе фильтра
              });
              
              console.log(`✅ Добавлена IT-вакансия ${index + 1}: ${title} (${config.employmentType})`);
            } else {
              if (isExcluded) {
                console.log(`❌ Пропущена исключенная профессия: ${title}`);
              } else {
                console.log(`❌ Пропущена не-IT вакансия: ${title}`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Ошибка при парсинге вакансии ${index}:`, error);
        }
      });

      return results;
    }, { employmentType });

    console.log(`🎉 Найдено ${vacancies.length} вакансий с типом занятости: ${employmentType}`);
    return vacancies;

  } catch (error) {
    console.error(`❌ Ошибка парсинга HH.ru с фильтром ${employmentType}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

// Функция для парсинга всех типов занятости
export async function parseAllEmploymentTypes(query: string = "javascript"): Promise<Vacancy[]> {
  console.log(`🔍 Парсинг всех типов занятости для запроса: "${query}"`);
  
  // Добавляем больше типов занятости для получения большего количества вакансий
  const employmentTypes = ['full_time', 'part_time', 'project', 'contract', 'remote'];
    const allVacancies: Vacancy[] = [];
  
  // Парсим каждый тип занятости
  for (const employmentType of employmentTypes) {
    try {
      console.log(`\n📋 Парсинг типа занятости: ${employmentType}`);
      const vacancies = await parseHHWithEmploymentFilter(query, employmentType);
      allVacancies.push(...vacancies);
      
      // Уменьшенная пауза между запросами для ускорения
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Ошибка парсинга ${employmentType}:`, error);
    }
  }
  
  console.log(`\n📊 Итого найдено ${allVacancies.length} вакансий всех типов занятости`);
  return allVacancies;
}
