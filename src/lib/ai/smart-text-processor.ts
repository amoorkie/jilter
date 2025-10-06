// Умная текстовая обработка без AI
export interface SmartAnalysisResult {
  fullDescription: string;
  requirements: string;
  tasks: string;
  conditions: string;
  benefits: string;
  technologies: string[];
  experienceLevel: 'junior' | 'middle' | 'senior' | 'lead' | 'unknown';
  employmentType: 'full_time' | 'part_time' | 'project' | 'freelance' | 'internship' | 'volunteer' | 'unknown';
  remoteWork: boolean;
  salaryRange?: {
    min: number | null;
    max: number | null;
    currency: string;
  };
}

export function processVacancySmart(text: string): SmartAnalysisResult {
  console.log('🧠 Умная обработка текста вакансии...');
  
  // Нормализуем текст
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  
  // Извлекаем требования
  const requirements = extractRequirements(normalizedText);
  
  // Извлекаем задачи/обязанности
  const tasks = extractTasks(normalizedText);
  
  // Извлекаем условия
  const conditions = extractConditions(normalizedText);
  
  // Извлекаем льготы
  const benefits = extractBenefits(normalizedText);
  
  // Извлекаем технологии
  const technologies = extractTechnologies(normalizedText);
  
  // Определяем уровень опыта
  const experienceLevel = determineExperienceLevel(normalizedText);
  
  // Определяем тип занятости
  const employmentType = determineEmploymentType(normalizedText);
  
  // Определяем удаленную работу
  const remoteWork = determineRemoteWork(normalizedText);
  
  // Извлекаем зарплату
  const salaryRange = extractSalary(normalizedText);
  
  return {
    fullDescription: normalizedText,
    requirements,
    tasks,
    conditions,
    benefits,
    technologies,
    experienceLevel,
    employmentType,
    remoteWork,
    salaryRange
  };
}

function extractRequirements(text: string): string {
  const patterns = [
    /требования?[:\s]*([^.]*)/i,
    /требуется[:\s]*([^.]*)/i,
    /нужно[:\s]*([^.]*)/i,
    /необходимо[:\s]*([^.]*)/i,
    /обязательно[:\s]*([^.]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Требования не указаны';
}

function extractTasks(text: string): string {
  const patterns = [
    /обязанности?[:\s]*([^.]*)/i,
    /задачи?[:\s]*([^.]*)/i,
    /функции?[:\s]*([^.]*)/i,
    /будете[:\s]*([^.]*)/i,
    /заниматься[:\s]*([^.]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Обязанности не указаны';
}

function extractConditions(text: string): string {
  const patterns = [
    /условия?[:\s]*([^.]*)/i,
    /предлагаем[:\s]*([^.]*)/i,
    /обещаем[:\s]*([^.]*)/i,
    /гарантируем[:\s]*([^.]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Условия не указаны';
}

function extractBenefits(text: string): string {
  const patterns = [
    /льготы?[:\s]*([^.]*)/i,
    /бонусы?[:\s]*([^.]*)/i,
    /преимущества?[:\s]*([^.]*)/i,
    /плюсы?[:\s]*([^.]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Льготы не указаны';
}

function extractTechnologies(text: string): string[] {
  const techKeywords = [
    'Figma', 'Sketch', 'Adobe', 'Photoshop', 'Illustrator', 'InDesign',
    'Framer', 'Principle', 'After Effects', 'Blender', 'Maya', 'Cinema 4D',
    'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'HTML', 'CSS',
    'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin', 'Abstract'
  ];
  
  const found = techKeywords.filter(tech => 
    text.toLowerCase().includes(tech.toLowerCase())
  );
  
  return found;
}

function determineExperienceLevel(text: string): 'junior' | 'middle' | 'senior' | 'lead' | 'unknown' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('senior') || lowerText.includes('старший') || lowerText.includes('ведущий')) {
    return 'senior';
  }
  
  if (lowerText.includes('lead') || lowerText.includes('руководитель') || lowerText.includes('арт-директор')) {
    return 'lead';
  }
  
  if (lowerText.includes('junior') || lowerText.includes('младший') || lowerText.includes('начинающий')) {
    return 'junior';
  }
  
  if (lowerText.includes('middle') || lowerText.includes('средний') || lowerText.includes('опыт от 2')) {
    return 'middle';
  }
  
  return 'unknown';
}

function determineEmploymentType(text: string): 'full_time' | 'part_time' | 'project' | 'freelance' | 'internship' | 'volunteer' | 'unknown' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('удаленн') || lowerText.includes('remote')) {
    return 'full_time';
  }
  
  if (lowerText.includes('проект') || lowerText.includes('project')) {
    return 'project';
  }
  
  if (lowerText.includes('фриланс') || lowerText.includes('freelance')) {
    return 'freelance';
  }
  
  if (lowerText.includes('стажировка') || lowerText.includes('internship')) {
    return 'internship';
  }
  
  if (lowerText.includes('волонтер') || lowerText.includes('volunteer')) {
    return 'volunteer';
  }
  
  return 'full_time';
}

function determineRemoteWork(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes('удаленн') || lowerText.includes('remote') || lowerText.includes('из дома');
}

function extractSalary(text: string): { min: number | null; max: number | null; currency: string } | undefined {
  const salaryPatterns = [
    /(\d+)\s*-\s*(\d+)\s*(руб|₽|usd|\$|eur|€)/i,
    /от\s*(\d+)\s*(руб|₽|usd|\$|eur|€)/i,
    /до\s*(\d+)\s*(руб|₽|usd|\$|eur|€)/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const currency = match[3] || match[2] || 'руб';
      if (match[1] && match[2]) {
        return {
          min: parseInt(match[1]),
          max: parseInt(match[2]),
          currency: currency.toLowerCase()
        };
      } else if (match[1]) {
        return {
          min: parseInt(match[1]),
          max: null,
          currency: currency.toLowerCase()
        };
      }
    }
  }
  
  return undefined;
}







