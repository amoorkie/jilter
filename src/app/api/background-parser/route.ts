// src/app/api/background-parser/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backgroundParser, ParsingConfig } from '@/lib/parsers/background-parser';
import { vacancyService } from '@/lib/database/vacancy-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      queries = ['javascript', 'python', 'react', 'frontend', 'backend'],
      maxPages = 3,
      aiEnabled = true,
      batchSize = 10,
      delayBetweenBatches = 1000
    } = body;

    console.log('🚀 Запуск фонового парсинга:', { queries, maxPages, aiEnabled });

    // Проверяем, не запущен ли уже парсинг
    if (backgroundParser.isParsingRunning()) {
      return NextResponse.json({
        error: 'Парсинг уже запущен',
        isRunning: true
      }, { status: 409 });
    }

    // Конфигурация парсинга
    const config: ParsingConfig = {
      queries,
      maxPages,
      aiEnabled,
      batchSize,
      delayBetweenBatches
    };

    // Запускаем парсинг в фоне
    backgroundParser.startBackgroundParsing(config).then(stats => {
      console.log('🎉 Фоновый парсинг завершен:', stats);
    }).catch(error => {
      console.error('❌ Ошибка фонового парсинга:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Фоновый парсинг запущен',
      config
    });

  } catch (error) {
    console.error('❌ Ошибка запуска фонового парсинга:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при запуске фонового парсинга',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json({
          isRunning: backgroundParser.isParsingRunning(),
          stats: backgroundParser.getStats()
        });

      case 'stop':
        backgroundParser.stopParsing();
        return NextResponse.json({
          success: true,
          message: 'Парсинг остановлен'
        });

      case 'stats':
        const stats = backgroundParser.getStats();
        const dbStats = await vacancyService.getSourceStats();
        const activeCount = await vacancyService.getActiveVacanciesCount();
        
        return NextResponse.json({
          parsingStats: stats,
          databaseStats: dbStats,
          activeVacancies: activeCount
        });

      case 'cleanup':
        const cleaned = await vacancyService.cleanupOldVacancies(30);
        return NextResponse.json({
          success: true,
          message: `Очищено ${cleaned} старых вакансий`
        });

      default:
        return NextResponse.json({
          error: 'Неизвестное действие',
          availableActions: ['status', 'stop', 'stats', 'cleanup']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Ошибка API фонового парсинга:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при выполнении действия',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}



