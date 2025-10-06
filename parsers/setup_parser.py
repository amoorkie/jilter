#!/usr/bin/env python3
"""
Скрипт автоматической настройки Geekjob Parser

Этот скрипт проверяет системные требования, устанавливает зависимости
и выполняет первоначальную настройку парсера.
"""

import os
import sys
import subprocess
import sqlite3
from pathlib import Path


def check_python_version():
    """Проверка версии Python"""
    print("🐍 Проверка версии Python...")
    
    if sys.version_info < (3, 8):
        print(f"❌ Требуется Python 3.8+, установлен {sys.version}")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True


def install_dependencies():
    """Установка зависимостей"""
    print("📦 Установка зависимостей...")
    
    try:
        # Проверяем наличие pip
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        
        # Устанавливаем зависимости
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], check=True)
        
        print("✅ Зависимости установлены успешно")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Ошибка установки зависимостей: {e}")
        return False
    except FileNotFoundError:
        print("❌ pip не найден")
        return False


def test_imports():
    """Тестирование импорта зависимостей"""
    print("🔍 Проверка зависимостей...")
    
    required_modules = ['requests', 'bs4', 'lxml']
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module} не найден")
            return False
    
    return True


def create_database():
    """Создание базы данных"""
    print("💾 Создание базы данных...")
    
    try:
        # Импортируем парсер для создания БД
        sys.path.insert(0, '.')
        from geekjob_parser import VacancyDatabase
        
        db = VacancyDatabase("geekjob_vacancies.db")
        print("✅ База данных создана успешно")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка создания базы данных: {e}")
        return False


def test_parser():
    """Тестовый запуск парсера"""
    print("🧪 Тестовый запуск парсера...")
    
    try:
        # Запускаем парсер в тестовом режиме
        result = subprocess.run([
            sys.executable, "geekjob_parser.py", 
            "--pages", "1", "--dry-run", "--quiet"
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Тестовый запуск успешен")
            return True
        else:
            print(f"❌ Ошибка тестового запуска: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ Тестовый запуск превысил лимит времени")
        return False
    except Exception as e:
        print(f"❌ Ошибка тестового запуска: {e}")
        return False


def main():
    """Главная функция настройки"""
    print("🚀 Настройка Geekjob Parser")
    print("=" * 50)
    
    # Проверяем рабочую директорию
    if not os.path.exists("geekjob_parser.py"):
        print("❌ Файл geekjob_parser.py не найден")
        print("Убедитесь, что вы находитесь в правильной директории")
        return 1
    
    steps = [
        ("Проверка Python", check_python_version),
        ("Установка зависимостей", install_dependencies),
        ("Проверка импортов", test_imports),
        ("Создание базы данных", create_database),
        ("Тестовый запуск", test_parser)
    ]
    
    for step_name, step_func in steps:
        print(f"\n📋 {step_name}...")
        if not step_func():
            print(f"❌ Ошибка на этапе: {step_name}")
            return 1
    
    print("\n" + "=" * 50)
    print("🎉 Настройка завершена успешно!")
    print("\n📚 Следующие шаги:")
    print("1. Запустите парсер:")
    print("   python geekjob_parser.py")
    print("\n2. Или с настройками:")
    print("   python geekjob_parser.py --query 'UI дизайнер' --pages 5")
    print("\n3. Для помощи:")
    print("   python geekjob_parser.py --help")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())











