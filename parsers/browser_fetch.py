#!/usr/bin/env python3
"""
Утилиты для получения HTML через Playwright (headless Chromium) с антидетектом и ретраями.

Основная функция: get_html(url, timeout_ms=20000, wait_selector=None, max_retries=3)
"""

import random
import time
from typing import Optional

USER_AGENTS = [
    # Несколько актуальных UA строк
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
]

VIEWPORTS = [
    { 'width': 1280, 'height': 800 },
    { 'width': 1366, 'height': 768 },
    { 'width': 1440, 'height': 900 },
    { 'width': 1920, 'height': 1080 },
]

LOCALES = ['ru-RU', 'ru', 'ru-RU,en-US;q=0.9']
TIMEZONES = ['Europe/Moscow', 'Europe/Samara', 'Europe/Kaliningrad']


def _create_context(p, proxy: Optional[dict] = None):
    ua = random.choice(USER_AGENTS)
    vp = random.choice(VIEWPORTS)
    locale = random.choice(LOCALES)
    tz = random.choice(TIMEZONES)

    browser = p.chromium.launch(headless=True, args=[
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
    ])

    context_kwargs = dict(
        locale=locale,
        user_agent=ua,
        timezone_id=tz,
        viewport=vp,
        java_script_enabled=True,
    )
    if proxy:
        context_kwargs['proxy'] = proxy

    context = browser.new_context(**context_kwargs)

    # Антидетект: скрыть webdriver и добавить небольшую неустойчивость таймингов
    context.add_init_script(
        """
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU','ru'] });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
        if (originalQuery) {
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
          );
        }
        """
    )

    page = context.new_page()
    return browser, context, page


def get_html(url: str, timeout_ms: int = 20000, wait_selector: Optional[str] = None, max_retries: int = 3) -> Optional[str]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None

    attempt = 0
    last_error = None
    while attempt < max_retries:
        attempt += 1
        try:
            with sync_playwright() as p:
                browser, context, page = _create_context(p)
                page.set_default_timeout(timeout_ms)
                # случайная человеческая задержка перед навигацией
                time.sleep(random.uniform(0.2, 1.0))
                page.goto(url, wait_until='domcontentloaded')
                # имитация небольшого скролла
                try:
                    page.mouse.wheel(0, random.randint(100, 600))
                except Exception:
                    pass
                # ждем сеть
                try:
                    page.wait_for_load_state('networkidle', timeout=timeout_ms)
                except Exception:
                    pass
                if wait_selector:
                    try:
                        page.wait_for_selector(wait_selector, timeout=timeout_ms)
                    except Exception:
                        pass
                html = page.content()
                context.close()
                browser.close()
                if html and len(html) > 5000:
                    return html
        except Exception as e:
            last_error = e
        # джиттер между попытками
        time.sleep(random.uniform(0.8, 2.0))

    return None


