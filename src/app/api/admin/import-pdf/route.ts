import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'Файл не предоставлен' 
      }, { status: 400 });
    }
    
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'Файл должен быть в формате PDF' 
      }, { status: 400 });
    }
    
    // Сохраняем загруженный файл
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `processed_vacancies_${timestamp}.pdf`;
    const filePath = path.join(uploadDir, filename);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    // Путь к скрипту импорта
    const scriptPath = path.join(process.cwd(), 'parsers', 'vacancy_pdf_importer.py');
    
    // Проверяем существование скрипта
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ 
        error: 'Скрипт импорта не найден' 
      }, { status: 404 });
    }
    
    // Запускаем Python скрипт
    const pythonProcess = spawn('python', [scriptPath, filePath], {
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    return new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'PDF файл успешно импортирован',
            output: output,
            filename: filename
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Ошибка импорта PDF',
            output: output,
            errorOutput: errorOutput,
            exitCode: code
          }));
        }
      });
    });
    
  } catch (error) {
    console.error('Ошибка импорта PDF:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}








