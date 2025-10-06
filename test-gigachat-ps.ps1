# Тест GigaChat API через PowerShell
$authKey = "MDE5OWExNjMtZDU2Yi03ZjJkLTgyM2MtMmEyOGY2NTk3NmM1OmRlYzkxYTY1LTdlYjEtNDU1ZC04ZDk5LTdiOTAxYTZjYWFkMw=="

Write-Host "🧪 Тестируем GigaChat API через PowerShell..."
Write-Host "🔑 Auth ключ: Найден"

try {
    Write-Host "🔐 Получаем Access Token..."
    
    $headers = @{
        'Content-Type' = 'application/x-www-form-urlencoded'
        'Accept' = 'application/json'
        'RqUID' = '51a30daf-32fb-4a9c-b32a-8b149fc0c702'
        'Authorization' = "Basic $authKey"
    }
    
    $body = 'scope=GIGACHAT_API_PERS'
    
    $response = Invoke-RestMethod -Uri 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Access Token получен!"
    Write-Host "📝 Токен: $($response.access_token)"
    
    # Теперь тестируем API запрос
    Write-Host "🤖 Тестируем API запрос..."
    
    $apiHeaders = @{
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $($response.access_token)"
    }
    
    $apiBody = @{
        model = 'GigaChat:latest'
        messages = @(
            @{
                role = 'user'
                content = 'Привет! Как дела?'
            }
        )
        temperature = 0.3
        max_tokens = 100
    } | ConvertTo-Json -Depth 3
    
    $apiResponse = Invoke-RestMethod -Uri 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions' -Method POST -Headers $apiHeaders -Body $apiBody
    
    Write-Host "✅ GigaChat API работает!"
    Write-Host "📝 Ответ: $($apiResponse.choices[0].message.content)"
    
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "📝 Детали: $($_.Exception.Response)"
    }
}
