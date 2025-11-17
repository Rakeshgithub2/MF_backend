# Simple API Test Script
$baseUrl = "http://localhost:3002"
$passed = 0
$failed = 0

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Mutual Funds API Test Suite" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Testing GET /health..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    if ($response.status -eq "OK") {
        Write-Host " PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 2: API Test Endpoint
Write-Host "Testing GET /api/test..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/test" -Method Get
    if ($response.message -eq "API is working!") {
        Write-Host " PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 3: Register User
Write-Host "Testing POST /api/auth/register..." -NoNewline
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$testEmail = "test$timestamp@example.com"
$registerBody = @{
    email = $testEmail
    password = "Test@123456"
    name = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    if ($response.accessToken) {
        Write-Host " PASSED" -ForegroundColor Green
        $authToken = $response.accessToken
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 4: Login
Write-Host "Testing POST /api/auth/login..." -NoNewline
$loginBody = @{
    email = $testEmail
    password = "Test@123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    if ($response.accessToken) {
        Write-Host " PASSED" -ForegroundColor Green
        $authToken = $response.accessToken
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 5: Get Funds
Write-Host "Testing GET /api/funds..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/funds?page=1&limit=10" -Method Get
    if ($response.data -and $response.data.Count -ge 0) {
        Write-Host " PASSED (Found $($response.data.Count) funds)" -ForegroundColor Green
        $fundId = if ($response.data.Count -gt 0) { $response.data[0].id } else { $null }
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 6: Search Funds
Write-Host "Testing GET /api/funds (search)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/funds?search=SBI&page=1&limit=5" -Method Get
    if ($response.data) {
        Write-Host " PASSED (Found $($response.data.Count) funds)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 7: Get Fund by ID
if ($fundId) {
    Write-Host "Testing GET /api/funds/:id..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/funds/$fundId" -Method Get
        if ($response.fund) {
            Write-Host " PASSED" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    # Test 8: Get Fund NAVs
    Write-Host "Testing GET /api/funds/:id/navs..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/funds/$fundId/navs?limit=10" -Method Get
        if ($response.navs) {
            Write-Host " PASSED (Found $($response.navs.Count) NAVs)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

# Test 9: Get Current User (Authenticated)
if ($authToken) {
    Write-Host "Testing GET /api/users/me (authenticated)..." -NoNewline
    $headers = @{
        Authorization = "Bearer $authToken"
    }
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users/me" -Method Get -Headers $headers
        if ($response.user) {
            Write-Host " PASSED" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    # Test 10: Update User
    Write-Host "Testing PUT /api/users/me..." -NoNewline
    $updateBody = @{
        name = "Updated Test User"
        preferences = @{
            theme = "dark"
        }
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users/me" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
        if ($response.user) {
            Write-Host " PASSED" -ForegroundColor Green
            $passed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    # Test 11: Add to Watchlist
    if ($fundId) {
        Write-Host "Testing POST /api/watchlist..." -NoNewline
        $watchlistBody = @{
            fundId = $fundId
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/watchlist" -Method Post -Body $watchlistBody -ContentType "application/json" -Headers $headers
            if ($response.watchlistItem) {
                Write-Host " PASSED" -ForegroundColor Green
                $watchlistId = $response.watchlistItem.id
                $passed++
            } else {
                Write-Host " FAILED" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
        
        # Test 12: Get Watchlist
        Write-Host "Testing GET /api/watchlist..." -NoNewline
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/watchlist" -Method Get -Headers $headers
            if ($response.watchlist) {
                Write-Host " PASSED (Found $($response.watchlist.Count) items)" -ForegroundColor Green
                $passed++
            } else {
                Write-Host " FAILED" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
        
        # Test 13: Remove from Watchlist
        if ($watchlistId) {
            Write-Host "Testing DELETE /api/watchlist/:id..." -NoNewline
            try {
                $response = Invoke-RestMethod -Uri "$baseUrl/api/watchlist/$watchlistId" -Method Delete -Headers $headers
                Write-Host " PASSED" -ForegroundColor Green
                $passed++
            } catch {
                Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
                $failed++
            }
        }
        
        # Test 14: Create Alert
        Write-Host "Testing POST /api/alerts..." -NoNewline
        $alertBody = @{
            fundId = $fundId
            type = "NAV_THRESHOLD"
            threshold = 100
            condition = "ABOVE"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/alerts" -Method Post -Body $alertBody -ContentType "application/json" -Headers $headers
            if ($response.alert) {
                Write-Host " PASSED" -ForegroundColor Green
                $passed++
            } else {
                Write-Host " FAILED" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
        
        # Test 15: Get Alerts
        Write-Host "Testing GET /api/alerts..." -NoNewline
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/api/alerts" -Method Get -Headers $headers
            if ($response.alerts) {
                Write-Host " PASSED (Found $($response.alerts.Count) alerts)" -ForegroundColor Green
                $passed++
            } else {
                Write-Host " FAILED" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " FAILED - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
    }
}

# Test 16: 404 Error
Write-Host "Testing GET /api/nonexistent (404)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/nonexistent" -Method Get
    Write-Host " FAILED (Should return 404)" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode -eq 404 -or $_.Exception.Message -like "*404*") {
        Write-Host " PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " FAILED - Wrong error" -ForegroundColor Red
        $failed++
    }
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
$total = $passed + $failed
$passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ""
