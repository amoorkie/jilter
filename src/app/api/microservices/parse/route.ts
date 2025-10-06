// Этот маршрут более не используется: проект переведен на монолит (Python парсер вызывается напрямую)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Микросервисный парсинг отключен. Используйте POST /api/python-parse.'
  }, { status: 410 });
}


