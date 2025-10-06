import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid vacancy ID' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    
    try {
      const vacancy = await db.getVacancyById(id);
      
      if (!vacancy) {
        return NextResponse.json(
          { error: 'Vacancy not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        vacancy: vacancy
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('❌ Ошибка получения вакансии:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка получения вакансии',
        details: error.message
      },
      { status: 500 }
    );
  }
}