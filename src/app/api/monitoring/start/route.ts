// API для запуска мониторинга
import { NextRequest, NextResponse } from 'next/server';
import { vacancyMonitor } from '@/lib/monitoring/scheduler';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Запуск мониторинга вакансий');
    
    vacancyMonitor.start();
    
    return NextResponse.json({
      success: true,
      message: 'Мониторинг запущен',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка запуска мониторинга:', error);
    return NextResponse.json(
      { error: 'Ошибка запуска мониторинга', details: error.message },
      { status: 500 }
    );
  }
}














