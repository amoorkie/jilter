'use client';

import { useState } from 'react';

export default function PDFManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/admin/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'all' }),
      });

      const result = await response.json();
      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        error: 'Ошибка экспорта PDF'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Пожалуйста, выберите PDF файл');
    }
  };

  const handleImportPDF = async () => {
    if (!selectedFile) {
      alert('Пожалуйста, выберите файл для импорта');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/import-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        error: 'Ошибка импорта PDF'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadPDF = (filename: string) => {
    window.open(`/api/admin/download-pdf?file=${filename}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Управление PDF файлами
        </h2>
        <p className="text-gray-600">
          Экспортируйте вакансии в PDF для обработки в ChatGPT, затем импортируйте обработанный файл обратно.
        </p>
      </div>

      {/* Экспорт PDF */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📤 Экспорт вакансий в PDF
        </h3>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Создает PDF файл со всеми вакансиями для обработки в ChatGPT.
          </p>
          
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Создание PDF...' : 'Экспортировать в PDF'}
          </button>
          
          {exportResult && (
            <div className={`p-4 rounded-md ${
              exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {exportResult.success ? (
                <div>
                  <p className="text-green-800 font-medium">PDF файл создан успешно!</p>
                  <p className="text-sm text-green-700 mt-1">
                    Файл: {exportResult.filename}
                  </p>
                  <button
                    onClick={() => downloadPDF(exportResult.filename)}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Скачать PDF
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-medium">Ошибка создания PDF</p>
                  <p className="text-sm text-red-700 mt-1">
                    {exportResult.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Инструкции для ChatGPT */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-medium text-yellow-800 mb-4">
          🤖 Инструкции для ChatGPT
        </h3>
        
        <div className="space-y-3 text-sm text-yellow-700">
          <p><strong>После скачивания PDF:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Загрузите PDF файл в ChatGPT</li>
            <li>Попросите ChatGPT переписать описания вакансий</li>
            <li>Попросите сохранить структуру (ВАКАНСИЯ #ID, заголовок, компания, описание)</li>
            <li>Скачайте обработанный PDF файл</li>
            <li>Загрузите его обратно через форму ниже</li>
          </ol>
        </div>
      </div>

      {/* Импорт PDF */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📥 Импорт обработанного PDF
        </h3>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Загрузите PDF файл, обработанный в ChatGPT, для обновления описаний вакансий.
          </p>
          
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">
                Выбран файл: {selectedFile.name}
              </p>
            )}
          </div>
          
          <button
            onClick={handleImportPDF}
            disabled={isImporting || !selectedFile}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Импорт...' : 'Импортировать PDF'}
          </button>
          
          {importResult && (
            <div className={`p-4 rounded-md ${
              importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {importResult.success ? (
                <div>
                  <p className="text-green-800 font-medium">PDF файл импортирован успешно!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {importResult.message}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-medium">Ошибка импорта PDF</p>
                  <p className="text-sm text-red-700 mt-1">
                    {importResult.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}








