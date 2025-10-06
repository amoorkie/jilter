# parsers/monitoring_system.py

import json
import logging
import sqlite3
import time
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
import threading
# import schedule  # Закомментирован пока не установлен

class MonitoringSystem:
    """
    Система мониторинга парсеров с алертами и метриками
    """
    
    def __init__(self, db_path: str = "data/monitoring.db"):
        self.db_path = db_path
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Настройки алертов
        self.alert_settings = {
            'email_enabled': False,
            'email_smtp_server': '',
            'email_smtp_port': 587,
            'email_username': '',
            'email_password': '',
            'email_recipients': [],
            'webhook_url': '',
            'webhook_enabled': False
        }
        
        # Пороги для алертов
        self.alert_thresholds = {
            'success_rate_min': 80.0,  # Минимальный процент успешных запросов
            'avg_response_time_max': 10.0,  # Максимальное среднее время ответа (сек)
            'failed_requests_max': 10,  # Максимальное количество неудачных запросов подряд
            'no_data_hours_max': 2,  # Максимальное время без новых данных (часы)
            'error_rate_max': 15.0  # Максимальный процент ошибок
        }
        
        # Внутренние счетчики
        self.metrics = {
            'requests_total': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'response_times': [],
            'last_success': None,
            'consecutive_failures': 0,
            'errors': []
        }
        
        # Создаем директорию если не существует
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Инициализация БД
        self._init_monitoring_db()
        
        # Запуск фонового мониторинга
        self._start_background_monitoring()
    
    def _init_monitoring_db(self):
        """Инициализация базы данных мониторинга"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Таблица метрик парсинга
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS parsing_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    source TEXT NOT NULL,
                    query TEXT,
                    page INTEGER,
                    success BOOLEAN NOT NULL,
                    response_time REAL,
                    items_found INTEGER DEFAULT 0,
                    error_message TEXT,
                    user_agent TEXT,
                    http_status INTEGER
                )
            """)
            
            # Таблица алертов
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    source TEXT,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at TIMESTAMP
                )
            """)
            
            # Таблица состояния источников
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS source_health (
                    source TEXT PRIMARY KEY,
                    last_success TIMESTAMP,
                    last_failure TIMESTAMP,
                    consecutive_failures INTEGER DEFAULT 0,
                    total_requests INTEGER DEFAULT 0,
                    successful_requests INTEGER DEFAULT 0,
                    avg_response_time REAL DEFAULT 0,
                    status TEXT DEFAULT 'unknown'
                )
            """)
            
            # Создаем индексы
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_parsing_timestamp ON parsing_metrics(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_parsing_source ON parsing_metrics(source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved)")
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Monitoring database initialized: {self.db_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize monitoring database: {str(e)}")
            raise
    
    def record_request(self, source: str, query: str = '', page: int = 1, 
                      success: bool = True, response_time: float = 0, 
                      items_found: int = 0, error_message: str = '', 
                      user_agent: str = '', http_status: int = 200):
        """Запись метрики запроса"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Записываем метрику
            cursor.execute("""
                INSERT INTO parsing_metrics 
                (source, query, page, success, response_time, items_found, error_message, user_agent, http_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (source, query, page, success, response_time, items_found, error_message, user_agent, http_status))
            
            # Обновляем состояние источника
            if success:
                cursor.execute("""
                    INSERT OR REPLACE INTO source_health 
                    (source, last_success, consecutive_failures, total_requests, successful_requests, status)
                    VALUES (?, ?, 0, 
                        COALESCE((SELECT total_requests FROM source_health WHERE source = ?), 0) + 1,
                        COALESCE((SELECT successful_requests FROM source_health WHERE source = ?), 0) + 1,
                        'healthy')
                """, (source, datetime.now().isoformat(), source, source))
            else:
                cursor.execute("""
                    INSERT OR REPLACE INTO source_health 
                    (source, last_failure, consecutive_failures, total_requests, status)
                    VALUES (?, ?, 
                        COALESCE((SELECT consecutive_failures FROM source_health WHERE source = ?), 0) + 1,
                        COALESCE((SELECT total_requests FROM source_health WHERE source = ?), 0) + 1,
                        'degraded')
                """, (source, datetime.now().isoformat(), source, source))
            
            conn.commit()
            conn.close()
            
            # Обновляем внутренние метрики
            self.metrics['requests_total'] += 1
            if success:
                self.metrics['requests_successful'] += 1
                self.metrics['last_success'] = datetime.now()
                self.metrics['consecutive_failures'] = 0
            else:
                self.metrics['requests_failed'] += 1
                self.metrics['consecutive_failures'] += 1
                if error_message:
                    self.metrics['errors'].append({
                        'timestamp': datetime.now(),
                        'source': source,
                        'message': error_message
                    })
            
            if response_time > 0:
                self.metrics['response_times'].append(response_time)
                # Ограничиваем размер списка
                if len(self.metrics['response_times']) > 100:
                    self.metrics['response_times'] = self.metrics['response_times'][-100:]
            
            # Проверяем пороги для алертов
            self._check_alert_conditions(source)
            
        except Exception as e:
            self.logger.error(f"Error recording request metric: {str(e)}")
    
    def _check_alert_conditions(self, source: str):
        """Проверка условий для отправки алертов"""
        try:
            # Проверяем последовательные неудачи
            if self.metrics['consecutive_failures'] >= self.alert_thresholds['failed_requests_max']:
                self._send_alert(
                    'consecutive_failures',
                    'high',
                    f"Source {source}: {self.metrics['consecutive_failures']} consecutive failures",
                    source
                )
            
            # Проверяем время ответа
            if self.metrics['response_times']:
                avg_response_time = sum(self.metrics['response_times'][-10:]) / len(self.metrics['response_times'][-10:])
                if avg_response_time > self.alert_thresholds['avg_response_time_max']:
                    self._send_alert(
                        'slow_response',
                        'medium',
                        f"Source {source}: Average response time {avg_response_time:.2f}s exceeds threshold",
                        source
                    )
            
            # Проверяем процент успешности
            if self.metrics['requests_total'] >= 10:
                success_rate = (self.metrics['requests_successful'] / self.metrics['requests_total']) * 100
                if success_rate < self.alert_thresholds['success_rate_min']:
                    self._send_alert(
                        'low_success_rate',
                        'high',
                        f"Source {source}: Success rate {success_rate:.1f}% below threshold",
                        source
                    )
            
            # Проверяем время без данных
            if self.metrics['last_success']:
                hours_since_success = (datetime.now() - self.metrics['last_success']).total_seconds() / 3600
                if hours_since_success > self.alert_thresholds['no_data_hours_max']:
                    self._send_alert(
                        'no_data',
                        'high',
                        f"Source {source}: No successful requests for {hours_since_success:.1f} hours",
                        source
                    )
            
        except Exception as e:
            self.logger.error(f"Error checking alert conditions: {str(e)}")
    
    def _send_alert(self, alert_type: str, severity: str, message: str, source: str = ''):
        """Отправка алерта"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Проверяем, не отправляли ли уже такой алерт недавно (дедупликация)
            cursor.execute("""
                SELECT COUNT(*) FROM alerts 
                WHERE alert_type = ? AND source = ? AND resolved = FALSE 
                AND timestamp > ?
            """, (alert_type, source, (datetime.now() - timedelta(minutes=30)).isoformat()))
            
            if cursor.fetchone()[0] > 0:
                conn.close()
                return  # Алерт уже был отправлен недавно
            
            # Записываем алерт
            cursor.execute("""
                INSERT INTO alerts (alert_type, severity, message, source)
                VALUES (?, ?, ?, ?)
            """, (alert_type, severity, message, source))
            
            conn.commit()
            conn.close()
            
            # Отправляем уведомления
            self._send_notifications(alert_type, severity, message, source)
            
            self.logger.warning(f"ALERT [{severity.upper()}]: {message}")
            
        except Exception as e:
            self.logger.error(f"Error sending alert: {str(e)}")
    
    def _send_notifications(self, alert_type: str, severity: str, message: str, source: str):
        """Отправка уведомлений (email, webhook)"""
        # Email уведомления
        if self.alert_settings['email_enabled'] and self.alert_settings['email_recipients']:
            self._send_email_alert(alert_type, severity, message, source)
        
        # Webhook уведомления
        if self.alert_settings['webhook_enabled'] and self.alert_settings['webhook_url']:
            self._send_webhook_alert(alert_type, severity, message, source)
    
    def _send_email_alert(self, alert_type: str, severity: str, message: str, source: str):
        """Отправка email алерта"""
        try:
            if not all([
                self.alert_settings['email_smtp_server'],
                self.alert_settings['email_username'],
                self.alert_settings['email_password']
            ]):
                return
            
            # Создаем сообщение
            msg = MIMEMultipart()
            msg['From'] = self.alert_settings['email_username']
            msg['To'] = ', '.join(self.alert_settings['email_recipients'])
            msg['Subject'] = f"Parser Alert [{severity.upper()}]: {source}"
            
            body = f"""
            Обнаружена проблема с парсером:
            
            Источник: {source}
            Тип алерта: {alert_type}
            Серьезность: {severity}
            Сообщение: {message}
            Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            Проверьте состояние парсера и примите необходимые меры.
            """
            
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Отправляем
            with smtplib.SMTP(self.alert_settings['email_smtp_server'], self.alert_settings['email_smtp_port']) as server:
                server.starttls()
                server.login(self.alert_settings['email_username'], self.alert_settings['email_password'])
                server.send_message(msg)
            
            self.logger.info(f"Email alert sent for {alert_type}")
            
        except Exception as e:
            self.logger.error(f"Error sending email alert: {str(e)}")
    
    def _send_webhook_alert(self, alert_type: str, severity: str, message: str, source: str):
        """Отправка webhook алерта"""
        try:
            import requests
            
            payload = {
                'alert_type': alert_type,
                'severity': severity,
                'message': message,
                'source': source,
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(
                self.alert_settings['webhook_url'],
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                self.logger.info(f"Webhook alert sent for {alert_type}")
            else:
                self.logger.warning(f"Webhook alert failed: HTTP {response.status_code}")
                
        except Exception as e:
            self.logger.error(f"Error sending webhook alert: {str(e)}")
    
    def get_health_status(self) -> Dict[str, Any]:
        """Получение общего статуса здоровья системы"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Общие метрики за последние 24 часа
            yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
                    AVG(response_time) as avg_response_time,
                    SUM(items_found) as total_items
                FROM parsing_metrics 
                WHERE timestamp > ?
            """, (yesterday,))
            
            overall_metrics = cursor.fetchone()
            
            # Статус по источникам
            cursor.execute("SELECT * FROM source_health")
            sources_health = cursor.fetchall()
            
            # Активные алерты
            cursor.execute("""
                SELECT alert_type, severity, COUNT(*) as count
                FROM alerts 
                WHERE resolved = FALSE AND timestamp > ?
                GROUP BY alert_type, severity
            """, (yesterday,))
            
            active_alerts = cursor.fetchall()
            
            conn.close()
            
            # Формируем результат
            total_requests, successful_requests, avg_response_time, total_items = overall_metrics
            
            success_rate = (successful_requests / max(total_requests, 1)) * 100
            
            # Определяем общий статус
            overall_status = 'healthy'
            if success_rate < 80:
                overall_status = 'critical'
            elif success_rate < 90 or (avg_response_time and avg_response_time > 5):
                overall_status = 'degraded'
            elif len(active_alerts) > 0:
                overall_status = 'warning'
            
            return {
                'overall_status': overall_status,
                'success_rate': round(success_rate, 2),
                'total_requests_24h': total_requests or 0,
                'successful_requests_24h': successful_requests or 0,
                'avg_response_time': round(avg_response_time or 0, 2),
                'total_items_found': total_items or 0,
                'active_alerts': len(active_alerts),
                'sources_health': [
                    {
                        'source': row[0],
                        'last_success': row[1],
                        'last_failure': row[2],
                        'consecutive_failures': row[3],
                        'total_requests': row[4],
                        'successful_requests': row[5],
                        'avg_response_time': round(row[6] or 0, 2),
                        'status': row[7]
                    }
                    for row in sources_health
                ],
                'alerts_summary': [
                    {
                        'type': alert[0],
                        'severity': alert[1],
                        'count': alert[2]
                    }
                    for alert in active_alerts
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting health status: {str(e)}")
            return {'error': str(e)}
    
    def resolve_alerts(self, alert_type: str = '', source: str = ''):
        """Разрешение алертов"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "UPDATE alerts SET resolved = TRUE, resolved_at = ? WHERE resolved = FALSE"
            params = [datetime.now().isoformat()]
            
            if alert_type:
                query += " AND alert_type = ?"
                params.append(alert_type)
            
            if source:
                query += " AND source = ?"
                params.append(source)
            
            cursor.execute(query, params)
            resolved_count = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Resolved {resolved_count} alerts")
            return resolved_count
            
        except Exception as e:
            self.logger.error(f"Error resolving alerts: {str(e)}")
            return 0
    
    def _start_background_monitoring(self):
        """Запуск фонового мониторинга"""
        def monitoring_job():
            try:
                # Очистка старых записей (старше 30 дней)
                thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
                
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute("DELETE FROM parsing_metrics WHERE timestamp < ?", (thirty_days_ago,))
                cursor.execute("DELETE FROM alerts WHERE timestamp < ? AND resolved = TRUE", (thirty_days_ago,))
                
                conn.commit()
                conn.close()
                
                self.logger.debug("Background monitoring cleanup completed")
                
            except Exception as e:
                self.logger.error(f"Error in background monitoring: {str(e)}")
        
        # Запускаем очистку каждые 6 часов (временно отключено)
        # schedule.every(6).hours.do(monitoring_job)
        
        def run_scheduler():
            while True:
                # schedule.run_pending()
                time.sleep(3600)  # Проверяем каждый час
        
        # Запускаем в отдельном потоке
        monitor_thread = threading.Thread(target=run_scheduler, daemon=True)
        monitor_thread.start()
    
    def configure_alerts(self, **settings):
        """Настройка параметров алертов"""
        self.alert_settings.update(settings)
        self.logger.info("Alert settings updated")
    
    def set_thresholds(self, **thresholds):
        """Установка порогов для алертов"""
        self.alert_thresholds.update(thresholds)
        self.logger.info("Alert thresholds updated")
    
    def print_health_report(self):
        """Вывод отчета о состоянии системы"""
        health = self.get_health_status()
        
        if "error" in health:
            print(f"Error getting health report: {health['error']}")
            return
        
        print("\n" + "="*60)
        print("ОТЧЕТ О СОСТОЯНИИ СИСТЕМЫ ПАРСИНГА")
        print("="*60)
        print(f"Общий статус: {health['overall_status'].upper()}")
        print(f"Успешность запросов: {health['success_rate']}%")
        print(f"Запросов за 24ч: {health['total_requests_24h']}")
        print(f"Среднее время ответа: {health['avg_response_time']}с")
        print(f"Найдено вакансий: {health['total_items_found']}")
        print(f"Активных алертов: {health['active_alerts']}")
        
        if health['sources_health']:
            print(f"\nСостояние источников:")
            for source in health['sources_health']:
                print(f"  {source['source']}: {source['status']} "
                      f"(успешность: {(source['successful_requests']/max(source['total_requests'], 1)*100):.1f}%)")
        
        if health['alerts_summary']:
            print(f"\nАктивные алерты:")
            for alert in health['alerts_summary']:
                print(f"  {alert['type']} ({alert['severity']}): {alert['count']}")
        
        print("="*60)


# Глобальный экземпляр мониторинга
monitoring_system = MonitoringSystem()


class MonitoredParser:
    """
    Миксин для добавления мониторинга в парсеры
    """
    
    def __init__(self):
        self.monitor = monitoring_system
    
    def record_success(self, source: str, query: str = '', page: int = 1, 
                      response_time: float = 0, items_found: int = 0):
        """Запись успешного запроса"""
        self.monitor.record_request(
            source=source,
            query=query,
            page=page,
            success=True,
            response_time=response_time,
            items_found=items_found
        )
    
    def record_failure(self, source: str, error_message: str, query: str = '', 
                      page: int = 1, http_status: int = 0):
        """Запись неудачного запроса"""
        self.monitor.record_request(
            source=source,
            query=query,
            page=page,
            success=False,
            error_message=error_message,
            http_status=http_status
        )


def main():
    """Тестирование системы мониторинга"""
    logging.basicConfig(level=logging.INFO)
    
    monitor = MonitoringSystem()
    
    print("Testing monitoring system...")
    
    # Имитируем некоторые запросы
    monitor.record_request('habr', 'дизайнер', 1, True, 2.5, 25)
    monitor.record_request('hh', 'дизайнер', 1, False, 0, 0, 'Connection timeout')
    monitor.record_request('habr', 'дизайнер', 2, True, 3.1, 20)
    
    # Выводим отчет
    monitor.print_health_report()


if __name__ == "__main__":
    main()
