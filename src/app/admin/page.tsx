'use client';

import { useState, useEffect } from 'react';
import { VacancyRecord } from '@/lib/database/sqlite-service';
import PythonParserControl from '@/components/PythonParserControl';
import VacancyPreview from '@/components/VacancyPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';
type TabType = 'vacancies' | 'parser';

export default function AdminPanel() {
  const [vacancies, setVacancies] = useState<VacancyRecord[]>([]);
  const [filteredVacancies, setFilteredVacancies] = useState<VacancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancy, setSelectedVacancy] = useState<VacancyRecord | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('vacancies');
  const [editedDescription, setEditedDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAllVacancies();
  }, []);

  useEffect(() => {
    filterVacancies();
  }, [vacancies, filter, searchQuery]);

  const fetchAllVacancies = async () => {
    try {
      // Загружаем все вакансии для админки
      const response = await fetch('/api/admin/all');
      if (!response.ok) {
        // Если API не существует, используем pending как fallback
        const fallbackResponse = await fetch('/api/admin/pending');
        const fallbackData = await fallbackResponse.json();
        setVacancies(fallbackData.vacancies || []);
        return;
      }
      const data = await response.json();
      setVacancies(data.vacancies || []);
    } catch (error) {
      console.error('Ошибка загрузки вакансий:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVacancies = () => {
    let filtered = vacancies;

    // Фильтр по статусу
    if (filter === 'pending') {
      filtered = filtered.filter(v => !v.is_approved && !v.is_rejected);
    } else if (filter === 'approved') {
      filtered = filtered.filter(v => v.is_approved && !v.is_rejected);
    } else if (filter === 'rejected') {
      filtered = filtered.filter(v => v.is_rejected);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.company.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query))
      );
    }

    setFilteredVacancies(filtered);
  };

  const handleModeration = async (vacancyId: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: vacancyId,
          action,
          notes: moderationNotes,
          moderator: 'admin',
        }),
      });

      if (response.ok) {
        await fetchAllVacancies();
        setSelectedVacancy(null);
        setModerationNotes('');
        setEditedDescription('');
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        console.error('Ошибка модерации:', errorData);
        alert(`Ошибка модерации: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка модерации:', error);
    }
  };

  const handleEditDescription = (vacancy: VacancyRecord) => {
    setSelectedVacancy(vacancy);
    // Загружаем отредактированное описание, если есть, иначе исходное
    setEditedDescription(vacancy.edited_description || vacancy.full_description || vacancy.description || '');
    setIsEditing(true);
  };

  const handleSaveDescription = async () => {
    if (!selectedVacancy) return;

    try {
      const response = await fetch('/api/admin/update-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedVacancy.id,
          description: editedDescription,
        }),
      });

      if (response.ok) {
        await fetchAllVacancies();
        setIsEditing(false);
        alert('Описание сохранено успешно!');
      } else {
        const errorData = await response.json();
        console.error('Ошибка сохранения:', errorData);
        alert(`Ошибка сохранения: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения описания:', error);
    }
  };

  const handleCopyDescription = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Описание скопировано в буфер обмена!');
    }).catch(() => {
      alert('Ошибка копирования');
    });
  };

  const getStatusBadge = (vacancy: VacancyRecord) => {
    if (vacancy.is_approved) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Одобрено</Badge>;
    } else if (vacancy.is_rejected) {
      return <Badge variant="destructive">Отклонено</Badge>;
    } else {
      return <Badge variant="secondary">На модерации</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка вакансий...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Админ панель</CardTitle>
            <CardDescription>Управление вакансиями и парсинг</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vacancies">
                  📋 Вакансии ({filteredVacancies.length})
                </TabsTrigger>
                <TabsTrigger value="parser">
                  🐍 Парсер
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vacancies" className="mt-6">
                <div className="space-y-6">
                  {/* Фильтры и поиск */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Поиск по названию, компании или описанию..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
                        <Button
                          key={status}
                          variant={filter === status ? "default" : "outline"}
                          onClick={() => setFilter(status)}
                          size="sm"
                        >
                          {status === 'all' && 'Все'}
                          {status === 'pending' && 'На модерации'}
                          {status === 'approved' && 'Одобрено'}
                          {status === 'rejected' && 'Отклонено'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Список вакансий */}
                  <div className="space-y-4">
                    {filteredVacancies.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8 text-gray-500">
                          <p>Вакансии не найдены</p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredVacancies.map((vacancy) => (
                        <Card key={vacancy.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{vacancy.title}</h3>
                                <p className="text-gray-600 text-sm mb-2">{vacancy.company} • {vacancy.source}</p>
                                {getStatusBadge(vacancy)}
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Подробнее
                                  </Button>
                                </DialogTrigger>
                                 <DialogContent className="w-[80vw] max-w-none max-h-[90vh] overflow-y-auto" style={{ width: '80vw', maxWidth: 'none' }}>
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center justify-between">
                                      <span>{vacancy.title}</span>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleEditDescription(vacancy)}
                                        >
                                          Редактировать описание
                                        </Button>
                                      </div>
                                    </DialogTitle>
                                    <DialogDescription>{vacancy.company}</DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                      <h3 className="font-semibold text-gray-900 mb-2">Основная информация</h3>
                                      <p className="text-gray-600 mb-2"><strong>Компания:</strong> {vacancy.company}</p>
                                      <p className="text-gray-600 mb-2"><strong>Источник:</strong> {vacancy.source}</p>
                                      <p className="text-gray-600 mb-2"><strong>URL:</strong> 
                                        <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                          Открыть
                                        </a>
                                      </p>
                                    </div>

                                    <div>
                                      <h3 className="font-semibold text-gray-900 mb-2">AI Анализ</h3>
                                      <p className="text-gray-600 mb-1"><strong>Специализация:</strong> {vacancy.ai_specialization}</p>
                                      <p className="text-gray-600 mb-1">
                                        <strong>Занятость:</strong> {
                                          Array.isArray(vacancy.ai_employment) 
                                            ? vacancy.ai_employment.join(', ') 
                                            : vacancy.ai_employment || 'Не указано'
                                        }
                                      </p>
                                      <p className="text-gray-600 mb-1"><strong>Опыт:</strong> {vacancy.ai_experience}</p>
                                      <p className="text-gray-600 mb-1"><strong>Удаленно:</strong> {vacancy.ai_remote ? 'Да' : 'Нет'}</p>
                                      <p className="text-gray-600"><strong>Релевантность:</strong> {(vacancy.ai_relevance_score * 100).toFixed(1)}%</p>
                                    </div>
                                  </div>

                                  <Separator className="my-6" />

                                  {/* Исходное описание */}
                                  <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="font-semibold text-gray-900">Исходное описание</h3>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleCopyDescription(vacancy.full_description || vacancy.description || '')}
                                      >
                                        Копировать весь текст
                                      </Button>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border max-h-60 overflow-y-auto">
                                      <div 
                                        className="prose max-w-none text-gray-700"
                                        dangerouslySetInnerHTML={{ 
                                          __html: vacancy.full_description || vacancy.description || 'Описание не найдено' 
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Отредактированное описание (если есть) */}
                                  {vacancy.edited_description && (
                                    <div className="mb-6">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Отредактированное описание</h3>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleCopyDescription(vacancy.edited_description || '')}
                                        >
                                          Копировать отредактированный текст
                                        </Button>
                                      </div>
                                      <div className="bg-blue-50 p-4 rounded-lg border max-h-60 overflow-y-auto">
                                        <div 
                                          className="prose max-w-none text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: vacancy.edited_description 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Редактируемое описание */}
                                  {isEditing && selectedVacancy?.id === vacancy.id && (
                                    <div className="mb-6">
                                      <h3 className="font-semibold text-gray-900 mb-4">Отредактированное описание</h3>
                                      <Textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="min-h-40"
                                        placeholder="Введите отредактированное описание вакансии..."
                                      />
                                      <div className="flex gap-2 mt-4">
                                        <Button onClick={handleSaveDescription}>
                                          Сохранить описание
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => {
                                            setIsEditing(false);
                                            setEditedDescription('');
                                          }}
                                        >
                                          Отмена
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <Separator className="my-6" />

                                  <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Заметки модератора
                                    </label>
                                    <Textarea
                                      value={moderationNotes}
                                      onChange={(e) => setModerationNotes(e.target.value)}
                                      rows={3}
                                      placeholder="Добавьте заметки о решении..."
                                    />
                                  </div>

                                  <div className="flex justify-end space-x-3">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive">
                                          Отклонить
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Отклонить вакансию?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Вы уверены, что хотите отклонить эту вакансию? Это действие нельзя отменить.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleModeration(vacancy.id, 'reject')}>
                                            Отклонить
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button>
                                          Одобрить
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Одобрить вакансию?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Вы уверены, что хотите одобрить эту вакансию? Она будет отображаться в результатах поиска.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleModeration(vacancy.id, 'approve')}>
                                            Одобрить
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            
                            {/* Предварительный просмотр структурированного описания */}
                            <VacancyPreview 
                              vacancy={{
                                full_description: vacancy.full_description,
                                requirements: vacancy.requirements,
                                tasks: vacancy.tasks,
                                conditions: vacancy.conditions,
                                benefits: vacancy.benefits,
                                description: vacancy.description
                              }} 
                            />
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parser" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">🐍 Python парсеры</h2>
                    <p className="text-gray-600 mb-6">Собираем вакансии за последние 72 часа (3 дня) со всех источников</p>
                  </div>
                  <PythonParserControl onParseComplete={fetchAllVacancies} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminAuthGuard>
  );
}