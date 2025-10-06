// Тестовый endpoint для проверки всех источников
import { NextRequest, NextResponse } from 'next/server';
import { parseAllVacancies } from '@/lib/parsers/unified-parser';
import { parseAllDesignVacancies } from '@/lib/parsers/enhanced-parser';
import { EnhancedHabrParser } from '@/lib/parsers/habr/enhanced-parser';

export async function GET(request: NextRequest) {
  console.log('🧪 Тестирование всех источников...');
  
  try {
    const results = {
      unifiedParser: { success: false, count: 0, error: null },
      enhancedParser: { success: false, count: 0, error: null },
      habrParser: { success: false, count: 0, error: null }
    };
    
    // Тестируем unified parser
    try {
      console.log('🔍 Тестируем unified parser...');
      const unifiedVacancies = await parseAllVacancies('дизайнер', 10);
      results.unifiedParser = { success: true, count: unifiedVacancies.length, error: null };
      console.log(`✅ Unified parser: ${unifiedVacancies.length} вакансий`);
    } catch (error: any) {
      results.unifiedParser = { success: false, count: 0, error: error.message };
      console.log(`❌ Unified parser: ${error.message}`);
    }
    
    // Тестируем enhanced parser
    try {
      console.log('🔍 Тестируем enhanced parser...');
      const enhancedVacancies = await parseAllDesignVacancies(5);
      results.enhancedParser = { success: true, count: enhancedVacancies.length, error: null };
      console.log(`✅ Enhanced parser: ${enhancedVacancies.length} вакансий`);
    } catch (error: any) {
      results.enhancedParser = { success: false, count: 0, error: error.message };
      console.log(`❌ Enhanced parser: ${error.message}`);
    }
    
    // Тестируем Habr parser
    try {
      console.log('🔍 Тестируем Habr parser...');
      const habrParser = new EnhancedHabrParser();
      await habrParser.init();
      const habrVacancies = await habrParser.parseDesignVacancies(3);
      await habrParser.close();
      results.habrParser = { success: true, count: habrVacancies.length, error: null };
      console.log(`✅ Habr parser: ${habrVacancies.length} вакансий`);
    } catch (error: any) {
      results.habrParser = { success: false, count: 0, error: error.message };
      console.log(`❌ Habr parser: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Тестирование всех источников завершено',
      results
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка при тестировании источников:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка при тестировании источников',
      error: error.message
    }, { status: 500 });
  }
}







