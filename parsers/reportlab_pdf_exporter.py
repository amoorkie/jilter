#!/usr/bin/env python3
"""
PDF экспорт вакансий с красивым форматированием используя reportlab
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html
from bs4 import BeautifulSoup

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import os
    import platform
except ImportError:
    print("Ошибка: reportlab не установлен")
    print("Установите: pip install reportlab")
    sys.exit(1)


class ReportLabPDFExporter:
    """PDF экспорт с красивым форматированием используя reportlab"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection = None
        self.register_cyrillic_fonts()
    
    def register_cyrillic_fonts(self):
        """Регистрация кириллических шрифтов для корректного отображения"""
        try:
            # Пытаемся найти системные шрифты
            system_fonts = self.find_system_fonts()
            
            if system_fonts:
                # Регистрируем найденные шрифты
                for font_name, font_path in system_fonts.items():
                    try:
                        pdfmetrics.registerFont(TTFont(font_name, font_path))
                        print(f"Зарегистрирован шрифт: {font_name}")
                    except Exception as e:
                        print(f"Ошибка регистрации шрифта {font_name}: {e}")
            else:
                print("Кириллические шрифты не найдены, используем стандартные")
                
        except Exception as e:
            print(f"Ошибка при регистрации шрифтов: {e}")
    
    def find_system_fonts(self):
        """Поиск системных кириллических шрифтов"""
        fonts = {}
        
        if platform.system() == "Windows":
            # Пути к шрифтам в Windows
            font_paths = [
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/arialbd.ttf", 
                "C:/Windows/Fonts/calibri.ttf",
                "C:/Windows/Fonts/calibrib.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/tahomabd.ttf",
                "C:/Windows/Fonts/verdana.ttf",
                "C:/Windows/Fonts/verdanab.ttf",
                "C:/Windows/Fonts/trebuc.ttf",
                "C:/Windows/Fonts/trebucbd.ttf"
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    font_name = os.path.basename(font_path).replace('.ttf', '').replace('.ttc', '')
                    fonts[font_name] = font_path
                    
        return fonts
    
    def get_available_fonts(self):
        """Получение доступных шрифтов"""
        fonts = {'main': 'Helvetica', 'bold': 'Helvetica-Bold'}
        
        # Проверяем зарегистрированные шрифты
        registered_fonts = pdfmetrics.getRegisteredFontNames()
        
        # Ищем кириллические шрифты
        cyrillic_fonts = ['arial', 'calibri', 'tahoma', 'verdana', 'trebuc']
        
        for font in cyrillic_fonts:
            if font in registered_fonts:
                fonts['main'] = font
                if f"{font}bd" in registered_fonts:
                    fonts['bold'] = f"{font}bd"
                elif f"{font}-bold" in registered_fonts:
                    fonts['bold'] = f"{font}-bold"
                break
        
        return fonts
        
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
                SELECT id, title, company, full_description, source, published_at,
                       description, requirements, tasks, conditions, benefits
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
    
    def ultra_clean_text(self, text: str) -> str:
        """Ультра-агрессивная очистка текста от кода"""
        if not text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(text)
        
        # Удаляем все HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Убираем все JavaScript и JSON код более агрессивно
        clean_text = re.sub(r'<script[^>]*>.*?</script>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r'<noscript[^>]*>.*?</noscript>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем все технические строки
        clean_text = re.sub(r'var\s+\w+\s*=.*?;', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'function\s+\w+\(.*?\).*?}', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'window\.\w+.*?;', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'document\.\w+.*?;', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'console\.\w+.*?;', '', clean_text, flags=re.DOTALL)
        
        # Убираем все JSON объекты
        clean_text = re.sub(r'\{[^{}]*\}', '', clean_text)
        clean_text = re.sub(r'\[[^\[\]]*\]', '', clean_text)
        
        # Убираем все URL
        clean_text = re.sub(r'https?://[^\s]+', '', clean_text)
        
        # Убираем все технические ключевые слова
        technical_keywords = [
            'analytics', 'tracking', 'counter', 'pixel', 'beacon',
            'top100', 'telegram', 'vkontakte', 'mail.ru', 'rating',
            'liveinternet', 'kraken', 'project:', 'st.top100',
            'd.createElement', 'opera', 'domcontentloaded', 'addEventListener',
            'getelementbyid', 'getelementsbytagname', 'parentnode',
            'insertbefore', 'async', 'text/javascript', 'json',
            'response', 'headers', 'status', 'body', 'offers',
            'similar', 'vacancies', 'specializations', 'locations',
            'salary', 'currency', 'hidden', 'city', 'country',
            'metro', 'access-control', 'content-type', 'server',
            'connection', 'credentials', 'methods', 'max-age',
            'anonymous', 'role', 'user', 'morphs', 'form_',
            'plural', 'seo_', 'category', 'slug', 'sort_order'
        ]
        
        for keyword in technical_keywords:
            clean_text = re.sub(rf'.*{re.escape(keyword)}.*', '', clean_text, flags=re.IGNORECASE)
        
        # Убираем JavaScript код (максимально агрессивно)
        js_patterns = [
            r'<script[^>]*>.*?</script>',
            r'<style[^>]*>.*?</style>',
            r'<noscript[^>]*>.*?</noscript>',
            r'var\s+\w+\s*=.*?;',
            r'function\s+\w+\(.*?\).*?}',
            r'window\.\w+\s*=.*?;',
            r'document\.\w+.*?;',
            r'Rating\s+Mail\.ru\s+counter',
            r'LiveInternet\s+Top100',
            r'top100\.ru',
            r'window\._tmr',
            r'd\.createElement',
            r'project:\s*\d+',
            r'st\.top100\.ru',
            r'https?://[^\s]+',
            r'\.js[^\w]',
            r'\.css[^\w]',
            r'analytics',
            r'tracking',
            r'counter',
            r'pixel',
            r'beacon',
            r'telegram',
            r'vkontakte',
            r'mail\.ru',
            r'rating',
            r'liveinternet',
            r'kraken',
            r'G\.json\..*?}',
            r'getSimilarVacanciesKey.*?}',
            r'{"body":.*?}',
            r'{"headers":.*?}',
            r'{"status":.*?}',
            r'{"statusText":.*?}',
            r'{"url":.*?}',
            r'{"responseType":.*?}',
            r'{"count":.*?}',
            r'{"offers":.*?}',
            r'{"id":.*?}',
            r'{"url":.*?}',
            r'{"position":.*?}',
            r'{"company":.*?}',
            r'{"name":.*?}',
            r'{"logotype":.*?}',
            r'{"salary_display_from":.*?}',
            r'{"salary_display_to":.*?}',
            r'{"salary_currency":.*?}',
            r'{"salary_hidden":.*?}',
            r'{"city":.*?}',
            r'{"country":.*?}',
            r'{"location_details":.*?}',
            r'{"specializations":.*?}',
            r'{"type":.*?}',
            r'{"locations":.*?}',
            r'{"relocation_options":.*?}',
            r'{"remote_options":.*?}',
            r'{"office_options":.*?}',
            r'{"display_locations":.*?}',
            r'{"metro":.*?}',
            r'{"similar_offers_url":.*?}',
            r'{"server":.*?}',
            r'{"date":.*?}',
            r'{"content-type":.*?}',
            r'{"content-length":.*?}',
            r'{"connection":.*?}',
            r'{"access-control-allow-credentials":.*?}',
            r'{"access-control-allow-headers":.*?}',
            r'{"access-control-allow-methods":.*?}',
            r'{"access-control-max-age":.*?}',
            r'{"isAnonymous":.*?}',
            r'{"role":.*?}',
            r'{"user":.*?}',
            r'{"morphs":.*?}',
            r'{"form_first":.*?}',
            r'{"form_second":.*?}',
            r'{"plural":.*?}',
            r'{"form_first_plural":.*?}',
            r'{"form5":.*?}',
            r'{"seo_morphs":.*?}',
            r'{"category":.*?}',
            r'{"slug":.*?}',
            r'{"name":.*?}',
            r'{"sort_order":.*?}'
        ]
        
        for pattern in js_patterns:
            clean_text = re.sub(pattern, '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем строки с техническими данными
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
                'd.createElement', 'https://', 'http://', '.js', '.css',
                'opera', 'domcontentloaded', 'addEventListener',
                'getelementbyid', 'getelementsbytagname', 'parentnode',
                'insertbefore', 'async', 'text/javascript', 'json',
                'response', 'headers', 'status', 'body', 'offers',
                'similar', 'vacancies', 'specializations', 'locations',
                'salary', 'currency', 'hidden', 'city', 'country',
                'metro', 'access-control', 'content-type', 'server',
                'connection', 'credentials', 'methods', 'max-age',
                'anonymous', 'role', 'user', 'morphs', 'form_',
                'plural', 'seo_', 'category', 'slug', 'sort_order'
            ]):
                continue
            
            # Пропускаем строки с техническими символами
            if re.match(r'^[{}();,\s]+$', line):
                continue
            
            # Пропускаем строки с URL
            if line.startswith('http') or '.js' in line or '.css' in line:
                continue
            
            # Пропускаем строки с техническими данными
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*\s*=', line):
                continue
            
            # Пропускаем JSON строки
            if line.startswith('{') and line.endswith('}'):
                continue
            
            # Пропускаем строки с техническими данными
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*\s*:', line):
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
        
        # Убираем проблемные символы
        clean_text = clean_text.replace('\u200b', '')
        clean_text = clean_text.replace('\u200c', '')
        clean_text = clean_text.replace('\u200d', '')
        
        return clean_text
    
    def create_pdf(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание PDF с красивым форматированием"""
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
            
            # Стили с кириллическими шрифтами
            styles = getSampleStyleSheet()
            
            # Определяем доступные шрифты
            available_fonts = self.get_available_fonts()
            main_font = available_fonts.get('main', 'Helvetica')
            bold_font = available_fonts.get('bold', 'Helvetica-Bold')
            
            # Заголовок документа
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontName=bold_font,
                fontSize=20,
                spaceAfter=12,
                textColor=colors.darkblue,
                alignment=1  # Center
            )
            
            # Заголовок вакансии
            vacancy_title_style = ParagraphStyle(
                'VacancyTitle',
                parent=styles['Heading2'],
                fontName=bold_font,
                fontSize=16,
                spaceAfter=6,
                textColor=colors.darkblue
            )
            
            # Компания
            company_style = ParagraphStyle(
                'Company',
                parent=styles['Normal'],
                fontName=main_font,
                fontSize=12,
                spaceAfter=6,
                textColor=colors.darkgreen
            )
            
            # Основной текст
            content_style = ParagraphStyle(
                'Content',
                parent=styles['Normal'],
                fontName=main_font,
                fontSize=10,
                spaceAfter=6,
                leftIndent=20
            )
            
            # Заголовки секций
            section_style = ParagraphStyle(
                'Section',
                parent=styles['Heading3'],
                fontName=bold_font,
                fontSize=12,
                spaceAfter=6,
                textColor=colors.darkblue
            )
            
            # Метаинформация
            meta_style = ParagraphStyle(
                'Meta',
                parent=styles['Normal'],
                fontName=main_font,
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
                story.append(Paragraph(f"ВАКАНСИЯ #{vacancy['id']}", vacancy_title_style))
                
                # Очищаем заголовок
                clean_title = self.ultra_clean_text(vacancy['title'])
                story.append(Paragraph(clean_title, vacancy_title_style))
                
                # Компания
                clean_company = self.ultra_clean_text(vacancy['company'])
                story.append(Paragraph(f"Компания: {clean_company}", company_style))
                
                # Источник и дата
                story.append(Paragraph(f"Источник: {vacancy['source']}", content_style))
                if vacancy['published_at']:
                    published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                    story.append(Paragraph(f"Дата: {published_date}", content_style))
                
                story.append(Spacer(1, 10))
                
                # Основная информация и AI анализ в таблице
                info_data = [
                    ['Основная информация', 'AI Анализ'],
                    [f"Компания: {clean_company}", 'Специализация: design'],
                    [f"Источник: {vacancy['source']}", 'Занятость: '],
                    ['URL: Открыть', 'Опыт: junior'],
                    ['', 'Удаленно: Нет'],
                    ['', 'Релевантность: 80.0%']
                ]
                
                info_table = Table(info_data, colWidths=[3*inch, 3*inch])
                info_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), bold_font),
                    ('FONTNAME', (0, 1), (-1, -1), main_font),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(info_table)
                story.append(Spacer(1, 15))
                
                # Описание
                if vacancy['full_description']:
                    story.append(Paragraph("Описание вакансии", section_style))
                    clean_description = self.ultra_clean_text(vacancy['full_description'])
                    
                    if clean_description.strip():
                        # Разбиваем на абзацы
                        paragraphs = clean_description.split('\n')
                        for paragraph in paragraphs:
                            paragraph = paragraph.strip()
                            if paragraph:
                                # Выделяем жирным ключевые слова
                                paragraph = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', paragraph)
                                paragraph = re.sub(r'\b(Арт-директор|дизайнер|UI/UX|UX/UI|Product Designer|Senior|Junior|Middle|Lead)\b', r'<b>\1</b>', paragraph, flags=re.IGNORECASE)
                                story.append(Paragraph(paragraph, content_style))
                    else:
                        story.append(Paragraph("[Текст не найден после очистки]", content_style))
                    
                    story.append(Spacer(1, 10))
                
                # Требования
                story.append(Paragraph("Ты нам подходишь, если:", section_style))
                requirements = self.extract_requirements(clean_description)
                if requirements:
                    for req in requirements:
                        story.append(Paragraph(f"• {req}", content_style))
                else:
                    story.append(Paragraph("Требования не найдены", content_style))
                
                story.append(Spacer(1, 10))
                
                # Личностные качества
                story.append(Paragraph("Какие твои личностные качества для нас важны:", section_style))
                qualities = self.extract_qualities(clean_description)
                if qualities:
                    for quality in qualities:
                        story.append(Paragraph(f"• {quality}", content_style))
                else:
                    story.append(Paragraph("Личностные качества не найдены", content_style))
                
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
    
    def extract_requirements(self, text: str) -> List[str]:
        """Извлечение требований из текста"""
        if not text:
            return []
        
        requirements = []
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and any(keyword in sentence.lower() for keyword in [
                'опыт', 'знание', 'умение', 'навык', 'требование', 'необходимо', 'должен', 'нужно',
                'adobe', 'figma', 'photoshop', 'illustrator', 'after effects', 'premiere',
                'дизайн', 'ux', 'ui', 'веб', 'мобильный', 'приложение'
            ]):
                sentence = re.sub(r'[;]+$', '', sentence)
                if sentence:
                    requirements.append(sentence)
        
        return requirements[:10]  # Ограничиваем количество
    
    def extract_qualities(self, text: str) -> List[str]:
        """Извлечение личностных качеств из текста"""
        if not text:
            return []
        
        qualities = []
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and any(keyword in sentence.lower() for keyword in [
                'проактивность', 'ответственность', 'коммуникабельность', 'креативность',
                'внимательность', 'грамотность', 'инициативность', 'стрессоустойчивость',
                'командная работа', 'лидерство', 'аналитическое мышление'
            ]):
                sentence = re.sub(r'[;]+$', '', sentence)
                if sentence:
                    qualities.append(sentence)
        
        return qualities[:10]  # Ограничиваем количество
    
    def export_vacancies_to_pdf(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в PDF"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_pdf_{timestamp}.pdf"
        
        print("PDF экспорт вакансий с красивым форматированием")
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
    print("PDF экспорт вакансий с красивым форматированием")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = ReportLabPDFExporter(db_path)
    
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
