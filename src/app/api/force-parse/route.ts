// API для принудительного запуска парсинга
import { NextRequest, NextResponse } from 'next/server';
import { parseFastDesignVacancies } from '@/lib/parsers/fast-parser';
import { SQLiteService } from '@/lib/database/sqlite-service';
import { analyzeVacancyWithGigaChat } from '@/lib/ai/gigachat-service';
import { processVacancySmart } from '@/lib/ai/smart-text-processor';
import { EnhancedHabrParser } from '@/lib/parsers/habr/enhanced-parser';
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

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Принудительный запуск парсинга...');
    
    // Инициализируем SQLite
    const db = new SQLiteService();

    try {
      // Принудительно запускаем парсинг из всех источников
      console.log('📊 Запускаем принудительный парсинг из всех источников...');
      
      // Сначала пробуем все источники
      const allSourcesVacancies = await parseAllVacancies('дизайнер', 20);
      console.log(`📊 Получено ${allSourcesVacancies.length} вакансий из всех источников`);
      
      let rawVacancies = allSourcesVacancies;
      
      // Если не нашли вакансии, используем улучшенный Habr парсер
      if (rawVacancies.length === 0) {
        console.log('⚠️ Все источники не нашли вакансии, используем улучшенный Habr парсер...');
        const enhancedParser = new EnhancedHabrParser();
        await enhancedParser.init();
        
        rawVacancies = await enhancedParser.parseDesignVacancies(3);
        await enhancedParser.close();
        
        console.log(`📊 Улучшенный Habr парсер нашел ${rawVacancies.length} вакансий`);
      }
      
      // Если все еще нет вакансий, используем быстрый парсер
      if (rawVacancies.length === 0) {
        console.log('⚠️ Улучшенный парсер не нашел вакансии, используем быстрый парсер...');
        const fastVacancies = await parseFastDesignVacancies(5);
        console.log(`📊 Быстрый парсер нашел ${fastVacancies.length} вакансий`);
        return NextResponse.json({
          success: true,
          message: `Парсинг завершен. Найдено ${fastVacancies.length} вакансий, сохранено 0`,
          stats: {
            total: 0,
            pending: 0,
            approved: 0,
            sources: {}
          }
        });
      }

      // Сохраняем вакансии в базу данных с AI-анализом
      let savedCount = 0;
      for (const vacancy of rawVacancies) {
        try {
          // AI-анализ для структурирования описания
          let structuredData = {
            fullDescription: vacancy.description || 'Описание не найдено',
            requirements: 'Требования не указаны',
            tasks: 'Обязанности не указаны',
            conditions: 'Условия не указаны',
            benefits: 'Льготы не указаны',
            technologies: [],
            experienceLevel: 'middle' as const,
            employmentType: 'full_time' as const,
            remoteWork: false,
            salaryRange: undefined
          };

          try {
            // AI-анализ с GigaChat (теперь работает!)
            console.log(`🤖 AI-анализ с GigaChat для ${vacancy.title}`);
            structuredData = await analyzeVacancyWithGigaChat(vacancy.description || '');
            console.log(`✅ AI-анализ завершен для ${vacancy.title}`);
          } catch (error) {
            console.log(`⚠️ Ошибка AI-анализа для ${vacancy.title}: ${error.message}`);
            // Fallback к умной обработке
            console.log(`🧠 Переключаемся на умную обработку для ${vacancy.title}`);
            structuredData = processVacancySmart(vacancy.description || '');
            console.log(`✅ Умная обработка завершена для ${vacancy.title}`);
          }

          const vacancyRecord = {
            external_id: vacancy.external_id,
            source: vacancy.source,
            url: vacancy.url,
            title: vacancy.title,
            company: vacancy.company,
            location: vacancy.location || '',
            description: vacancy.description,
            salary_min: vacancy.salary_min,
            salary_max: vacancy.salary_max,
            salary_currency: vacancy.salary_currency || 'RUB',
            published_at: vacancy.published_at || new Date().toISOString(),
            ai_specialization: 'design',
            ai_employment: [structuredData.employmentType],
            ai_experience: structuredData.experienceLevel,
            ai_technologies: structuredData.technologies,
            ai_salary_min: structuredData.salaryRange?.min,
            ai_salary_max: structuredData.salaryRange?.max,
            ai_remote: structuredData.remoteWork,
            ai_relevance_score: 0.8,
            ai_summary: 'Вакансия дизайнера',
          // Используем только полное описание - убираем дробление на блоки
          full_description: vacancy.full_description || structuredData.fullDescription,
          requirements: '', // Убираем дробление на блоки
          tasks: '',
          conditions: '',
          benefits: '',
            company_logo: vacancy.company_logo || '',
            company_url: vacancy.company_url || '',
            employment_type: vacancy.employment_type || structuredData.employmentType,
            experience_level: vacancy.experience_level || structuredData.experienceLevel,
            remote_type: vacancy.remote_type || (structuredData.remoteWork ? 'remote' : 'office')
          };

          // Логируем данные для отладки
          console.log(`📋 Данные для ${vacancy.title}:`);
          console.log(`  📝 Полное описание: ${vacancyRecord.full_description ? 'есть' : 'нет'} (${vacancyRecord.full_description?.length || 0} символов)`);
          console.log(`  📝 Исходное описание из парсера: ${vacancy.full_description ? 'есть' : 'нет'} (${vacancy.full_description?.length || 0} символов)`);
          
          await db.saveVacancy(vacancyRecord);
          savedCount++;
          console.log(`✅ Сохранена вакансия: ${vacancy.title} (${vacancy.source})`);
        } catch (error) {
          console.error(`❌ Ошибка сохранения вакансии ${vacancy.title}:`, error);
        }
      }

      console.log(`✅ Сохранено ${savedCount} вакансий в базу данных`);

      // Получаем статистику
      const allVacancies = await db.getAllVacancies();
      const pendingVacancies = await db.getPendingVacancies();
      const approvedVacancies = await db.getApprovedVacancies();

      return NextResponse.json({
        success: true,
        message: `Парсинг завершен. Найдено ${rawVacancies.length} вакансий, сохранено ${savedCount}`,
        stats: {
          total: allVacancies.length,
          pending: pendingVacancies.length,
          approved: approvedVacancies.length,
          sources: rawVacancies.reduce((acc, v) => {
            acc[v.source] = (acc[v.source] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('❌ Ошибка принудительного парсинга:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

