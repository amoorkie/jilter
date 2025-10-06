# Test direct parsing through Java service
Write-Host "Testing direct parsing through Java service..." -ForegroundColor Green

# Test health check
Write-Host "`n1. Testing Java Parser health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    Write-Host "Health: $($health.status)" -ForegroundColor Green
    Write-Host "Service: $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "Java Parser not running!" -ForegroundColor Red
    exit 1
}

# Test Geekjob parsing
Write-Host "`n2. Testing Geekjob parsing..." -ForegroundColor Yellow
try {
    $geekjobResult = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/geekjob" -Method POST -Body '{"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "Geekjob result:" -ForegroundColor Green
    Write-Host "  Message: $($geekjobResult.message)" -ForegroundColor White
    Write-Host "  Total found: $($geekjobResult.total_found)" -ForegroundColor White
    Write-Host "  Saved: $($geekjobResult.saved)" -ForegroundColor White
    
    if ($geekjobResult.results -and $geekjobResult.results.Count -gt 0) {
        Write-Host "  First vacancy:" -ForegroundColor Cyan
        Write-Host "    Title: $($geekjobResult.results[0].title)" -ForegroundColor White
        Write-Host "    Company: $($geekjobResult.results[0].company)" -ForegroundColor White
        Write-Host "    Location: $($geekjobResult.results[0].location)" -ForegroundColor White
    }
} catch {
    Write-Host "Geekjob parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test HH parsing
Write-Host "`n3. Testing HH.ru parsing..." -ForegroundColor Yellow
try {
    $hhResult = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/hh" -Method POST -Body '{"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "HH.ru result:" -ForegroundColor Green
    Write-Host "  Message: $($hhResult.message)" -ForegroundColor White
    Write-Host "  Total found: $($hhResult.total_found)" -ForegroundColor White
    Write-Host "  Saved: $($hhResult.saved)" -ForegroundColor White
} catch {
    Write-Host "HH.ru parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Habr parsing
Write-Host "`n4. Testing Habr parsing..." -ForegroundColor Yellow
try {
    $habrResult = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/habr" -Method POST -Body '{"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "Habr result:" -ForegroundColor Green
    Write-Host "  Message: $($habrResult.message)" -ForegroundColor White
    Write-Host "  Total found: $($habrResult.total_found)" -ForegroundColor White
    Write-Host "  Saved: $($habrResult.saved)" -ForegroundColor White
} catch {
    Write-Host "Habr parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nParsing test completed!" -ForegroundColor Green






