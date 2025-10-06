// Тест Designer.ru парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseDesignerRuVacancies } from '@/lib/parsers/designer-ru/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем Designer.ru парсер');
    
    const vacancies = await parseDesignerRuVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'Designer.ru',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка Designer.ru парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка Designer.ru парсера', details: error.message },
      { status: 500 }
    );
  }
}















