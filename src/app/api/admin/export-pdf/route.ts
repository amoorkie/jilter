import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    // Путь к скрипту экспорта (используем reportlab PDF экспорт)
    const scriptPath = path.join(process.cwd(), 'parsers', 'reportlab_pdf_exporter.py');
    
    // Проверяем существование скрипта
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ 
        error: 'Скрипт экспорта не найден' 
      }, { status: 404 });
    }
    
    // Запускаем Python скрипт
    const pythonProcess = spawn('python', [scriptPath], {
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
          // Ищем созданный PDF файл
          const pdfFiles = fs.readdirSync(process.cwd())
            .filter(file => file.startsWith('vacancies_pdf_') && file.endsWith('.pdf'))
            .sort()
            .reverse();
          
          if (pdfFiles.length > 0) {
            const latestPdf = pdfFiles[0];
            const pdfPath = path.join(process.cwd(), latestPdf);
            
            resolve(NextResponse.json({
              success: true,
              message: 'PDF файл создан успешно',
              filename: latestPdf,
              output: output,
              downloadUrl: `/api/admin/download-pdf?file=${latestPdf}`
            }));
          } else {
            resolve(NextResponse.json({
              success: false,
              error: 'PDF файл не найден',
              output: output,
              errorOutput: errorOutput
            }));
          }
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Ошибка выполнения скрипта',
            output: output,
            errorOutput: errorOutput,
            exitCode: code
          }));
        }
      });
    });
    
  } catch (error) {
    console.error('Ошибка экспорта PDF:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
