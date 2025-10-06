# Простой тест GigaChat API
$authKey = "MDE5OWExNjMtZDU2Yi03ZjJkLTgyM2MtMmEyOGY2NTk3NmM1OmRlYzkxYTY1LTdlYjEtNDU1ZC04ZDk5LTdiOTAxYTZjYWFkMw=="

Write-Host "🧪 Тестируем GigaChat API..."

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
    
} catch {
    Write-Host "❌ Ошибка получения токена: $($_.Exception.Message)"
}





