// Простой API endpoint для тестирования
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vacancyExternalId = params.id;
    console.log(`🔍 Простой API /api/vacancy/${vacancyExternalId} вызван`);
    
    // Возвращаем простой ответ для тестирования
    return NextResponse.json({ 
      vacancy: {
        id: 1,
        externalId: vacancyExternalId,
        title: 'Тестовая вакансия',
        company: 'Тестовая компания',
        location: 'Москва',
        salary: '100000 - 150000 RUB',
        url: 'https://example.com',
        source: 'Test',
        publishedAt: new Date().toISOString(),
        fullDescription: 'Тестовое описание',
        requirements: 'Тестовые требования',
        benefits: 'Тестовые льготы',
        conditions: 'Тестовые условия',
        companyLogo: '',
        companyUrl: '',
        employmentType: 'full_time',
        experienceLevel: 'middle',
        remoteType: 'office',
        aiAnalysis: {
          specialization: 'design',
          employment: ['full_time'],
          experience: 'middle',
          technologies: ['Figma', 'Sketch'],
          remote: false,
          requirements: [],
          benefits: [],
          summary: 'Тестовое резюме'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка в простом API:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}














