import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, type } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }
    
    // Простая нормализация без API
    const normalized = normalizeText(text, type);
    
    return NextResponse.json({ 
      original: text,
      normalized: normalized,
      type: type || 'general'
    });
    
  } catch (error) {
    console.error('Ошибка нормализации:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

function normalizeText(text: string, type: string = 'general'): string {
  let normalized = text;
  
  // Нормализация названий должностей
  if (type === 'title' || type === 'general') {
    normalized = normalized
      .replace(/ui\/ux\s*дизайнер/gi, 'UI/UX дизайнер')
      .replace(/ui\s*дизайнер/gi, 'UI дизайнер')
      .replace(/ux\s*дизайнер/gi, 'UX дизайнер')
      .replace(/веб\s*дизайнер/gi, 'Веб-дизайнер')
      .replace(/графический\s*дизайнер/gi, 'Графический дизайнер')
      .replace(/продуктовый\s*дизайнер/gi, 'Продуктовый дизайнер');
  }
  
  // Нормализация навыков
  if (type === 'description' || type === 'requirements' || type === 'general') {
    normalized = normalized
      .replace(/figma/gi, 'Figma')
      .replace(/sketch/gi, 'Sketch')
      .replace(/adobe\s*photoshop/gi, 'Adobe Photoshop')
      .replace(/adobe\s*illustrator/gi, 'Adobe Illustrator')
      .replace(/adobe\s*xd/gi, 'Adobe XD')
      .replace(/principle/gi, 'Principle')
      .replace(/invision/gi, 'InVision')
      .replace(/zeplin/gi, 'Zeplin');
  }
  
  // Нормализация типов занятости
  if (type === 'conditions' || type === 'general') {
    normalized = normalized
      .replace(/удаленн[а-я]*\s*работа/gi, 'Удаленная работа')
      .replace(/офисн[а-я]*\s*работа/gi, 'Офисная работа')
      .replace(/гибридн[а-я]*\s*формат/gi, 'Гибридный формат')
      .replace(/полн[а-я]*\s*занятость/gi, 'Полная занятость')
      .replace(/частичн[а-я]*\s*занятость/gi, 'Частичная занятость');
  }
  
  return normalized;
}








