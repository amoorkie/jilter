export type Employment =
  | 'full_time'
  | 'part_time'
  | 'project'
  | 'contract'
  | 'internship'
  | 'temporary'
  | 'freelance'
  | 'remote';

export type Specialization = 
  | 'frontend'
  | 'backend' 
  | 'fullstack'
  | 'mobile'
  | 'devops'
  | 'ui_designer'
  | 'ux_designer'
  | 'product_designer'
  | 'graphic_designer'
  | 'other';

// Маппинг типов занятости на русские названия
export const EMPLOYMENT_LABELS: Record<Employment, string> = {
  full_time: 'Полная занятость',
  part_time: 'Частичная занятость',
  project: 'Проектная работа',
  contract: 'Контракт',
  internship: 'Стажировка',
  temporary: 'Временная работа',
  freelance: 'Фриланс',
  remote: 'Удаленная работа'
};

// Маппинг специализаций на русские названия
export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  mobile: 'Mobile',
  devops: 'DevOps',
  ui_designer: 'UI Дизайнер',
  ux_designer: 'UX Дизайнер',
  product_designer: 'Продуктовый дизайнер',
  graphic_designer: 'Графический дизайнер',
  other: 'Другое'
};

// Хелпер для маппинга типов занятости из разных источников
export function mapEmployment(source: string, raw: string): Employment[] {
  const normalized = raw.toLowerCase().trim();
  const results: Employment[] = [];

  // Общие паттерны
  if (normalized.includes('полная') || normalized.includes('full-time') || normalized.includes('fulltime')) {
    results.push('full_time');
  }
  if (normalized.includes('частичная') || normalized.includes('part-time') || normalized.includes('parttime')) {
    results.push('part_time');
  }
  if (normalized.includes('проект') || normalized.includes('project')) {
    results.push('project');
  }
  if (normalized.includes('контракт') || normalized.includes('contract')) {
    results.push('contract');
  }
  if (normalized.includes('стажировка') || normalized.includes('internship') || normalized.includes('стажер')) {
    results.push('internship');
  }
  if (normalized.includes('временная') || normalized.includes('temporary') || normalized.includes('temp')) {
    results.push('temporary');
  }
  if (normalized.includes('фриланс') || normalized.includes('freelance')) {
    results.push('freelance');
  }
  if (normalized.includes('удаленно') || normalized.includes('удалённо') || normalized.includes('remote')) {
    results.push('remote');
  }

  // Если ничего не найдено, по умолчанию full_time
  if (results.length === 0) {
    results.push('full_time');
  }

  return results;
}

// Хелпер для определения специализации
export function detectSpecialization(title: string, description: string): Specialization {
  const text = `${title} ${description}`.toLowerCase();
  
  // Фильтруем только IT-вакансии
  const itKeywords = [
    'разработчик', 'developer', 'программист', 'programmer', 'кодер', 'coder',
    'frontend', 'backend', 'fullstack', 'mobile', 'devops', 'sre',
    'дизайнер', 'designer', 'ui', 'ux', 'product', 'graphic',
    'аналитик', 'analyst', 'data', 'scientist', 'ml', 'ai',
    'qa', 'тестировщик', 'tester', 'automation',
    'менеджер', 'manager', 'lead', 'architect', 'tech',
    'javascript', 'python', 'java', 'react', 'node', 'angular', 'vue',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter',
    'html', 'css', 'sql', 'nosql', 'api', 'rest', 'graphql',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform',
    'figma', 'sketch', 'photoshop', 'illustrator', 'adobe',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'git', 'github', 'gitlab', 'bitbucket', 'ci/cd',
    'linux', 'unix', 'windows', 'macos', 'ios', 'android'
  ];
  
  // Исключаем нежелательные профессии
  const excludeKeywords = [
    'маркетолог', 'marketing', 'менеджер', 'manager', 'аналитик', 'analyst',
    'тестировщик', 'tester', 'qa', 'автоматизатор', 'scientist', 'data',
    'контент', 'content', 'копирайтер', 'copywriter', 'smm', 'seo',
    'продажи', 'sales', 'рекрутер', 'hr', 'кадры', 'кадровый'
  ];

  const isExcluded = excludeKeywords.some(keyword => text.includes(keyword));
  if (isExcluded) {
    return 'other';
  }

  // Если нет IT-ключевых слов, возвращаем 'other' (будет отфильтровано)
  const hasItKeywords = itKeywords.some(keyword => text.includes(keyword));
  if (!hasItKeywords) {
    return 'other';
  }
  
  // Словари ключевых слов
  const frontendKeywords = ['react', 'next', 'vue', 'angular', 'javascript', 'typescript', 'frontend', 'front-end'];
  const backendKeywords = ['node', 'java', 'go', 'python', '.net', 'spring', 'nest', 'django', 'fastapi', 'backend', 'api', 'server'];
  const mobileKeywords = ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'mobile', 'app'];
  const devopsKeywords = ['devops', 'sre', 'kubernetes', 'k8s', 'terraform', 'ansible', 'ci/cd', 'docker', 'aws', 'azure'];
  
  // Дизайнерские ключевые слова
  const uiDesignerKeywords = ['ui дизайнер', 'ui designer', 'интерфейс', 'interface', 'figma', 'sketch', 'adobe xd', 'ui/ux'];
  const uxDesignerKeywords = ['ux дизайнер', 'ux designer', 'пользовательский опыт', 'user experience', 'исследования', 'research', 'usability'];
  const productDesignerKeywords = ['продуктовый дизайнер', 'product designer', 'продукт-дизайнер', 'product design'];
  const graphicDesignerKeywords = ['графический дизайнер', 'graphic designer', 'веб-дизайнер', 'web designer', 'иллюстратор', 'illustrator'];
  
  // Подсчет совпадений
  const frontendScore = frontendKeywords.filter(keyword => text.includes(keyword)).length;
  const backendScore = backendKeywords.filter(keyword => text.includes(keyword)).length;
  const mobileScore = mobileKeywords.filter(keyword => text.includes(keyword)).length;
  const devopsScore = devopsKeywords.filter(keyword => text.includes(keyword)).length;
  
  // Дизайнерские совпадения
  const uiDesignerScore = uiDesignerKeywords.filter(keyword => text.includes(keyword)).length;
  const uxDesignerScore = uxDesignerKeywords.filter(keyword => text.includes(keyword)).length;
  const productDesignerScore = productDesignerKeywords.filter(keyword => text.includes(keyword)).length;
  const graphicDesignerScore = graphicDesignerKeywords.filter(keyword => text.includes(keyword)).length;
  
  // Если есть и фронтенд и бэкенд ключи - fullstack
  if (frontendScore > 0 && backendScore > 0) {
    return 'fullstack';
  }
  
  // Определяем по максимальному счету
  const scores = [
    { type: 'frontend' as Specialization, score: frontendScore },
    { type: 'backend' as Specialization, score: backendScore },
    { type: 'mobile' as Specialization, score: mobileScore },
    { type: 'devops' as Specialization, score: devopsScore },
    { type: 'ui_designer' as Specialization, score: uiDesignerScore },
    { type: 'ux_designer' as Specialization, score: uxDesignerScore },
    { type: 'product_designer' as Specialization, score: productDesignerScore },
    { type: 'graphic_designer' as Specialization, score: graphicDesignerScore }
  ];
  
  const maxScore = Math.max(...scores.map(s => s.score));
  
  if (maxScore === 0) {
    return 'other';
  }
  
  const bestMatch = scores.find(s => s.score === maxScore);
  return bestMatch?.type || 'other';
}
