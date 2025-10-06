# Simple parsing test
Write-Host "Testing parsing..." -ForegroundColor Green

Write-Host "`n1. Testing single source (geekjob)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob"],"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "Success: $($response.success)" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor White
    Write-Host "Results count: $($response.results.Count)" -ForegroundColor White
    
    if ($response.results.Count -gt 0) {
        $firstResult = $response.results[0]
        Write-Host "First result:" -ForegroundColor Cyan
        Write-Host "  Source: $($firstResult.source)" -ForegroundColor White
        Write-Host "  Success: $($firstResult.success)" -ForegroundColor White
        if ($firstResult.data) {
            Write-Host "  Total found: $($firstResult.data.total_found)" -ForegroundColor White
            Write-Host "  Saved: $($firstResult.data.saved)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing multiple sources..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob","hh"],"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "Success: $($response.success)" -ForegroundColor Green
    Write-Host "Results count: $($response.results.Count)" -ForegroundColor White
    
    $totalFound = 0
    foreach ($result in $response.results) {
        if ($result.success -and $result.data) {
            $totalFound += $result.data.total_found
            Write-Host "  $($result.source): $($result.data.total_found) vacancies" -ForegroundColor White
        }
    }
    Write-Host "Total found: $totalFound" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green





