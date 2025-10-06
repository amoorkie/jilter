import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET(request: NextRequest) {
  try {
    const db = new SQLiteService();
    
    // Получаем все вакансии
    const vacancies = await db.getAllVacancies();
    
    return NextResponse.json({
      success: true,
      vacancies: vacancies
    });

  } catch (error: any) {
    console.error('❌ Ошибка загрузки всех вакансий:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка загрузки вакансий',
        details: error.message
      },
      { status: 500 }
    );
  }
}





