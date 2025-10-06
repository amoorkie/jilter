// API для получения статистики мониторинга
import { NextRequest, NextResponse } from 'next/server';
import { vacancyMonitor } from '@/lib/monitoring/scheduler';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Получение статистики мониторинга');
    
    const stats = await vacancyMonitor.getStats();
    
    if (!stats) {
      return NextResponse.json(
        { error: 'Не удалось получить статистику' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка получения статистики:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статистики', details: error.message },
      { status: 500 }
    );
  }
}














