#!/usr/bin/env python3
"""
Экспорт вакансий в PDF файл для обработки в ChatGPT
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.rl_config import defaultEncoding
except ImportError:
    print("Ошибка: reportlab не установлен")
    print("Установите: pip install reportlab")
    sys.exit(1)


class VacancyPDFExporter:
    """Класс для экспорта вакансий в PDF"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection = None
        
    def connect_to_database(self) -> bool:
        """Подключение к базе данных"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            print(f"Подключение к базе данных: {self.db_path}")
            return True
        except sqlite3.Error as e:
            print(f"Ошибка подключения к базе данных: {e}")
            return False
    
    def get_vacancies_for_export(self) -> List[Dict[str, Any]]:
        """Получение вакансий для экспорта"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("""
                SELECT id, title, company, full_description, source, published_at
                FROM vacancies 
                WHERE full_description IS NOT NULL 
                AND full_description != ''
                ORDER BY id
            """)
            
            columns = [description[0] for description in cursor.description]
            vacancies = []
            
            for row in cursor.fetchall():
                vacancy = dict(zip(columns, row))
                vacancies.append(vacancy)
            
            print(f"Найдено вакансий для экспорта: {len(vacancies)}")
            return vacancies
            
        except sqlite3.Error as e:
            print(f"Ошибка получения вакансий: {e}")
            return []
    
    def create_pdf(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание PDF файла с вакансиями"""
        try:
            # Регистрируем шрифты для поддержки кириллицы
            try:
                # Пытаемся использовать системные шрифты
                pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
                pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', 'DejaVuSans-Bold.ttf'))
                font_name = 'DejaVuSans'
                font_bold = 'DejaVuSans-Bold'
            except:
                # Fallback на встроенные шрифты
                font_name = 'Helvetica'
                font_bold = 'Helvetica-Bold'
                print("Предупреждение: Используются встроенные шрифты, кириллица может отображаться некорректно")
            
            # Создаем PDF документ с правильной кодировкой
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Стили
            styles = getSampleStyleSheet()
            
            # Кастомные стили с правильными шрифтами
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName=font_bold,
                fontSize=16,
                spaceAfter=12,
                textColor=colors.darkblue
            )
            
            company_style = ParagraphStyle(
                'CompanyStyle',
                parent=styles['Heading2'],
                fontName=font_bold,
                fontSize=14,
                spaceAfter=6,
                textColor=colors.darkgreen
            )
            
            content_style = ParagraphStyle(
                'ContentStyle',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=10,
                spaceAfter=6,
                leftIndent=20
            )
            
            meta_style = ParagraphStyle(
                'MetaStyle',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=8,
                textColor=colors.grey,
                spaceAfter=12
            )
            
            # Содержимое документа
            story = []
            
            # Заголовок документа
            story.append(Paragraph("ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT", title_style))
            story.append(Spacer(1, 12))
            
            # Метаинформация
            export_date = datetime.now().strftime("%d.%m.%Y %H:%M")
            story.append(Paragraph(f"Дата экспорта: {export_date}", meta_style))
            story.append(Paragraph(f"Количество вакансий: {len(vacancies)}", meta_style))
            story.append(Spacer(1, 20))
            
            # Обработка каждой вакансии
            for i, vacancy in enumerate(vacancies, 1):
                # ID и заголовок вакансии
                story.append(Paragraph(f"ВАКАНСИЯ #{vacancy['id']}", title_style))
                story.append(Paragraph(vacancy['title'], company_style))
                
                # Компания
                story.append(Paragraph(f"<b>Компания:</b> {vacancy['company']}", content_style))
                
                # Источник и дата
                story.append(Paragraph(f"<b>Источник:</b> {vacancy['source']}", content_style))
                if vacancy['published_at']:
                    published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                    story.append(Paragraph(f"<b>Дата:</b> {published_date}", content_style))
                
                # Описание
                if vacancy['full_description']:
                    # Очищаем HTML теги для PDF
                    description = self.clean_html_for_pdf(vacancy['full_description'])
                    story.append(Paragraph("<b>Описание:</b>", content_style))
                    story.append(Paragraph(description, content_style))
                
                # Разделитель между вакансиями
                if i < len(vacancies):
                    story.append(PageBreak())
            
            # Создаем PDF
            doc.build(story)
            print(f"PDF файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания PDF: {e}")
            return False
    
    def clean_html_for_pdf(self, html_text: str) -> str:
        """Очистка HTML для PDF с правильной кодировкой"""
        import re
        import html
        
        if not html_text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(html_text)
        
        # Удаляем HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Заменяем HTML entities
        clean_text = clean_text.replace('&nbsp;', ' ')
        clean_text = clean_text.replace('&amp;', '&')
        clean_text = clean_text.replace('&lt;', '<')
        clean_text = clean_text.replace('&gt;', '>')
        clean_text = clean_text.replace('&quot;', '"')
        
        # Убираем лишние пробелы
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Убираем непечатаемые символы
        clean_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', clean_text)
        
        return clean_text
    
    def export_vacancies_to_pdf(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в PDF"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_export_{timestamp}.pdf"
        
        print("Экспорт вакансий в PDF файл")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Получаем вакансии
        vacancies = self.get_vacancies_for_export()
        if not vacancies:
            print("Нет вакансий для экспорта")
            return False
        
        # Создаем PDF
        success = self.create_pdf(vacancies, output_path)
        
        if success:
            print(f"\nЭкспорт завершен успешно!")
            print(f"Файл: {output_path}")
            print(f"Вакансий экспортировано: {len(vacancies)}")
        
        return success
    
    def close_connection(self):
        """Закрытие соединения с базой данных"""
        if self.connection:
            self.connection.close()
            print("Соединение с базой данных закрыто")


def main():
    """Главная функция"""
    print("Экспорт вакансий в PDF для ChatGPT")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = VacancyPDFExporter(db_path)
    
    try:
        # Экспортируем вакансии
        success = exporter.export_vacancies_to_pdf()
        
        if success:
            print("\nГотово! Теперь:")
            print("1. Откройте созданный PDF файл")
            print("2. Загрузите его в ChatGPT")
            print("3. Попросите ChatGPT переписать описания вакансий")
            print("4. Скачайте обработанный PDF")
            print("5. Используйте импорт в админ панели")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        exporter.close_connection()


if __name__ == "__main__":
    main()
