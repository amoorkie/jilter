'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, User, Mail, Calendar, Settings, LogOut, Save, Edit3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface UserPreferences {
  notifications: boolean
  emailUpdates: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'ru' | 'en'
  jobAlerts: boolean
  salaryRange?: {
    min: number
    max: number
  }
  preferredLocations?: string[]
  preferredTechnologies?: string[]
}

export default function ProfilePage() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    emailUpdates: true,
    theme: 'system',
    language: 'ru',
    jobAlerts: true,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
    } else if (user) {
      loadUserData()
    }
  }, [authLoading, user, router])

  const loadUserData = async () => {
    if (!user?.email) return

    try {
      const response = await fetch(`/api/user/profile?email=${encodeURIComponent(user.email)}`)
      const data = await response.json()

      if (response.ok && data.user) {
        setUserData(data.user)
        if (data.user.preferences) {
          setPreferences({ ...preferences, ...data.user.preferences })
        }
      } else {
        console.error('Ошибка загрузки данных пользователя:', data.error)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error)
    }
  }

  const handleSavePreferences = async () => {
    if (!userData) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
          preferences: preferences
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Настройки сохранены')
        setIsEditing(false)
        // Обновляем данные пользователя
        setUserData(data.user)
      } else {
        setError(data.error || 'Ошибка при сохранении настроек')
      }
    } catch (error) {
      setError('Ошибка при сохранении настроек')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    logout()
    router.push('/')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Личный кабинет</h1>
          <p className="mt-2 text-gray-600">
            Управляйте своим профилем и настройками
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Информация о пользователе */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Информация о профиле
                </CardTitle>
                <CardDescription>
                  Основная информация о вашем аккаунте
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || 'Аватар'}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.name || 'Пользователь'}
                    </h3>
                    <p className="text-gray-600">{user.email}</p>
                    <Badge variant="outline" className="mt-1">
                      {user.provider || 'email'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Способ входа</Label>
                    <p className="text-sm capitalize">{user.provider || 'email'}</p>
                  </div>
                  {userData?.created_at && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Дата регистрации</Label>
                      <p className="text-sm">
                        {new Date(userData.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  )}
                  {userData?.last_login && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Последний вход</Label>
                      <p className="text-sm">
                        {new Date(userData.last_login).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Настройки */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Настройки
                </CardTitle>
                <CardDescription>
                  Персонализируйте свой опыт использования
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Уведомления</Label>
                      <p className="text-sm text-gray-500">
                        Получать уведомления о новых вакансиях
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email обновления</Label>
                      <p className="text-sm text-gray-500">
                        Получать обновления на email
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailUpdates}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        emailUpdates: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Уведомления о вакансиях</Label>
                      <p className="text-sm text-gray-500">
                        Получать уведомления о подходящих вакансиях
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.jobAlerts}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        jobAlerts: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                  </div>

                  <div>
                    <Label>Язык интерфейса</Label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        language: e.target.value as 'ru' | 'en'
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <Label>Тема</Label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        theme: e.target.value as 'light' | 'dark' | 'system'
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="system">Системная</option>
                      <option value="light">Светлая</option>
                      <option value="dark">Темная</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSavePreferences}
                        disabled={isLoading}
                        size="sm"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Сохранить
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        size="sm"
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти из аккаунта
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Аккаунт создан:</span>
                    <span>
                      {userData?.created_at 
                        ? new Date(userData.created_at).toLocaleDateString('ru-RU')
                        : 'Неизвестно'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Последний вход:</span>
                    <span>
                      {userData?.last_login 
                        ? new Date(userData.last_login).toLocaleDateString('ru-RU')
                        : 'Неизвестно'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  )
}