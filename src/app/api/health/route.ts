import { NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET() {
  try {
    // Проверяем подключение к базе данных
    const db = new SQLiteService();
    const result = db.db.prepare('SELECT 1 as test').get();
    db.close();
    
    if (result) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

