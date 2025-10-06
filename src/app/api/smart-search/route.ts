// src/app/api/smart-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enhancedParser, SmartSearchResult } from '@/lib/ai/enhanced-parser';
import { analyzeSearchQuery } from '@/lib/ai/gemini-service';
import { Employment, Specialization } from '@/lib/types/employment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      filters = {},
      rawVacancies = []
    } = body;

    console.log('🧠 Умный поиск запущен:', { query, filters });

    // Проверяем, включен ли AI-анализ
    const aiEnabled = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== '';
    
    if (!aiEnabled) {
      return NextResponse.json({
        error: 'AI-анализ отключен. Установите GOOGLE_AI_API_KEY в переменных окружения.',
        aiEnabled: false
      }, { status: 400 });
    }

    // Умный поиск с AI-анализом
    const smartSearchResult: SmartSearchResult = await enhancedParser.smartSearch(
      query,
      rawVacancies,
      {
        specialization: filters.specialization,
        employment: filters.employment,
        experience: filters.experience,
        technologies: filters.technologies,
        minSalary: filters.minSalary,
        maxSalary: filters.maxSalary,
        remote: filters.remote
      }
    );

    console.log(`✅ Умный поиск завершен: найдено ${smartSearchResult.total} вакансий`);

    return NextResponse.json({
      success: true,
      aiEnabled: true,
      ...smartSearchResult
    });

  } catch (error) {
    console.error('❌ Ошибка умного поиска:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при выполнении умного поиска',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    console.log('🔍 Анализ поискового запроса:', query);

    // Проверяем, включен ли AI-анализ
    const aiEnabled = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== '';
    
    if (!aiEnabled) {
      return NextResponse.json({
        error: 'AI-анализ отключен. Установите GOOGLE_AI_API_KEY в переменных окружения.',
        aiEnabled: false
      }, { status: 400 });
    }

    // Анализ поискового запроса
    const queryAnalysis = await analyzeSearchQuery(query);

    console.log('✅ Анализ запроса завершен:', queryAnalysis);

    return NextResponse.json({
      success: true,
      aiEnabled: true,
      queryAnalysis
    });

  } catch (error) {
    console.error('❌ Ошибка анализа запроса:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при анализе поискового запроса',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}



