// Реальный парсер для извлечения типов занятости со страниц вакансий
import { chromium } from 'playwright';
import { Vacancy } from './unified-parser';

export async function parseRealEmployment(vacancyUrl: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    console.log(`🔍 Анализируем страницу вакансии: ${vacancyUrl}`);
    
    await page.goto(vacancyUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Извлекаем информацию о типе занятости
    const employmentInfo = await page.evaluate(() => {
      const employmentTypes: string[] = [];
      
      // Ищем различные селекторы для типа занятости
      const selectors = [
        '[data-qa="vacancy-view-employment-mode"]',
        '[data-qa="vacancy-view-schedule"]', 
        '.vacancy-employment-mode',
        '.vacancy-schedule',
        '.bloko-text_strong',
        '.bloko-text_secondary'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text && text.length < 100) {
            console.log(`Найден элемент: "${text}" (селектор: ${selector})`);
            
            // Анализируем текст на наличие типов занятости
            if (text.includes('полная занятость') || text.includes('full-time')) {
              employmentTypes.push('full_time');
            }
            if (text.includes('частичная занятость') || text.includes('part-time')) {
              employmentTypes.push('part_time');
            }
            if (text.includes('проектная работа') || text.includes('за проект')) {
              employmentTypes.push('project');
            }
            if (text.includes('контракт')) {
              employmentTypes.push('contract');
            }
            if (text.includes('стажировка') || text.includes('стажер')) {
              employmentTypes.push('internship');
            }
            if (text.includes('временная работа')) {
              employmentTypes.push('temporary');
            }
            if (text.includes('фриланс') || text.includes('за услугу')) {
              employmentTypes.push('freelance');
            }
            if (text.includes('удалённо') || text.includes('удаленно') || text.includes('remote')) {
              employmentTypes.push('remote');
            }
          }
        });
      }
      
      // Если ничего не нашли, анализируем весь текст страницы
      if (employmentTypes.length === 0) {
        const allText = document.body.textContent || '';
        console.log('Анализируем весь текст страницы...');
        
        if (allText.includes('полная занятость') || allText.includes('full-time')) {
          employmentTypes.push('full_time');
        }
        if (allText.includes('частичная занятость') || allText.includes('part-time')) {
          employmentTypes.push('part_time');
        }
        if (allText.includes('проектная работа') || allText.includes('за проект')) {
          employmentTypes.push('project');
        }
        if (allText.includes('контракт')) {
          employmentTypes.push('contract');
        }
        if (allText.includes('стажировка') || allText.includes('стажер')) {
          employmentTypes.push('internship');
        }
        if (allText.includes('временная работа')) {
          employmentTypes.push('temporary');
        }
        if (allText.includes('фриланс') || allText.includes('за услугу')) {
          employmentTypes.push('freelance');
        }
        if (allText.includes('удалённо') || allText.includes('удаленно') || allText.includes('remote')) {
          employmentTypes.push('remote');
        }
      }
      
      return employmentTypes;
    });

    console.log(`🎯 Реальные типы занятости для ${vacancyUrl}: [${employmentInfo.join(', ')}]`);
    return employmentInfo;

  } catch (error) {
    console.error(`❌ Ошибка при анализе ${vacancyUrl}:`, error);
    return ['full_time']; // По умолчанию
  } finally {
    await browser.close();
  }
}

// Функция для обновления существующих вакансий с реальными типами занятости
export async function updateVacanciesWithRealEmployment(vacancies: Vacancy[]): Promise<Vacancy[]> {
  console.log(`🔄 Обновляем ${vacancies.length} вакансий с реальными типами занятости...`);
  
  // Пока что возвращаем вакансии без изменений, чтобы не замедлять систему
  // В будущем здесь будет реальное извлечение типов занятости
  console.log(`⚠️ Пропускаем реальное извлечение типов занятости для ускорения`);
  
  return vacancies;
}
