# Test Fixed Java Parser Service with UTF-8
Write-Host "Testing Fixed Java Parser Service with UTF-8..." -ForegroundColor Green

# Test health endpoint
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    Write-Host "Health check: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "Service: $($healthResponse.service)" -ForegroundColor Green
    Write-Host "Sources: $($healthResponse.sources -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Geekjob parsing
Write-Host "`n2. Testing Geekjob.ru parsing..." -ForegroundColor Yellow
try {
    $parseRequest = @{
        query = "дизайнер"
        pages = 1
    } | ConvertTo-Json

    $parseResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/geekjob" -Method POST -Body $parseRequest -ContentType "application/json; charset=UTF-8"
    
    Write-Host "Geekjob parsing results:" -ForegroundColor Green
    Write-Host "  Message: $($parseResponse.message)"
    Write-Host "  Source: $($parseResponse.source)"
    Write-Host "  Total found: $($parseResponse.total_found)"
    Write-Host "  Saved: $($parseResponse.saved)"
    Write-Host "  Query: $($parseResponse.query)"
    Write-Host "  Pages: $($parseResponse.pages)"
    
    if ($parseResponse.vacancies) {
        Write-Host "`n  First 3 Geekjob vacancies:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(3, $parseResponse.vacancies.Count); $i++) {
            $vacancy = $parseResponse.vacancies[$i]
            Write-Host "    $($i+1). $($vacancy.title)" -ForegroundColor White
            Write-Host "       Company: $($vacancy.company)" -ForegroundColor Gray
            Write-Host "       Location: $($vacancy.location)" -ForegroundColor Gray
            Write-Host "       Salary: $($vacancy.salary)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "Geekjob parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test HH.ru parsing
Write-Host "`n3. Testing HH.ru parsing..." -ForegroundColor Yellow
try {
    $parseRequest = @{
        query = "дизайнер"
        pages = 1
    } | ConvertTo-Json

    $parseResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/hh" -Method POST -Body $parseRequest -ContentType "application/json; charset=UTF-8"
    
    Write-Host "HH.ru parsing results:" -ForegroundColor Green
    Write-Host "  Message: $($parseResponse.message)"
    Write-Host "  Source: $($parseResponse.source)"
    Write-Host "  Total found: $($parseResponse.total_found)"
    
    if ($parseResponse.vacancies) {
        Write-Host "`n  First 2 HH.ru vacancies:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(2, $parseResponse.vacancies.Count); $i++) {
            $vacancy = $parseResponse.vacancies[$i]
            Write-Host "    $($i+1). $($vacancy.title)" -ForegroundColor White
            Write-Host "       Company: $($vacancy.company)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "HH.ru parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Habr Career parsing
Write-Host "`n4. Testing Habr Career parsing..." -ForegroundColor Yellow
try {
    $parseRequest = @{
        query = "дизайнер"
        pages = 1
    } | ConvertTo-Json

    $parseResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/habr" -Method POST -Body $parseRequest -ContentType "application/json; charset=UTF-8"
    
    Write-Host "Habr Career parsing results:" -ForegroundColor Green
    Write-Host "  Message: $($parseResponse.message)"
    Write-Host "  Source: $($parseResponse.source)"
    Write-Host "  Total found: $($parseResponse.total_found)"
    
    if ($parseResponse.vacancies) {
        Write-Host "`n  First 2 Habr Career vacancies:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(2, $parseResponse.vacancies.Count); $i++) {
            $vacancy = $parseResponse.vacancies[$i]
            Write-Host "    $($i+1). $($vacancy.title)" -ForegroundColor White
            Write-Host "       Company: $($vacancy.company)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "Habr Career parsing failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green







