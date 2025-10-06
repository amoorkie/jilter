// Простой API для вакансий без базы данных
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q') || '';
    
    console.log('🔍 Простой API /api/vacancies-simple вызван с параметрами:', { query });

    // Возвращаем тестовые вакансии
    const testVacancies = [
      {
        id: 'test-1',
        title: 'UI/UX Дизайнер',
        company: 'Тестовая компания',
        salary: '100000 - 150000 RUB',
        url: 'https://example.com/test-1',
        description: 'Тестовое описание',
        source: 'test',
        publishedAt: new Date().toISOString(),
        score: 0.8,
        matchedTokens: [],
        reasons: [],
        aiAnalysis: {
          specialization: 'design',
          employment: ['full_time'],
          experience: 'middle',
          technologies: ['Figma', 'Adobe Creative Suite'],
          remote: false,
          requirements: ['Опыт работы с дизайном'],
          benefits: ['Удаленная работа'],
          summary: 'Тестовая вакансия дизайнера'
        }
      },
      {
        id: 'test-2',
        title: 'Графический дизайнер',
        company: 'Дизайн студия',
        salary: '80000 - 120000 RUB',
        url: 'https://example.com/test-2',
        description: 'Тестовое описание',
        source: 'test',
        publishedAt: new Date().toISOString(),
        score: 0.7,
        matchedTokens: [],
        reasons: [],
        aiAnalysis: {
          specialization: 'design',
          employment: ['part_time', 'remote'],
          experience: 'junior',
          technologies: ['Photoshop', 'Illustrator'],
          remote: true,
          requirements: ['Знание Adobe Creative Suite'],
          benefits: ['Гибкий график'],
          summary: 'Тестовая вакансия графического дизайнера'
        }
      }
    ];

    return NextResponse.json({
      vacancies: testVacancies,
      total: testVacancies.length,
      hasMore: false,
      nextCursor: null,
      filters: {
        q: query,
        specialization: 'design',
        employment: [],
        experience: '',
        remote: false,
        minSalary: undefined,
        maxSalary: undefined,
        limit: 20,
        offset: 0
      },
      source: 'test'
    });

  } catch (error: any) {
    console.error('❌ Ошибка в простом API /api/vacancies-simple:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}