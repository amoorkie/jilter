// API для отклонения вакансии
import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { notes } = await request.json();
    
    const db = new SQLiteService();
    
    try {
      await db.rejectVacancy(parseInt(id), 'admin', notes);
      
      return NextResponse.json({
        success: true,
        message: 'Вакансия отклонена'
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('Ошибка отклонения вакансии:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
