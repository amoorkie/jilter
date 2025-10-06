import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    console.log('🐍 Запуск Python парсеров...');
    
    const body = await req.json().catch(() => ({}));
    const {
      query = 'дизайнер',
      pages = 3,
      sources = ['hh', 'habr', 'getmatch', 'geekjob'],
      verbose = false
    } = body;
    
    // Путь к скрипту запуска Python парсеров
    const scriptPath = path.join(process.cwd(), 'run_all_parsers.py');
    
    // Формируем команду
    let command = `python "${scriptPath}" --query "${query}" --pages ${pages}`;
    
    if (sources && sources.length > 0) {
      command += ` --sources ${sources.join(' ')}`;
    }
    
    if (verbose) {
      command += ' --verbose';
    }
    
    console.log(`🚀 Выполняем команду: ${command}`);
    
    const startTime = Date.now();
    
    // Запускаем Python парсер (форсируем UTF-8 и, на Windows, переключаем кодовую страницу)
    const wrappedCommand = process.platform === 'win32' 
      ? `chcp 65001>nul && ${command}` 
      : command;

    const { stdout, stderr } = await execAsync(wrappedCommand, {
      cwd: process.cwd(),
      timeout: 300000, // 5 минут таймаут
      maxBuffer: 1024 * 1024 * 10, // 10MB буфер
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('✅ Python парсеры завершены успешно');
    console.log(`⏱️ Время выполнения: ${duration.toFixed(2)} секунд`);
    
    // Парсим вывод для получения статистики
    let stats = {
      total_found: 0,
      total_saved: 0,
      by_source: {},
      duration: duration
    };
    
    try {
      // Сначала ищем машинную строку STATS:{...}
      const jsonLine = stdout.split('\n').find(l => l.startsWith('STATS:'));
      if (jsonLine) {
        const jsonText = jsonLine.replace('STATS:', '').trim();
        const parsed = JSON.parse(jsonText);
        stats.total_found = parsed.total_found ?? 0;
        stats.total_saved = parsed.total_saved ?? 0;
        stats.by_source = parsed.by_source ?? {};
      } else {
        // Фолбэк на старый парсер русскоязычного вывода
        const lines = stdout.split('\n');
        let inResults = false;
        for (const line of lines) {
          if (line.includes('РЕЗУЛЬТАТЫ ПАРСИНГА')) { inResults = true; continue; }
          if (!inResults) continue;
          if (line.includes('Найдено вакансий:')) {
            const m = line.match(/Найдено вакансий:\s*(\d+)/); if (m) stats.total_found = parseInt(m[1]);
          }
          if (line.includes('Сохранено в БД:')) {
            const m = line.match(/Сохранено в БД:\s*(\d+)/); if (m) stats.total_saved = parseInt(m[1]);
          }
          const m2 = line.match(/^\s*(\w+)\s*:\s*найдено\s*(\d+),\s*сохранено\s*(\d+)/);
          if (m2) {
            const [, source, found, saved] = m2;
            (stats.by_source as any)[source] = { found: parseInt(found), saved: parseInt(saved) };
          }
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Не удалось распарсить статистику:', parseError);
    }
    
    return NextResponse.json({
      success: true,
      message: `Python парсинг завершён успешно за ${duration.toFixed(2)} секунд`,
      stats,
      output: stdout,
      errors: stderr || null
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка Python парсинга:', error);
    
    let errorMessage = 'Неизвестная ошибка';
    let errorDetails = '';
    
    if (error.code === 'ENOENT') {
      errorMessage = 'Python не найден в системе';
      errorDetails = 'Убедитесь, что Python установлен и доступен в PATH';
    } else if (error.killed) {
      errorMessage = 'Парсинг прерван по таймауту';
      errorDetails = 'Процесс превысил лимит времени выполнения (5 минут)';
    } else if (error.stderr) {
      errorMessage = 'Ошибка выполнения Python скрипта';
      errorDetails = error.stderr;
    } else {
      errorMessage = error.message || 'Неизвестная ошибка';
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      output: error.stdout || null
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Python Parser API',
    version: '1.0.0',
    endpoints: {
      'POST /api/python-parse': 'Запуск Python парсеров',
    },
    parameters: {
      query: 'Поисковый запрос (по умолчанию: дизайнер)',
      pages: 'Количество страниц на источник (по умолчанию: 3)',
      sources: 'Массив источников: hh, hirehi, habr, getmatch, geekjob',
      verbose: 'Подробный вывод (по умолчанию: false)'
    },
    example: {
      query: 'UI дизайнер',
      pages: 5,
      sources: ['hh', 'habr', 'geekjob'],
      verbose: true
    }
  });
}








