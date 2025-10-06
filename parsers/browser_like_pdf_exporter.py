#!/usr/bin/env python3
"""
Экспорт вакансий в PDF с рендерингом HTML как в браузере
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from bs4 import BeautifulSoup
except ImportError:
    print("Ошибка: reportlab или beautifulsoup4 не установлен")
    print("Установите: pip install reportlab beautifulsoup4")
    sys.exit(1)


class BrowserLikePDFExporter:
    """Экспорт вакансий в PDF с рендерингом HTML как в браузере"""
    
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
    
    def render_html_like_browser(self, html_content: str) -> str:
        """Рендеринг HTML как в браузере - только видимый текст"""
        if not html_content:
            return ""
        
        try:
            # Парсим HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Удаляем скрипты и стили
            for script in soup(["script", "style", "noscript"]):
                script.decompose()
            
            # Удаляем элементы с техническими данными
            for element in soup.find_all(text=True):
                text = element.strip()
                if any(keyword in text.lower() for keyword in [
                    'script', 'function', 'var ', 'window.', 'document.',
                    'analytics', 'tracking', 'counter', 'pixel', 'beacon',
                    'top100', 'telegram', 'vkontakte', 'mail.ru', 'rating',
                    'liveinternet', 'kraken', 'project:', 'st.top100',
                    'd.createElement', 'https://', 'http://', '.js', '.css'
                ]):
                    element.extract()
            
            # Получаем чистый текст
            text = soup.get_text()
            
            # Очищаем текст
            lines = text.split('\n')
            clean_lines = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Пропускаем технические строки
                if any(keyword in line.lower() for keyword in [
                    'script', 'function', 'var ', 'window.', 'document.',
                    'analytics', 'tracking', 'counter', 'pixel', 'beacon',
                    'top100', 'telegram', 'vkontakte', 'mail.ru', 'rating',
                    'liveinternet', 'kraken', 'project:', 'st.top100',
                    'd.createElement', 'https://', 'http://', '.js', '.css'
                ]):
                    continue
                
                # Пропускаем строки с техническими символами
                if re.match(r'^[{}();,\s]+$', line):
                    continue
                
                # Пропускаем строки с URL
                if line.startswith('http') or '.js' in line or '.css' in line:
                    continue
                
                clean_lines.append(line)
            
            # Объединяем строки
            clean_text = '\n'.join(clean_lines)
            
            # Заменяем HTML entities
            clean_text = clean_text.replace('&nbsp;', ' ')
            clean_text = clean_text.replace('&amp;', '&')
            clean_text = clean_text.replace('&lt;', '<')
            clean_text = clean_text.replace('&gt;', '>')
            clean_text = clean_text.replace('&quot;', '"')
            
            # Убираем лишние пробелы
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            # Убираем проблемные символы
            clean_text = clean_text.replace('\u200b', '')
            clean_text = clean_text.replace('\u200c', '')
            clean_text = clean_text.replace('\u200d', '')
            
            return clean_text
            
        except Exception as e:
            print(f"Ошибка рендеринга HTML: {e}")
            # Fallback - простая очистка
            return self.simple_clean_text(html_content)
    
    def simple_clean_text(self, text: str) -> str:
        """Простая очистка текста как fallback"""
        if not text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(text)
        
        # Удаляем HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Убираем JavaScript код
        clean_text = re.sub(r'<script[^>]*>.*?</script>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем технические строки
        lines = clean_text.split('\n')
        clean_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Пропускаем технические строки
            if any(keyword in line.lower() for keyword in [
                'script', 'function', 'var ', 'window.', 'document.',
                'analytics', 'tracking', 'counter', 'pixel', 'beacon',
                'top100', 'telegram', 'vkontakte', 'mail.ru', 'rating',
                'liveinternet', 'kraken', 'project:', 'st.top100',
                'd.createElement', 'https://', 'http://', '.js', '.css'
            ]):
                continue
            
            clean_lines.append(line)
        
        clean_text = '\n'.join(clean_lines)
        
        # Заменяем HTML entities
        clean_text = clean_text.replace('&nbsp;', ' ')
        clean_text = clean_text.replace('&amp;', '&')
        clean_text = clean_text.replace('&lt;', '<')
        clean_text = clean_text.replace('&gt;', '>')
        clean_text = clean_text.replace('&quot;', '"')
        
        # Убираем лишние пробелы
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        return clean_text
    
    def create_pdf(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание PDF файла с вакансиями"""
        try:
            # Создаем PDF документ
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
            
            # Простые стили
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=12,
                textColor=colors.darkblue
            )
            
            company_style = ParagraphStyle(
                'Company',
                parent=styles['Heading2'],
                fontSize=14,
                spaceAfter=6,
                textColor=colors.darkgreen
            )
            
            content_style = ParagraphStyle(
                'Content',
                parent=styles['Normal'],
                fontSize=10,
                spaceAfter=6,
                leftIndent=20
            )
            
            meta_style = ParagraphStyle(
                'Meta',
                parent=styles['Normal'],
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
                
                # Очищаем заголовок
                clean_title = self.render_html_like_browser(vacancy['title'])
                story.append(Paragraph(clean_title, company_style))
                
                # Компания
                clean_company = self.render_html_like_browser(vacancy['company'])
                story.append(Paragraph(f"Компания: {clean_company}", content_style))
                
                # Источник и дата
                story.append(Paragraph(f"Источник: {vacancy['source']}", content_style))
                if vacancy['published_at']:
                    published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                    story.append(Paragraph(f"Дата: {published_date}", content_style))
                
                # Описание
                if vacancy['full_description']:
                    # Рендерим HTML как в браузере
                    clean_description = self.render_html_like_browser(vacancy['full_description'])
                    story.append(Paragraph("Описание:", content_style))
                    story.append(Paragraph(clean_description, content_style))
                
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
    
    def export_vacancies_to_pdf(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в PDF"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_browser_like_{timestamp}.pdf"
        
        print("Экспорт вакансий в PDF (как в браузере)")
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
    print("Экспорт вакансий в PDF (как в браузере)")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = BrowserLikePDFExporter(db_path)
    
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








