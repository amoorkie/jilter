// Тест HireHi парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseHireHiVacancies } from '@/lib/parsers/hirehi/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем HireHi парсер');
    
    const vacancies = await parseHireHiVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'HireHi',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка HireHi парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка HireHi парсера', details: error.message },
      { status: 500 }
    );
  }
}















