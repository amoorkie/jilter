// API для работы с вакансиями через микросервисы
import { NextRequest, NextResponse } from 'next/server';

const DATABASE_SERVICE_URL = 'http://localhost:8081';
const PARSER_SERVICE_URL = 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // Пока используем SQLite напрямую, позже переключимся на Database Service
    const response = await fetch(`${request.nextUrl.origin}/api/admin/pending`);
    const data = await response.json();
    
    return NextResponse.json({
      content: data.vacancies || [],
      totalElements: data.total || 0,
      page: parseInt(page),
      size: parseInt(limit),
      totalPages: Math.ceil((data.total || 0) / parseInt(limit))
    });

  } catch (error: any) {
    console.error('Ошибка получения вакансий:', error);
    return NextResponse.json(
      { error: 'Ошибка получения вакансий', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Пока сохраняем в SQLite, позже переключимся на Database Service
    const response = await fetch(`${request.nextUrl.origin}/api/admin/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Ошибка создания вакансии:', error);
    return NextResponse.json(
      { error: 'Ошибка создания вакансии', details: error.message },
      { status: 500 }
    );
  }
}







