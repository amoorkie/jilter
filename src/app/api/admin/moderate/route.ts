// API для модерации вакансий
import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function POST(request: NextRequest) {
  try {
    const { id, action, notes, moderator } = await request.json();
    
    if (!id || !action || !moderator) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action, moderator' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    
    try {
      if (action === 'approve') {
        await db.approveVacancy(id, moderator, notes);
        return NextResponse.json({ success: true, message: 'Вакансия одобрена' });
      } else if (action === 'reject') {
        await db.rejectVacancy(id, moderator, notes);
        return NextResponse.json({ success: true, message: 'Вакансия отклонена' });
      } else {
        return NextResponse.json(
          { error: 'Invalid action. Use "approve" or "reject"' },
          { status: 400 }
        );
      }
    } finally {
      db.close();
    }
  } catch (error: any) {
    console.error('Ошибка модерации:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}









