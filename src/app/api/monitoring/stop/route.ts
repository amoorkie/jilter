// API для остановки мониторинга
import { NextRequest, NextResponse } from 'next/server';
import { vacancyMonitor } from '@/lib/monitoring/scheduler';

export async function POST(request: NextRequest) {
  try {
    console.log('🛑 Остановка мониторинга вакансий');
    
    vacancyMonitor.stop();
    
    return NextResponse.json({
      success: true,
      message: 'Мониторинг остановлен',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка остановки мониторинга:', error);
    return NextResponse.json(
      { error: 'Ошибка остановки мониторинга', details: error.message },
      { status: 500 }
    );
  }
}














