import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function POST(request: NextRequest) {
  try {
    const { id, description } = await request.json();
    
    if (!id || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: id, description' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    
    try {
      // Обновляем отредактированное описание вакансии
      await db.updateVacancy(id, { 
        edited_description: description,
        updated_at: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Описание обновлено успешно' 
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('❌ Ошибка обновления описания:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка обновления описания',
        details: error.message
      },
      { status: 500 }
    );
  }
}
