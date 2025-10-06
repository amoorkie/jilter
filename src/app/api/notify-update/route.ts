// API для уведомления об обновлении вакансий
import { NextRequest, NextResponse } from 'next/server';

// Простое хранилище для уведомлений (в реальном проекте используйте Redis или базу данных)
let lastUpdateTime = Date.now();

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      lastUpdate: lastUpdateTime,
      message: 'Время последнего обновления'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения времени обновления' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Обновляем время последнего изменения
    lastUpdateTime = Date.now();
    
    console.log(`🔄 Уведомление об обновлении: ${new Date(lastUpdateTime).toISOString()}`);
    
    return NextResponse.json({
      success: true,
      lastUpdate: lastUpdateTime,
      message: 'Время обновления изменено'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка обновления времени' },
      { status: 500 }
    );
  }
}














