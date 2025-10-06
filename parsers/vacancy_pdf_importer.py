#!/usr/bin/env python3
"""
Импорт обработанного PDF файла обратно в базу данных
"""

import sqlite3
import os
import sys
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

try:
    import PyPDF2
except ImportError:
    print("Ошибка: PyPDF2 не установлен")
    print("Установите: pip install PyPDF2")
    sys.exit(1)


class VacancyPDFImporter:
    """Класс для импорта обработанного PDF"""
    
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
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Извлечение текста из PDF"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
                
                print(f"Извлечено {len(text)} символов из PDF")
                return text
                
        except Exception as e:
            print(f"Ошибка чтения PDF: {e}")
            return ""
    
    def parse_vacancies_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Парсинг вакансий из текста"""
        vacancies = []
        
        # Разделяем текст на вакансии по разделителю "ВАКАНСИЯ #"
        vacancy_blocks = re.split(r'ВАКАНСИЯ #(\d+)', text)
        
        # Убираем первый пустой элемент
        if vacancy_blocks and not vacancy_blocks[0].strip():
            vacancy_blocks = vacancy_blocks[1:]
        
        # Обрабатываем пары (ID, содержимое)
        for i in range(0, len(vacancy_blocks), 2):
            if i + 1 < len(vacancy_blocks):
                vacancy_id = vacancy_blocks[i].strip()
                content = vacancy_blocks[i + 1].strip()
                
                if vacancy_id.isdigit():
                    parsed_vacancy = self.parse_single_vacancy(int(vacancy_id), content)
                    if parsed_vacancy:
                        vacancies.append(parsed_vacancy)
        
        print(f"Найдено вакансий в PDF: {len(vacancies)}")
        return vacancies
    
    def parse_single_vacancy(self, vacancy_id: int, content: str) -> Optional[Dict[str, Any]]:
        """Парсинг одной вакансии"""
        try:
            # Извлекаем заголовок (первая строка после ID)
            lines = content.split('\n')
            title = ""
            company = ""
            description = ""
            
            # Ищем заголовок (обычно это первая непустая строка)
            for line in lines:
                line = line.strip()
                if line and not line.startswith('Компания:') and not line.startswith('Источник:'):
                    title = line
                    break
            
            # Ищем компанию
            company_match = re.search(r'Компания:\s*(.+)', content)
            if company_match:
                company = company_match.group(1).strip()
            
            # Ищем описание (все после "Описание:")
            description_match = re.search(r'Описание:\s*(.+)', content, re.DOTALL)
            if description_match:
                description = description_match.group(1).strip()
            
            return {
                'id': vacancy_id,
                'title': title,
                'company': company,
                'description': description,
                'content': content
            }
            
        except Exception as e:
            print(f"Ошибка парсинга вакансии {vacancy_id}: {e}")
            return None
    
    def update_vacancy_in_database(self, vacancy_data: Dict[str, Any]) -> bool:
        """Обновление вакансии в базе данных"""
        try:
            cursor = self.connection.cursor()
            
            # Обновляем описание вакансии
            cursor.execute("""
                UPDATE vacancies 
                SET full_description = ?
                WHERE id = ?
            """, (vacancy_data['description'], vacancy_data['id']))
            
            if cursor.rowcount > 0:
                self.connection.commit()
                print(f"Обновлена вакансия {vacancy_data['id']}: {vacancy_data['title']}")
                return True
            else:
                print(f"Вакансия {vacancy_data['id']} не найдена в базе")
                return False
                
        except sqlite3.Error as e:
            print(f"Ошибка обновления вакансии {vacancy_data['id']}: {e}")
            return False
    
    def import_pdf_to_database(self, pdf_path: str) -> bool:
        """Импорт PDF в базу данных"""
        print("Импорт обработанного PDF в базу данных")
        print("="*50)
        
        # Подключаемся к базе
        if not self.connect_to_database():
            return False
        
        # Извлекаем текст из PDF
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            print("Не удалось извлечь текст из PDF")
            return False
        
        # Парсим вакансии
        vacancies = self.parse_vacancies_from_text(text)
        if not vacancies:
            print("Не найдено вакансий в PDF")
            return False
        
        # Обновляем базу данных
        updated_count = 0
        for vacancy in vacancies:
            if self.update_vacancy_in_database(vacancy):
                updated_count += 1
        
        print(f"\nИмпорт завершен!")
        print(f"Обработано вакансий: {len(vacancies)}")
        print(f"Обновлено в базе: {updated_count}")
        
        return updated_count > 0
    
    def close_connection(self):
        """Закрытие соединения с базой данных"""
        if self.connection:
            self.connection.close()
            print("Соединение с базой данных закрыто")


def main():
    """Главная функция"""
    print("Импорт обработанного PDF в базу данных")
    print("="*50)
    
    # Путь к базе данных
    db_path = "data/vacancies.db"
    
    # Проверяем существование базы
    if not os.path.exists(db_path):
        print(f"База данных не найдена: {db_path}")
        return
    
    # Путь к PDF файлу (передается как аргумент)
    if len(sys.argv) < 2:
        print("Использование: python vacancy_pdf_importer.py <путь_к_pdf>")
        return
    
    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(f"PDF файл не найден: {pdf_path}")
        return
    
    # Создаем импортер
    importer = VacancyPDFImporter(db_path)
    
    try:
        # Импортируем PDF
        success = importer.import_pdf_to_database(pdf_path)
        
        if success:
            print("\nИмпорт завершен успешно!")
        else:
            print("\nОшибка импорта")
        
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        importer.close_connection()


if __name__ == "__main__":
    main()








