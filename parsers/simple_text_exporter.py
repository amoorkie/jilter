#!/usr/bin/env python3
"""
Простой экспорт вакансий в текстовый файл для ChatGPT
"""

import sqlite3
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import re
import html
from bs4 import BeautifulSoup


class SimpleTextExporter:
    """Простой экспорт вакансий в текстовый файл"""
    
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
    
    def extract_clean_text(self, html_content: str) -> str:
        """Извлечение чистого текста из HTML"""
        if not html_content:
            return ""
        
        try:
            # Парсим HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Удаляем скрипты и стили
            for script in soup(["script", "style", "noscript"]):
                script.decompose()
            
            # Получаем чистый текст
            text = soup.get_text(separator=' ', strip=True)
            
            # Дополнительная очистка
            text = re.sub(r'\s+', ' ', text)  # Убираем лишние пробелы
            text = text.strip()
            
            return text
            
        except Exception as e:
            print(f"Ошибка извлечения текста: {e}")
            # Fallback - простая очистка
            return self.simple_text_extraction(html_content)
    
    def simple_text_extraction(self, text: str) -> str:
        """Простое извлечение текста без BeautifulSoup"""
        if not text:
            return ""
        
        # Декодируем HTML entities
        clean_text = html.unescape(text)
        
        # Удаляем HTML теги
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        
        # Убираем JavaScript код
        clean_text = re.sub(r'<script[^>]*>.*?</script>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r'<style[^>]*>.*?</style>', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        
        # Убираем лишние пробелы
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        return clean_text
    
    def create_text_file(self, vacancies: List[Dict[str, Any]], output_path: str) -> bool:
        """Создание текстового файла с вакансиями"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                # Заголовок документа
                f.write("ЭКСПОРТ ВАКАНСИЙ ДЛЯ ОБРАБОТКИ В CHATGPT\n")
                f.write("=" * 60 + "\n\n")
                
                # Метаинформация
                export_date = datetime.now().strftime("%d.%m.%Y %H:%M")
                f.write(f"Дата экспорта: {export_date}\n")
                f.write(f"Количество вакансий: {len(vacancies)}\n\n")
                
                # Обработка каждой вакансии
                for i, vacancy in enumerate(vacancies, 1):
                    f.write(f"ВАКАНСИЯ #{vacancy['id']}\n")
                    f.write("-" * 40 + "\n")
                    
                    # Заголовок
                    clean_title = self.extract_clean_text(vacancy['title'])
                    f.write(f"Заголовок: {clean_title}\n")
                    
                    # Компания
                    clean_company = self.extract_clean_text(vacancy['company'])
                    f.write(f"Компания: {clean_company}\n")
                    
                    # Источник и дата
                    f.write(f"Источник: {vacancy['source']}\n")
                    if vacancy['published_at']:
                        published_date = vacancy['published_at'][:10] if len(vacancy['published_at']) > 10 else vacancy['published_at']
                        f.write(f"Дата: {published_date}\n")
                    
                    f.write("\n")
                    
                    # Описание
                    if vacancy['full_description']:
                        f.write("ОПИСАНИЕ:\n")
                        clean_description = self.extract_clean_text(vacancy['full_description'])
                        
                        if clean_description.strip():
                            f.write(clean_description)
                        else:
                            f.write("[Текст не найден после очистки]")
                        
                        f.write("\n\n")
                    
                    # Разделитель между вакансиями
                    if i < len(vacancies):
                        f.write("=" * 60 + "\n\n")
            
            print(f"Текстовый файл создан: {output_path}")
            return True
            
        except Exception as e:
            print(f"Ошибка создания файла: {e}")
            return False
    
    def export_vacancies_to_text(self, output_path: str = None) -> bool:
        """Экспорт всех вакансий в текстовый файл"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"vacancies_export_{timestamp}.txt"
        
        print("Простой экспорт вакансий в текстовый файл")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Получаем вакансии
        vacancies = self.get_vacancies_for_export()
        if not vacancies:
            print("Нет вакансий для экспорта")
            return False
        
        # Создаем текстовый файл
        success = self.create_text_file(vacancies, output_path)
        
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
    print("Простой экспорт вакансий в текстовый файл")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Создаем экспортер
    exporter = SimpleTextExporter(db_path)
    
    try:
        # Экспортируем вакансии
        success = exporter.export_vacancies_to_text()
        
        if success:
            print("\nГотово! Теперь:")
            print("1. Откройте созданный текстовый файл")
            print("2. Скопируйте содержимое")
            print("3. Вставьте в ChatGPT")
            print("4. Попросите ChatGPT переписать описания вакансий")
            print("5. Скопируйте результат обратно")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        exporter.close_connection()


if __name__ == "__main__":
    main()








