// Парсер для сбора детальной информации о вакансиях
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export interface DetailedVacancy {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  source: string;
  publishedAt: Date;
  // Детальная информация
  fullDescription: string;
  requirements: string;
  tasks: string;
  conditions: string;
  benefits: string;
  companyLogo?: string;
  companyUrl?: string;
  employmentType?: string;
  experienceLevel?: string;
  remoteType?: string;
}

export async function parseVacancyDetails(vacancyUrl: string, source: string): Promise<DetailedVacancy | null> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`🔍 Парсинг детальной информации: ${vacancyUrl}`);
    
    await page.goto(vacancyUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Извлекаем основную информацию
    const title = extractTitle($, source);
    const company = extractCompany($, source);
    const salary = extractSalary($, source);
    
    if (!title || !company) {
      console.log(`⚠️ Неполная информация для ${vacancyUrl}`);
      return null;
    }

    // Извлекаем детальную информацию
    const fullDescription = extractFullDescription($, source);
    const requirements = extractRequirements($, source);
    const tasks = extractTasks($, source);
    const conditions = extractConditions($, source);
    const benefits = extractBenefits($, source);
    const companyLogo = extractCompanyLogo($, source);
    const companyUrl = extractCompanyUrl($, source);
    const employmentType = extractEmploymentType($, source);
    const experienceLevel = extractExperienceLevel($, source);
    const remoteType = extractRemoteType($, source);

    const detailedVacancy: DetailedVacancy = {
      id: generateId(vacancyUrl),
      title,
      company,
      salary,
      url: vacancyUrl,
      source,
      publishedAt: new Date(),
      fullDescription,
      requirements,
      tasks,
      conditions,
      benefits,
      companyLogo,
      companyUrl,
      employmentType,
      experienceLevel,
      remoteType
    };

    console.log(`✅ Детальная информация собрана: ${title}`);
    return detailedVacancy;

  } catch (error) {
    console.error(`❌ Ошибка при парсинге ${vacancyUrl}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

// Функции извлечения для разных источников
function extractTitle($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': 'h1[data-qa="vacancy-title"]',
    'Geekjob': 'h1.vacancy-title, .job-title',
    'HireHi': 'h1.job-title, .vacancy-title',
    'GetMatch': 'h1.vacancy-title, .job-title',
    'Habr': 'h1.vacancy-title, .job-title',
    'default': 'h1, .title, .job-title, .vacancy-title'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  return $(selector).first().text().trim() || '';
}

function extractCompany($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': '[data-qa="vacancy-company-name"]',
    'Geekjob': '.company-name, .employer-name',
    'HireHi': '.company-name, .employer-name',
    'GetMatch': '.company-name, .employer-name',
    'Habr': '.company-name, .employer-name',
    'default': '.company-name, .employer-name, .company'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  return $(selector).first().text().trim() || '';
}

function extractSalary($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': '[data-qa="vacancy-salary"]',
    'Geekjob': '.salary, .wage',
    'HireHi': '.salary, .wage',
    'GetMatch': '.salary, .wage',
    'Habr': '.salary, .wage',
    'default': '.salary, .wage, .compensation'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  return $(selector).first().text().trim() || 'Зарплата не указана';
}

function extractFullDescription($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': '[data-qa="vacancy-description"]',
    'Geekjob': '.job-description, .vacancy-description, .b-vacancy-description',
    'HireHi': '.job-description, .vacancy-description, .b-vacancy-description',
    'GetMatch': '.b-vacancy-description, .job-description, .vacancy-description',
    'Habr': '.job-description, .vacancy-description, .b-vacancy-description',
    'default': '.description, .job-description, .vacancy-description, .b-vacancy-description'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  const element = $(selector).first();
  
  if (element.length) {
    // Извлекаем HTML содержимое для сохранения структуры
    return element.html() || element.text().trim() || '';
  }
  
  return '';
}

function extractRequirements($: cheerio.CheerioAPI, source: string): string {
  // Сначала ищем в основном блоке описания
  const mainBlock = $('.b-vacancy-description, [data-qa="vacancy-description"], .job-description, .vacancy-description').first();
  
  if (mainBlock.length) {
    // Ищем секции с требованиями внутри основного блока
    const requirementKeywords = ['ожидания', 'expectations', 'требования', 'requirements', 'квалификация', 'навыки', 'skills'];
    
    for (const keyword of requirementKeywords) {
      const section = findSectionInBlock(mainBlock, keyword);
      if (section) {
        return section;
      }
    }
  }

  // Альтернативные селекторы
  const selectors = {
    'HH.ru': '[data-qa="vacancy-requirements"]',
    'Geekjob': '.requirements, .skills, .expectations',
    'HireHi': '.requirements, .skills, .expectations',
    'GetMatch': '.requirements, .skills, .expectations',
    'Habr': '.requirements, .skills, .expectations',
    'default': '.requirements, .skills, .qualifications, .expectations'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  const element = $(selector).first();
  
  if (element.length) {
    return element.html() || element.text().trim() || '';
  }
  
  return '';
}

function extractTasks($: cheerio.CheerioAPI, source: string): string {
  // Сначала ищем в основном блоке описания
  const mainBlock = $('.b-vacancy-description, [data-qa="vacancy-description"], .job-description, .vacancy-description').first();
  
  if (mainBlock.length) {
    // Ищем секции с задачами внутри основного блока
    const taskKeywords = ['задачи', 'tasks', 'обязанности', 'responsibilities', 'что делать'];
    
    for (const keyword of taskKeywords) {
      const section = findSectionInBlock(mainBlock, keyword);
      if (section) {
        return section;
      }
    }
  }

  // Альтернативные селекторы
  const selectors = {
    'HH.ru': '[data-qa="vacancy-tasks"]',
    'Geekjob': '.tasks, .responsibilities',
    'HireHi': '.tasks, .responsibilities',
    'GetMatch': '.tasks, .responsibilities',
    'Habr': '.tasks, .responsibilities',
    'default': '.tasks, .responsibilities, .duties'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  const element = $(selector).first();
  
  if (element.length) {
    return element.html() || element.text().trim() || '';
  }
  
  return '';
}

function extractConditions($: cheerio.CheerioAPI, source: string): string {
  // Сначала ищем в основном блоке описания
  const mainBlock = $('.b-vacancy-description, [data-qa="vacancy-description"], .job-description, .vacancy-description').first();
  
  if (mainBlock.length) {
    // Ищем секции с условиями внутри основного блока
    const conditionKeywords = ['условия', 'conditions', 'что мы предлагаем', 'мы предлагаем'];
    
    for (const keyword of conditionKeywords) {
      const section = findSectionInBlock(mainBlock, keyword);
      if (section) {
        return section;
      }
    }
  }

  // Альтернативные селекторы
  const selectors = {
    'HH.ru': '[data-qa="vacancy-conditions"]',
    'Geekjob': '.conditions, .benefits',
    'HireHi': '.conditions, .benefits',
    'GetMatch': '.conditions, .benefits',
    'Habr': '.conditions, .benefits',
    'default': '.conditions, .benefits, .offerings'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  const element = $(selector).first();
  
  if (element.length) {
    return element.html() || element.text().trim() || '';
  }
  
  return '';
}

function extractBenefits($: cheerio.CheerioAPI, source: string): string {
  // Сначала ищем в основном блоке описания
  const mainBlock = $('.b-vacancy-description, [data-qa="vacancy-description"], .job-description, .vacancy-description').first();
  
  if (mainBlock.length) {
    // Ищем секции с льготами внутри основного блока
    const benefitKeywords = ['льготы', 'benefits', 'преимущества', 'advantages', 'что получите'];
    
    for (const keyword of benefitKeywords) {
      const section = findSectionInBlock(mainBlock, keyword);
      if (section) {
        return section;
      }
    }
  }

  return '';
}

function extractCompanyLogo($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': '[data-qa="vacancy-company-logo"] img',
    'Geekjob': '.company-logo img, .employer-logo img',
    'HireHi': '.company-logo img, .employer-logo img',
    'GetMatch': '.company-logo img, .employer-logo img',
    'Habr': '.company-logo img, .employer-logo img',
    'default': '.company-logo img, .employer-logo img, .logo img'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  const img = $(selector).first();
  return img.attr('src') || img.attr('data-src') || '';
}

function extractCompanyUrl($: cheerio.CheerioAPI, source: string): string {
  const selectors = {
    'HH.ru': '[data-qa="vacancy-company-url"]',
    'Geekjob': '.company-url, .employer-url',
    'HireHi': '.company-url, .employer-url',
    'GetMatch': '.company-url, .employer-url',
    'Habr': '.company-url, .employer-url',
    'default': '.company-url, .employer-url, .company-link'
  };

  const selector = selectors[source as keyof typeof selectors] || selectors.default;
  return $(selector).first().attr('href') || '';
}

function extractEmploymentType($: cheerio.CheerioAPI, source: string): string {
  const employmentKeywords = ['полная занятость', 'частичная занятость', 'удаленная работа', 'проектная работа'];
  
  const text = $('body').text().toLowerCase();
  for (const keyword of employmentKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  return '';
}

function extractExperienceLevel($: cheerio.CheerioAPI, source: string): string {
  const experienceKeywords = ['junior', 'middle', 'senior', 'lead', 'джуниор', 'миддл', 'сеньор', 'лид'];
  
  const text = $('body').text().toLowerCase();
  for (const keyword of experienceKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  return '';
}

function extractRemoteType($: cheerio.CheerioAPI, source: string): string {
  const remoteKeywords = ['удаленно', 'remote', 'офис', 'office', 'гибрид', 'hybrid'];
  
  const text = $('body').text().toLowerCase();
  for (const keyword of remoteKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  return '';
}

// Вспомогательная функция для поиска секций по ключевым словам
function findSectionByKeyword($: cheerio.CheerioAPI, keyword: string): string {
  // Ищем заголовки с ключевым словом
  const headings = $(`h1, h2, h3, h4, h5, h6, .section-title, .block-title`).filter((_, el) => {
    return $(el).text().toLowerCase().includes(keyword.toLowerCase());
  });

  if (headings.length > 0) {
    const heading = headings.first();
    const content = heading.nextUntil('h1, h2, h3, h4, h5, h6, .section-title, .block-title').text().trim();
    if (content) {
      return content;
    }
  }

  // Ищем в тексте страницы
  const text = $('body').text();
  const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (keywordIndex !== -1) {
    const start = Math.max(0, keywordIndex - 100);
    const end = Math.min(text.length, keywordIndex + 1000);
    return text.substring(start, end).trim();
  }

  return '';
}

// Вспомогательная функция для поиска секций внутри конкретного блока
function findSectionInBlock(block: cheerio.Cheerio<cheerio.Element>, keyword: string): string {
  // Ищем заголовки с ключевым словом внутри блока
  const headings = block.find(`h1, h2, h3, h4, h5, h6, .section-title, .block-title, strong, b`).filter((_, el) => {
    return block.find(el).text().toLowerCase().includes(keyword.toLowerCase());
  });

  if (headings.length > 0) {
    const heading = headings.first();
    const headingElement = block.find(heading);
    
    // Получаем содержимое после заголовка до следующего заголовка
    let content = '';
    let nextElement = headingElement.next();
    
    while (nextElement.length > 0) {
      const tagName = nextElement.prop('tagName')?.toLowerCase();
      
      // Останавливаемся на следующем заголовке
      if (tagName && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        break;
      }
      
      // Останавливаемся на следующем strong/b элементе
      if (tagName && ['strong', 'b'].includes(tagName)) {
        const text = nextElement.text().toLowerCase();
        if (text.includes('ожидания') || text.includes('задачи') || text.includes('условия') || 
            text.includes('требования') || text.includes('льготы')) {
          break;
        }
      }
      
      content += nextElement.html() || nextElement.text() + '\n';
      nextElement = nextElement.next();
    }
    
    if (content.trim()) {
      return content.trim();
    }
  }

  // Ищем в тексте блока
  const text = block.text();
  const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (keywordIndex !== -1) {
    const start = Math.max(0, keywordIndex - 50);
    const end = Math.min(text.length, keywordIndex + 1000);
    return text.substring(start, end).trim();
  }

  return '';
}

function generateId(url: string): string {
  return `detail-${Buffer.from(url).toString('base64').slice(0, 10)}`;
}
