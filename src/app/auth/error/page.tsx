'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'Проблема с конфигурацией сервера',
  AccessDenied: 'Доступ запрещен',
  Verification: 'Ошибка верификации. Ссылка для входа недействительна или истекла',
  Default: 'Произошла ошибка при входе в систему',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Job Filter MVP</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Ошибка аутентификации
            </CardTitle>
            <CardDescription>
              Произошла ошибка при попытке входа в систему
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Попробовать снова
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Вернуться на главную
                </Link>
              </Button>
            </div>

            {error === 'Verification' && (
              <div className="text-sm text-gray-600">
                <p>
                  Если проблема повторяется, попробуйте:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Проверить правильность email адреса</li>
                  <li>Проверить папку "Спам" в почте</li>
                  <li>Запросить новую ссылку для входа</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


