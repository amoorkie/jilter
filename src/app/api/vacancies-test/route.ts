// src/app/api/vacancies-test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестовый API вакансий вызван');
    
    // Простой ответ с тестовыми данными
    const testVacancies = [
      {
        id: 'test-1',
        title: 'UI/UX Дизайнер',
        company: 'Тестовая компания',
        salary: '100000 - 150000 RUB',
        url: 'https://example.com',
        description: 'Тестовое описание вакансии',
        source: 'test',
        publishedAt: new Date().toISOString(),
        score: 0.8,
        matchedTokens: [],
        reasons: [],
        aiAnalysis: {
          specialization: 'frontend',
          employment: ['full_time'],
          experience: 'middle',
          technologies: ['Figma', 'Sketch'],
          remote: false,
          requirements: ['Опыт работы с Figma'],
          benefits: ['Удаленная работа'],
          summary: 'Тестовая вакансия для UI/UX дизайнера'
        }
      }
    ];
    
    return NextResponse.json({
      vacancies: testVacancies,
      total: testVacancies.length,
      hasMore: false,
      nextCursor: null,
      filters: {
        q: '',
        specialization: 'frontend',
        employment: [],
        scoreMin: 0,
        sources: [],
        minSalary: null,
        remote: null
      },
      source: 'test'
    });
  } catch (error) {
    console.error('❌ Ошибка в тестовом API вакансий:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}