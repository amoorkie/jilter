import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');
    
    if (!filename) {
      return NextResponse.json({ error: 'Имя файла не указано' }, { status: 400 });
    }
    
    // Проверяем, что файл существует и это PDF
    const filePath = path.join(process.cwd(), filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }
    
    if (!filename.endsWith('.pdf') && !filename.endsWith('.html')) {
      return NextResponse.json({ error: 'Неверный тип файла' }, { status: 400 });
    }
    
    // Читаем файл
    const fileBuffer = fs.readFileSync(filePath);
    
    // Определяем Content-Type в зависимости от типа файла
    const contentType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/html';
    
    // Возвращаем файл
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Ошибка скачивания PDF:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
