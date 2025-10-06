# Test API directly
Write-Host "Testing API directly..." -ForegroundColor Green

Write-Host "`n1. Testing Java Parser health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    Write-Host "Java Parser: WORKING" -ForegroundColor Green
    Write-Host "Status: $($health.status)" -ForegroundColor White
} catch {
    Write-Host "Java Parser: NOT WORKING" -ForegroundColor Red
}

Write-Host "`n2. Testing Next.js API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob"],"query":"designer","pages":1}' -ContentType "application/json"
    Write-Host "Next.js API: WORKING" -ForegroundColor Green
    Write-Host "Results count: $($response.results.Count)" -ForegroundColor White
    
    if ($response.results.Count -gt 0) {
        $firstResult = $response.results[0]
        Write-Host "First result:" -ForegroundColor Cyan
        Write-Host "  Source: $($firstResult.source)" -ForegroundColor White
        Write-Host "  Success: $($firstResult.success)" -ForegroundColor White
        if ($firstResult.data) {
            Write-Host "  Total found: $($firstResult.data.total_found)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Next.js API: NOT WORKING" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green





