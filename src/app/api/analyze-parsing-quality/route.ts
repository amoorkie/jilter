// Анализ качества парсинга вакансий
import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET(request: NextRequest) {
  console.log('🔍 Анализ качества парсинга...');
  
  try {
    const db = new SQLiteService();
    
    // Получаем все вакансии
    const allVacancies = await db.getAllVacancies();
    
    // Анализируем качество по источникам
    const qualityAnalysis = {
      total: allVacancies.length,
      bySource: {} as any,
      qualityIssues: [] as string[]
    };
    
    // Группируем по источникам
    const bySource = allVacancies.reduce((acc, vacancy) => {
      if (!acc[vacancy.source]) {
        acc[vacancy.source] = [];
      }
      acc[vacancy.source].push(vacancy);
      return acc;
    }, {} as any);
    
    // Анализируем каждый источник
    for (const [source, vacancies] of Object.entries(bySource)) {
      const sourceVacancies = vacancies as any[];
      const analysis = {
        count: sourceVacancies.length,
        quality: {
          hasFullDescription: 0,
          hasRequirements: 0,
          hasTasks: 0,
          hasBenefits: 0,
          hasConditions: 0,
          hasCompanyInfo: 0,
          hasSalaryInfo: 0,
          hasLocationInfo: 0
        },
        issues: [] as string[]
      };
      
      sourceVacancies.forEach(vacancy => {
        // Проверяем наличие полного описания
        if (vacancy.full_description && vacancy.full_description.length > 100) {
          analysis.quality.hasFullDescription++;
        } else {
          analysis.issues.push(`Пустое описание: ${vacancy.title}`);
        }
        
        // Проверяем требования
        if (vacancy.requirements && vacancy.requirements.length > 10) {
          analysis.quality.hasRequirements++;
        }
        
        // Проверяем задачи
        if (vacancy.tasks && vacancy.tasks.length > 10) {
          analysis.quality.hasTasks++;
        }
        
        // Проверяем льготы
        if (vacancy.benefits && vacancy.benefits.length > 10) {
          analysis.quality.hasBenefits++;
        }
        
        // Проверяем условия
        if (vacancy.conditions && vacancy.conditions.length > 10) {
          analysis.quality.hasConditions++;
        }
        
        // Проверяем информацию о компании
        if (vacancy.company && vacancy.company.length > 2) {
          analysis.quality.hasCompanyInfo++;
        }
        
        // Проверяем зарплату
        if (vacancy.salary_min || vacancy.salary_max) {
          analysis.quality.hasSalaryInfo++;
        }
        
        // Проверяем локацию
        if (vacancy.location && vacancy.location.length > 2) {
          analysis.quality.hasLocationInfo++;
        }
      });
      
      // Вычисляем проценты
      const total = sourceVacancies.length;
      analysis.quality.hasFullDescription = Math.round((analysis.quality.hasFullDescription / total) * 100);
      analysis.quality.hasRequirements = Math.round((analysis.quality.hasRequirements / total) * 100);
      analysis.quality.hasTasks = Math.round((analysis.quality.hasTasks / total) * 100);
      analysis.quality.hasBenefits = Math.round((analysis.quality.hasBenefits / total) * 100);
      analysis.quality.hasConditions = Math.round((analysis.quality.hasConditions / total) * 100);
      analysis.quality.hasCompanyInfo = Math.round((analysis.quality.hasCompanyInfo / total) * 100);
      analysis.quality.hasSalaryInfo = Math.round((analysis.quality.hasSalaryInfo / total) * 100);
      analysis.quality.hasLocationInfo = Math.round((analysis.quality.hasLocationInfo / total) * 100);
      
      qualityAnalysis.bySource[source] = analysis;
    }
    
    // Определяем общие проблемы
    for (const [source, analysis] of Object.entries(qualityAnalysis.bySource)) {
      const sourceAnalysis = analysis as any;
      if (sourceAnalysis.quality.hasFullDescription < 50) {
        qualityAnalysis.qualityIssues.push(`${source}: Низкое качество описаний (${sourceAnalysis.quality.hasFullDescription}%)`);
      }
      if (sourceAnalysis.quality.hasRequirements < 30) {
        qualityAnalysis.qualityIssues.push(`${source}: Мало требований (${sourceAnalysis.quality.hasRequirements}%)`);
      }
      if (sourceAnalysis.quality.hasTasks < 30) {
        qualityAnalysis.qualityIssues.push(`${source}: Мало задач (${sourceAnalysis.quality.hasTasks}%)`);
      }
    }
    
    db.close();
    
    return NextResponse.json({
      success: true,
      analysis: qualityAnalysis
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка анализа качества:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}







