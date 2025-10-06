import { NextRequest, NextResponse } from 'next/server';
import { EnhancedHabrParser } from '@/lib/parsers/habr/enhanced-parser';

export async function GET(request: NextRequest) {
  console.log('🧪 Тестирование улучшенного Habr парсера...');
  
  const parser = new EnhancedHabrParser();
  
  try {
    await parser.init();
    
    // Тестируем парсинг с лимитом 3 вакансии
    console.log('\n🔍 Запускаем парсинг 3 вакансий...');
    const vacancies = await parser.parseDesignVacancies(3);
    
    console.log(`\n📊 Результат: ${vacancies.length} вакансий`);
    
    // Логируем первую вакансию для проверки
    if (vacancies.length > 0) {
      const first = vacancies[0];
      console.log('\n📋 Первая вакансия:');
      console.log(`  📝 Заголовок: ${first.title}`);
      console.log(`  🏢 Компания: ${first.company}`);
      console.log(`  📍 Локация: ${first.location}`);
      console.log(`  💰 Зарплата: ${first.salary_min ? `${first.salary_min}-${first.salary_max} ${first.salary_currency}` : 'не указана'}`);
      console.log(`  📄 URL: ${first.url}`);
      console.log(`  📝 Описание (первые 200 символов): ${first.description.substring(0, 200)}...`);
      console.log(`  📋 Полное описание: ${first.full_description ? first.full_description.substring(0, 200) + '...' : 'не найдено'}`);
      console.log(`  📋 Требования: ${first.requirements ? first.requirements.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Задачи: ${first.tasks ? first.tasks.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Льготы: ${first.benefits ? first.benefits.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Условия: ${first.conditions ? first.conditions.substring(0, 100) + '...' : 'не найдены'}`);
    }
    
    await parser.close();
    
    return NextResponse.json({
      success: true,
      message: `Успешно обработано ${vacancies.length} вакансий`,
      vacancies: vacancies,
      stats: {
        total: vacancies.length,
        withFullDescription: vacancies.filter(v => v.full_description).length,
        withRequirements: vacancies.filter(v => v.requirements).length,
        withTasks: vacancies.filter(v => v.tasks).length,
        withBenefits: vacancies.filter(v => v.benefits).length,
        withConditions: vacancies.filter(v => v.conditions).length
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании улучшенного парсера:', error);
    
    await parser.close();
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при тестировании улучшенного парсера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}







