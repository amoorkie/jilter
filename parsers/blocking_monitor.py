#!/usr/bin/env python3
"""
Система мониторинга блокировок для парсеров

Отслеживает:
- HTTP ошибки (403, 429, 503)
- Изменения в структуре сайтов
- Успешность парсинга
- Статистику по источникам

Автор: AI Assistant
Версия: 1.0.0
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class BlockingEvent:
    """Событие блокировки"""
    timestamp: str
    source: str
    url: str
    status_code: int
    error_message: str
    user_agent: str
    method: str

@dataclass
class ParsingStats:
    """Статистика парсинга"""
    source: str
    total_requests: int
    successful_requests: int
    blocked_requests: int
    avg_response_time: float
    last_success: Optional[str]
    last_failure: Optional[str]

class BlockingMonitor:
    """Монитор блокировок"""
    
    def __init__(self, log_file: str = "blocking_monitor.json"):
        self.log_file = Path(log_file)
        self.events: List[BlockingEvent] = []
        self.stats: Dict[str, ParsingStats] = {}
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Загружаем историю
        self.load_history()
    
    def load_history(self):
        """Загрузка истории из файла"""
        if self.log_file.exists():
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.events = [BlockingEvent(**event) for event in data.get('events', [])]
                    self.stats = {
                        source: ParsingStats(**stat) 
                        for source, stat in data.get('stats', {}).items()
                    }
                self.logger.info(f"📊 Загружена история: {len(self.events)} событий, {len(self.stats)} источников")
            except Exception as e:
                self.logger.warning(f"⚠️ Ошибка загрузки истории: {e}")
    
    def save_history(self):
        """Сохранение истории в файл"""
        try:
            data = {
                'events': [asdict(event) for event in self.events[-1000:]],  # Последние 1000 событий
                'stats': {source: asdict(stat) for source, stat in self.stats.items()}
            }
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.logger.error(f"❌ Ошибка сохранения истории: {e}")
    
    def log_blocking(self, source: str, url: str, status_code: int, 
                    error_message: str, user_agent: str, method: str = "GET"):
        """Логирование события блокировки"""
        event = BlockingEvent(
            timestamp=datetime.now().isoformat(),
            source=source,
            url=url,
            status_code=status_code,
            error_message=error_message,
            user_agent=user_agent,
            method=method
        )
        
        self.events.append(event)
        self.logger.warning(f"🚫 Блокировка {source}: {status_code} - {error_message}")
        
        # Обновляем статистику
        if source not in self.stats:
            self.stats[source] = ParsingStats(
                source=source,
                total_requests=0,
                successful_requests=0,
                blocked_requests=0,
                avg_response_time=0.0,
                last_success=None,
                last_failure=None
            )
        
        self.stats[source].blocked_requests += 1
        self.stats[source].last_failure = event.timestamp
    
    def log_success(self, source: str, response_time: float):
        """Логирование успешного запроса"""
        if source not in self.stats:
            self.stats[source] = ParsingStats(
                source=source,
                total_requests=0,
                successful_requests=0,
                blocked_requests=0,
                avg_response_time=0.0,
                last_success=None,
                last_failure=None
            )
        
        stat = self.stats[source]
        stat.total_requests += 1
        stat.successful_requests += 1
        stat.last_success = datetime.now().isoformat()
        
        # Обновляем среднее время ответа
        if stat.avg_response_time == 0:
            stat.avg_response_time = response_time
        else:
            stat.avg_response_time = (stat.avg_response_time + response_time) / 2
    
    def get_blocking_rate(self, source: str, hours: int = 24) -> float:
        """Получение процента блокировок за последние N часов"""
        if source not in self.stats:
            return 0.0
        
        stat = self.stats[source]
        if stat.total_requests == 0:
            return 0.0
        
        return (stat.blocked_requests / stat.total_requests) * 100
    
    def get_recent_events(self, source: str = None, hours: int = 24) -> List[BlockingEvent]:
        """Получение недавних событий блокировки"""
        cutoff = datetime.now() - timedelta(hours=hours)
        
        events = self.events
        if source:
            events = [e for e in events if e.source == source]
        
        return [
            event for event in events 
            if datetime.fromisoformat(event.timestamp) > cutoff
        ]
    
    def is_source_blocked(self, source: str, threshold: float = 50.0) -> bool:
        """Проверка, заблокирован ли источник"""
        blocking_rate = self.get_blocking_rate(source)
        return blocking_rate > threshold
    
    def get_health_report(self) -> Dict[str, Any]:
        """Получение отчета о здоровье парсеров"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'sources': {},
            'overall_health': 'good'
        }
        
        total_blocking_rate = 0
        source_count = 0
        
        for source, stat in self.stats.items():
            blocking_rate = self.get_blocking_rate(source)
            total_blocking_rate += blocking_rate
            source_count += 1
            
            health = 'good'
            if blocking_rate > 50:
                health = 'critical'
            elif blocking_rate > 25:
                health = 'warning'
            
            report['sources'][source] = {
                'health': health,
                'blocking_rate': blocking_rate,
                'total_requests': stat.total_requests,
                'successful_requests': stat.successful_requests,
                'blocked_requests': stat.blocked_requests,
                'avg_response_time': stat.avg_response_time,
                'last_success': stat.last_success,
                'last_failure': stat.last_failure
            }
        
        if source_count > 0:
            avg_blocking_rate = total_blocking_rate / source_count
            if avg_blocking_rate > 50:
                report['overall_health'] = 'critical'
            elif avg_blocking_rate > 25:
                report['overall_health'] = 'warning'
        
        return report
    
    def print_report(self):
        """Вывод отчета в консоль"""
        report = self.get_health_report()
        
        print(f"\nОТЧЕТ О ЗДОРОВЬЕ ПАРСЕРОВ ({report['timestamp']})")
        print(f"Общее состояние: {report['overall_health'].upper()}")
        print("-" * 60)
        
        for source, data in report['sources'].items():
            status_emoji = "[OK]" if data['health'] == 'good' else "[WARN]" if data['health'] == 'warning' else "[ERROR]"
            print(f"{status_emoji} {source.upper()}:")
            print(f"   Блокировки: {data['blocking_rate']:.1f}%")
            print(f"   Запросов: {data['successful_requests']}/{data['total_requests']}")
            print(f"   Время ответа: {data['avg_response_time']:.2f}с")
            if data['last_success']:
                print(f"   Последний успех: {data['last_success']}")
            if data['last_failure']:
                print(f"   Последняя ошибка: {data['last_failure']}")
            print()

# Глобальный экземпляр монитора
blocking_monitor = BlockingMonitor()

def log_blocking_event(source: str, url: str, status_code: int, 
                      error_message: str, user_agent: str, method: str = "GET"):
    """Удобная функция для логирования блокировки"""
    blocking_monitor.log_blocking(source, url, status_code, error_message, user_agent, method)
    blocking_monitor.save_history()  # Сохраняем сразу

def log_success_event(source: str, response_time: float):
    """Удобная функция для логирования успеха"""
    blocking_monitor.log_success(source, response_time)
    blocking_monitor.save_history()  # Сохраняем сразу

def get_health_report():
    """Получение отчета о здоровье"""
    return blocking_monitor.get_health_report()

def print_health_report():
    """Вывод отчета о здоровье"""
    blocking_monitor.print_report()
