# Debug API test
Write-Host "Debug API test..." -ForegroundColor Green

Write-Host "`n1. Testing Java Parser directly..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/geekjob" -Method POST -Body '{"query":"designer","pages":1}' -ContentType "application/json"
    Write-Host "Java Parser response:" -ForegroundColor Green
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    Write-Host "  Total found: $($response.total_found)" -ForegroundColor White
    Write-Host "  Saved: $($response.saved)" -ForegroundColor White
} catch {
    Write-Host "Java Parser error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing Next.js API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob"],"query":"designer","pages":1}' -ContentType "application/json"
    Write-Host "Next.js API response:" -ForegroundColor Green
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    Write-Host "  Total found: $($response.total_found)" -ForegroundColor White
    Write-Host "  Saved: $($response.saved)" -ForegroundColor White
    Write-Host "  Results count: $($response.results.Count)" -ForegroundColor White
    
    if ($response.results.Count -gt 0) {
        Write-Host "  First result:" -ForegroundColor Cyan
        $firstResult = $response.results[0]
        Write-Host "    Message: $($firstResult.message)" -ForegroundColor White
        Write-Host "    Total found: $($firstResult.total_found)" -ForegroundColor White
    }
} catch {
    Write-Host "Next.js API error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDebug completed!" -ForegroundColor Green





