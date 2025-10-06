// API для одобрения вакансии
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
      await db.approveVacancy(parseInt(id), 'admin', notes);
      
      // Уведомляем об обновлении
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notify-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Уведомление об обновлении отправлено');
      } catch (notifyError) {
        console.log('⚠️ Не удалось отправить уведомление:', notifyError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Вакансия одобрена'
      });
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('Ошибка одобрения вакансии:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
