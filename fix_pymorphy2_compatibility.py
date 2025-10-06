#!/usr/bin/env python3
"""
Исправление совместимости pymorphy2 с Python 3.13
Добавляет недостающий inspect.getargspec для обратной совместимости
"""

import inspect
import sys

# Проверяем версию Python
if sys.version_info >= (3, 11):
    # В Python 3.11+ inspect.getargspec был удален
    # Добавляем его обратно для совместимости
    def getargspec(func):
        """Обратная совместимость для inspect.getargspec"""
        try:
            # Используем новый inspect.signature
            sig = inspect.signature(func)
            args = []
            varargs = None
            varkw = None
            defaults = []
            kwonlyargs = []
            kwonlydefaults = {}
            annotations = {}
            
            for param_name, param in sig.parameters.items():
                if param.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD:
                    args.append(param_name)
                    if param.default != inspect.Parameter.empty:
                        defaults.append(param.default)
                elif param.kind == inspect.Parameter.VAR_POSITIONAL:
                    varargs = param_name
                elif param.kind == inspect.Parameter.VAR_KEYWORD:
                    varkw = param_name
                elif param.kind == inspect.Parameter.KEYWORD_ONLY:
                    kwonlyargs.append(param_name)
                    if param.default != inspect.Parameter.empty:
                        kwonlydefaults[param_name] = param.default
                
                if param.annotation != inspect.Parameter.empty:
                    annotations[param_name] = param.annotation
            
            # Возвращаем в формате старого getargspec
            return inspect.ArgSpec(args, varargs, varkw, defaults)
            
        except Exception as e:
            print(f"Warning: Could not create getargspec for {func}: {e}")
            # Возвращаем пустой ArgSpec в случае ошибки
            return inspect.ArgSpec([], None, None, [])
    
    # Монkey patch для inspect.getargspec
    inspect.getargspec = getargspec
    print("✅ Added inspect.getargspec compatibility for Python 3.13")

else:
    print("✅ Python version < 3.11, no compatibility fix needed")

print("🔧 pymorphy2 compatibility fix applied")





