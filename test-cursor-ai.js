// Тест Cursor AI интеграции
console.log('🧪 Тестируем Cursor AI интеграцию...');

// Проверяем конфигурацию
const fs = require('fs');
const path = require('path');

const configFiles = [
  '.cursorrules',
  '.cursor-ai-config.json',
  '.vscode/settings.json',
  'cursor-prompts.md',
  'templates/cursor-templates.md'
];

console.log('📁 Проверяем конфигурационные файлы:');
configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - найден`);
  } else {
    console.log(`❌ ${file} - не найден`);
  }
});

console.log('\n🎯 Cursor AI настроен для эффективной работы!');
console.log('💡 Используйте:');
console.log('  - Ctrl+K для открытия AI чата');
console.log('  - Ctrl+L для выделения кода и вопросов');
console.log('  - Ctrl+I для inline редактирования');
console.log('  - Шаблоны из cursor-prompts.md');
console.log('  - Конфигурацию из .cursorrules');

console.log('\n🚀 Готово к работе с Cursor AI!');














