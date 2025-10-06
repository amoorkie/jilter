# Simple test for all services
Write-Host "Testing all services..." -ForegroundColor Green

Write-Host "`n1. Testing Next.js Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/health" -Method GET
    Write-Host "Next.js Gateway: WORKING" -ForegroundColor Green
} catch {
    Write-Host "Next.js Gateway: NOT WORKING" -ForegroundColor Red
}

Write-Host "`n2. Testing Java Parser..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    Write-Host "Java Parser: WORKING" -ForegroundColor Green
} catch {
    Write-Host "Java Parser: NOT WORKING" -ForegroundColor Red
}

Write-Host "`n3. Testing parsing..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob"],"query":"designer","pages":1}' -ContentType "application/json"
    Write-Host "Parsing: WORKING" -ForegroundColor Green
} catch {
    Write-Host "Parsing: NOT WORKING" -ForegroundColor Red
}

Write-Host "`nAll tests completed!" -ForegroundColor Green
Write-Host "Open browser: http://localhost:3000/admin" -ForegroundColor Cyan





