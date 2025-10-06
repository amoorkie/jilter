// API для получения вакансий, ожидающих модерации
import { NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET() {
  try {
    const db = new SQLiteService();
    
    try {
      const pendingVacancies = await db.getPendingVacancies();
      
      return NextResponse.json({
        vacancies: pendingVacancies,
        total: pendingVacancies.length
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('Ошибка получения вакансий для модерации:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}














