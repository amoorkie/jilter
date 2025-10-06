// API для работы с вакансиями через DeepSeek AI и SQLite
import { NextRequest, NextResponse } from 'next/server';
import { Employment } from '@/lib/types/employment';
import { analyzeVacancyWithGigaChat, filterVacanciesWithGigaChat } from '@/lib/ai/gigachat-service';
import { SQLiteService } from '@/lib/database/sqlite-service';
import { parseAllDesignVacancies } from '@/lib/parsers/enhanced-parser';
import { parseAllVacancies } from '@/lib/parsers/unified-parser';

// Простая функция для структурирования описания вакансии
async function processVacancyDescription(description: string) {
  // Извлекаем требования
  const requirementsMatch = description.match(/(?:требования?|требуется?|нужно?|необходимо?)[:.]?\s*([^.]*)/i);
  const requirements = requirementsMatch ? requirementsMatch[1].trim() : 'Требования не указаны';

  // Извлекаем задачи/обязанности
  const tasksMatch = description.match(/(?:задачи?|обязанности?|функции?|что\s+делать?)[:.]?\s*([^.]*)/i);
  const tasks = tasksMatch ? tasksMatch[1].trim() : 'Обязанности не указаны';

  // Извлекаем условия
  const conditionsMatch = description.match(/(?:условия?|что\s+предлагаем?|мы\s+предлагаем?)[:.]?\s*([^.]*)/i);
  const conditions = conditionsMatch ? conditionsMatch[1].trim() : 'Условия не указаны';

  // Извлекаем льготы
  const benefitsMatch = description.match(/(?:льготы?|преимущества?|бонусы?|плюсы?)[:.]?\s*([^.]*)/i);
  const benefits = benefitsMatch ? benefitsMatch[1].trim() : 'Льготы не указаны';

  // Определяем технологии
  const technologies = [];
  if (description.toLowerCase().includes('figma')) technologies.push('Figma');
  if (description.toLowerCase().includes('sketch')) technologies.push('Sketch');
  if (description.toLowerCase().includes('adobe')) technologies.push('Adobe Creative Suite');
  if (description.toLowerCase().includes('photoshop')) technologies.push('Photoshop');
  if (description.toLowerCase().includes('illustrator')) technologies.push('Illustrator');
  if (description.toLowerCase().includes('after effects')) technologies.push('After Effects');

  // Определяем уровень опыта
  let experienceLevel = 'middle';
  if (description.toLowerCase().includes('junior') || description.toLowerCase().includes('младший')) {
    experienceLevel = 'junior';
  } else if (description.toLowerCase().includes('senior') || description.toLowerCase().includes('старший')) {
    experienceLevel = 'senior';
  } else if (description.toLowerCase().includes('lead') || description.toLowerCase().includes('ведущий')) {
    experienceLevel = 'lead';
  }

  // Определяем тип занятости
  let employmentType = 'full_time';
  if (description.toLowerCase().includes('удаленн') || description.toLowerCase().includes('remote')) {
    employmentType = 'remote';
  } else if (description.toLowerCase().includes('частичн') || description.toLowerCase().includes('part time')) {
    employmentType = 'part_time';
  } else if (description.toLowerCase().includes('проект') || description.toLowerCase().includes('project')) {
    employmentType = 'project';
  } else if (description.toLowerCase().includes('фриланс') || description.toLowerCase().includes('freelance')) {
    employmentType = 'freelance';
  }

  // Определяем удаленную работу
  const remoteWork = description.toLowerCase().includes('удаленн') || description.toLowerCase().includes('remote');

  return {
    fullDescription: description || 'Описание не найдено',
    requirements: requirements,
    tasks: tasks,
    conditions: conditions,
    benefits: benefits,
    technologies: technologies,
    experienceLevel: experienceLevel as 'junior' | 'middle' | 'senior' | 'lead',
    employmentType: employmentType as 'full_time' | 'part_time' | 'remote' | 'project' | 'freelance',
    remoteWork: remoteWork,
    salaryRange: undefined
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Параметры поиска
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const specialization = searchParams.get('specialization') || 'design';
    const employment = searchParams.getAll('employment[]') as Employment[];
    const experience = searchParams.get('experience') || '';
    const remote = searchParams.get('remote') === 'true';
    const minSalary = searchParams.get('minSalary') ? parseInt(searchParams.get('minSalary')!) : undefined;
    const maxSalary = searchParams.get('maxSalary') ? parseInt(searchParams.get('maxSalary')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🔍 API /api/vacancies вызван с параметрами:', {
      query, specialization, employment, experience, remote, minSalary, maxSalary, limit, offset
    });

    // Инициализируем SQLite
    const db = new SQLiteService();

    try {
      // Сначала проверяем, есть ли вакансии в базе
      const existingVacancies = await db.getAllVacancies();
      
      // Если в базе меньше 10 вакансий, запускаем парсинг
      if (existingVacancies.length < 10) {
        console.log('📊 База данных пуста, запускаем парсинг...');
        
        // Парсим реальные вакансии из всех источников
        console.log('🔍 Запускаем парсинг из всех источников...');
        const rawVacancies = await parseAllVacancies('дизайнер', 50);
        console.log(`📊 Получено ${rawVacancies.length} вакансий из всех источников`);

        // Сохраняем вакансии в базу данных с AI-анализом
        for (const vacancy of rawVacancies) {
          let structuredData = {
            fullDescription: vacancy.description || '',
            requirements: '',
            tasks: '',
            conditions: '',
            benefits: '',
            technologies: [],
            experienceLevel: 'middle',
            employmentType: 'full_time',
            remoteWork: false,
            salaryRange: undefined
          };
          
          try {
            // Временно отключаем AI-анализ, используем простую текстовую обработку
            console.log(`📝 Обрабатываем описание для ${vacancy.title}`);
            structuredData = await processVacancyDescription(vacancy.description || '');
            console.log(`✅ Обработка завершена для ${vacancy.title}`);
          } catch (error) {
            console.log(`⚠️ Ошибка AI-анализа для ${vacancy.title}: ${error.message}`);
            // Fallback к дефолтным значениям
            structuredData = {
              fullDescription: vacancy.description || 'Описание не найдено',
              requirements: 'Требования не указаны',
              tasks: 'Обязанности не указаны',
              conditions: 'Условия не указаны',
              benefits: 'Льготы не указаны',
              technologies: [],
              experienceLevel: 'unknown' as const,
              employmentType: 'unknown' as const,
              remoteWork: false,
              salaryRange: undefined
            };
          }
          
          const vacancyRecord = {
            external_id: vacancy.id,
            source: vacancy.source,
            url: vacancy.url,
            title: vacancy.title,
            company: vacancy.company,
            location: vacancy.location || '',
            description: structuredData.fullDescription,
            salary_min: structuredData.salaryRange?.min,
            salary_max: structuredData.salaryRange?.max,
            salary_currency: structuredData.salaryRange?.currency || 'RUB',
            published_at: new Date().toISOString(),
            ai_specialization: 'design',
            ai_employment: [structuredData.employmentType],
            ai_experience: structuredData.experienceLevel,
            ai_technologies: structuredData.technologies,
            ai_salary_min: structuredData.salaryRange?.min,
            ai_salary_max: structuredData.salaryRange?.max,
            ai_remote: structuredData.remoteWork,
            ai_relevance_score: 0.8,
            ai_summary: 'Вакансия дизайнера',
            full_description: structuredData.fullDescription || 'Описание не найдено',
            requirements: structuredData.requirements || 'Требования не указаны',
            tasks: structuredData.tasks || 'Обязанности не указаны',
            conditions: structuredData.conditions || 'Условия не указаны',
            benefits: structuredData.benefits || 'Льготы не указаны',
            company_logo: '',
            company_url: '',
            employment_type: structuredData.employmentType,
            experience_level: structuredData.experienceLevel,
            remote_type: structuredData.remoteWork ? 'remote' : 'office'
          };

          console.log(`🔍 Сохраняем вакансию: ${vacancy.title}`);
          console.log(`📝 full_description: ${vacancyRecord.full_description}`);
          console.log(`📝 requirements: ${vacancyRecord.requirements}`);
          console.log(`📝 tasks: ${vacancyRecord.tasks}`);
          console.log(`📝 conditions: ${vacancyRecord.conditions}`);
          console.log(`📝 benefits: ${vacancyRecord.benefits}`);
          
          await db.saveVacancy(vacancyRecord);
          console.log(`✅ Сохранена вакансия с AI-анализом: ${vacancy.title}`);
        }

        console.log(`✅ Сохранено ${rawVacancies.length} вакансий в базу данных`);
      }

        // Получаем только одобренные вакансии из базы
        const approvedVacancies = await db.getApprovedVacancies();
      
      // Форматируем вакансии для ответа
      const formattedVacancies = approvedVacancies.map(vacancy => ({
        id: vacancy.external_id,
        title: vacancy.title,
        company: vacancy.company,
        salary: vacancy.salary_min && vacancy.salary_max 
          ? `${vacancy.salary_min.toLocaleString()} - ${vacancy.salary_max.toLocaleString()} ${vacancy.salary_currency}`
          : 'Зарплата не указана',
        url: vacancy.url,
        description: vacancy.description,
        source: vacancy.source,
        publishedAt: vacancy.published_at,
        score: vacancy.ai_relevance_score,
        matchedTokens: [],
        reasons: [],
        aiAnalysis: {
          specialization: vacancy.ai_specialization,
          employment: vacancy.ai_employment, // Уже обработано в SQLiteService
          experience: vacancy.ai_experience,
          technologies: vacancy.ai_technologies, // Уже обработано в SQLiteService
          remote: vacancy.ai_remote,
          requirements: [],
          benefits: [],
          summary: vacancy.ai_summary
        }
      }));

      return NextResponse.json({
        vacancies: formattedVacancies,
        total: formattedVacancies.length,
        hasMore: false,
        nextCursor: null,
        filters: {
          q: query,
          specialization: 'design',
          employment: [],
          experience: '',
          remote: false,
          minSalary: undefined,
          maxSalary: undefined,
          limit: 20,
          offset: 0
        },
        source: 'database'
      });

    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('❌ Ошибка в API /api/vacancies:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}