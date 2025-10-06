# Исправление проблем с кодировкой в PDF

## 🐛 Проблема

В PDF файлах отображаются черные квадраты вместо кириллического текста.

## ✅ Решение

### 1. **Простая версия (рекомендуется)**
Используйте `simple_pdf_exporter.py` - она работает с встроенными шрифтами:

```bash
cd parsers
python simple_pdf_exporter.py
```

### 2. **Улучшенная версия**
Используйте `vacancy_pdf_exporter_v2.py` с поддержкой системных шрифтов:

```bash
cd parsers
python vacancy_pdf_exporter_v2.py
```

### 3. **Ручная установка шрифтов**
Если проблемы продолжаются, установите шрифты вручную:

#### Windows:
```bash
# Скачайте DejaVu шрифты
# Поместите в папку parsers/
# Или используйте системные шрифты
```

#### Linux:
```bash
sudo apt-get install fonts-dejavu-core
```

#### macOS:
```bash
brew install font-dejavu
```

## 🔧 Альтернативные решения

### 1. **Экспорт в TXT файл**
Создайте простой текстовый экспорт:

```python
# parsers/text_exporter.py
import sqlite3
import os
from datetime import datetime

def export_to_text():
    conn = sqlite3.connect('data/vacancies.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, company, full_description, source, published_at
        FROM vacancies 
        WHERE full_description IS NOT NULL 
        AND full_description != ''
        ORDER BY id
    """)
    
    vacancies = cursor.fetchall()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"vacancies_export_{timestamp}.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT\n")
        f.write("="*50 + "\n\n")
        
        for vacancy in vacancies:
            f.write(f"ВАКАНСИЯ #{vacancy[0]}\n")
            f.write(f"{vacancy[1]}\n")
            f.write(f"Компания: {vacancy[2]}\n")
            f.write(f"Источник: {vacancy[4]}\n")
            f.write(f"Дата: {vacancy[5][:10] if vacancy[5] else 'N/A'}\n")
            f.write(f"Описание: {vacancy[3]}\n")
            f.write("\n" + "="*50 + "\n\n")
    
    print(f"Экспорт завершен: {filename}")
    conn.close()

if __name__ == "__main__":
    export_to_text()
```

### 2. **Экспорт в HTML файл**
Создайте HTML экспорт:

```python
# parsers/html_exporter.py
import sqlite3
import os
from datetime import datetime
import html

def export_to_html():
    conn = sqlite3.connect('data/vacancies.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, company, full_description, source, published_at
        FROM vacancies 
        WHERE full_description IS NOT NULL 
        AND full_description != ''
        ORDER BY id
    """)
    
    vacancies = cursor.fetchall()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"vacancies_export_{timestamp}.html"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Экспорт вакансий</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .vacancy { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
        .title { font-size: 18px; font-weight: bold; color: #333; }
        .company { color: #666; margin: 10px 0; }
        .description { margin-top: 15px; line-height: 1.6; }
    </style>
</head>
<body>
    <h1>ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT</h1>
    <p>Дата экспорта: """ + datetime.now().strftime("%d.%m.%Y %H:%M") + f"""</p>
    <p>Количество вакансий: {len(vacancies)}</p>
    <hr>
""")
        
        for vacancy in vacancies:
            clean_title = html.escape(vacancy[1])
            clean_company = html.escape(vacancy[2])
            clean_description = html.escape(vacancy[3])
            
            f.write(f"""
    <div class="vacancy">
        <div class="title">ВАКАНСИЯ #{vacancy[0]}</div>
        <div class="title">{clean_title}</div>
        <div class="company">Компания: {clean_company}</div>
        <div class="company">Источник: {vacancy[4]}</div>
        <div class="company">Дата: {vacancy[5][:10] if vacancy[5] else 'N/A'}</div>
        <div class="description">
            <strong>Описание:</strong><br>
            {clean_description}
        </div>
    </div>
""")
        
        f.write("</body></html>")
    
    print(f"HTML экспорт завершен: {filename}")
    conn.close()

if __name__ == "__main__":
    export_to_html()
```

## 🎯 Рекомендации

### 1. **Используйте простую версию**
```bash
python parsers/simple_pdf_exporter.py
```

### 2. **Проверьте результат**
Откройте созданный PDF файл и убедитесь, что текст отображается корректно.

### 3. **Если проблемы продолжаются**
Используйте текстовый экспорт:
```bash
python parsers/text_exporter.py
```

### 4. **Для веб-интерфейса**
Обновите API для использования простой версии (уже сделано).

## 🔍 Диагностика

### Проверьте кодировку:
```python
import sys
print(f"Кодировка системы: {sys.getdefaultencoding()}")
print(f"Кодировка файла: {sys.stdout.encoding}")
```

### Проверьте шрифты:
```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
    print("Шрифт Arial зарегистрирован")
except Exception as e:
    print(f"Ошибка регистрации шрифта: {e}")
```

## ✅ Результат

После применения исправлений:
- ✅ **Кириллица отображается корректно**
- ✅ **PDF файлы читаемы**
- ✅ **ChatGPT может обработать файл**
- ✅ **Импорт работает без проблем**








