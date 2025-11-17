# Comprehensive API Testing Script for Mutual Funds Backend
# PowerShell Version

$BaseUrl = "http://localhost:3002"
$TestResults = @{
    Passed = 0
    Failed = 0
    Tests = @()
}

$AuthToken = $null
$RefreshToken = $null
$FundId = $null
$WatchlistItemId = $null

# Colors
$ColorGreen = "Green"
$ColorRed = "Red"
$ColorYellow = "Yellow"
$ColorCyan = "Cyan"

function Write-TestResult {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    $icon = if ($Passed) { "[PASS]" } else { "[FAIL]" }
    $color = if ($Passed) { $ColorGreen } else { $ColorRed }
    
    Write-Host "$icon $Name" -ForegroundColor $color
    if ($Details) {
        Write-Host "  $Details" -ForegroundColor Gray
    }
    
    $TestResults.Tests += @{
        Name = $Name
        Passed = $Passed
        Details = $Details
    }
    
    if ($Passed) {
        $TestResults.Passed++
    } else {
        $TestResults.Failed++
    }
}

function Write-Section {
    param([string]$Title)
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor $ColorCyan
    Write-Host $Title -ForegroundColor $ColorCyan
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor $ColorCyan
    Write-Host ""
}

function Invoke-ApiCall {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null,
        [bool]$UseAuth = $false
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($UseAuth -and $script:AuthToken) {
        $headers["Authorization"] = "Bearer $script:AuthToken"
    }
    
    $params = @{
        Uri = "$BaseUrl$Endpoint"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
    }
    
    if ($Body -and $Method -ne "GET") {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-WebRequest @params
        $data = $null
        
        if ($response.Content) {
            try {
                $data = $response.Content | ConvertFrom-Json
            } catch {
                $data = $response.Content
            }
        }
        
        return @{
            Success = $true
            Status = $response.StatusCode
            Data = $data
        }
    } catch {
        return @{
            Success = $false
            Status = $_.Exception.Response.StatusCode.value__
            Error = $_.Exception.Message
            Data = $null
        }
    }
}

# Test Health Endpoint
function Test-HealthEndpoints {
    Write-Section "Testing Health and Basic Endpoints"
    
    $result = Invoke-ApiCall -Endpoint "/health"
    Write-TestResult -Name "GET /health" `
        -Passed ($result.Success -and $result.Data.status -eq "OK") `
        -Details $(if ($result.Success) { "Status: $($result.Data.status)" } else { "Error: $($result.Status)" })
    
    $result = Invoke-ApiCall -Endpoint "/api/test"
    Write-TestResult -Name "GET /api/test" `
        -Passed ($result.Success -and $result.Data.message -eq "API is working!") `
        -Details $(if ($result.Success) { $result.Data.message } else { "Error: $($result.Status)" })
}

# Test Auth Endpoints
function Test-AuthEndpoints {
    Write-Section "Testing Authentication Endpoints"
    
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $testEmail = "test$timestamp@example.com"
    $testPassword = "Test@123456"
    
    # Test Registration
    $result = Invoke-ApiCall -Endpoint "/api/auth/register" -Method "POST" -Body @{
        email = $testEmail
        password = $testPassword
        name = "Test User"
    }
    
    Write-TestResult -Name "POST /api/auth/register" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "User registered: $($result.Data.user.email)" } else { "Error: $($result.Status) - $($result.Data.error)" })
    
    if ($result.Success) {
        $script:AuthToken = $result.Data.accessToken
        $script:RefreshToken = $result.Data.refreshToken
    }
    
    # Test Login
    $result = Invoke-ApiCall -Endpoint "/api/auth/login" -Method "POST" -Body @{
        email = $testEmail
        password = $testPassword
    }
    
    Write-TestResult -Name "POST /api/auth/login" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Logged in: $($result.Data.user.email)" } else { "Error: $($result.Status)" })
    
    if ($result.Success) {
        $script:AuthToken = $result.Data.accessToken
        $script:RefreshToken = $result.Data.refreshToken
    }
    
    # Test Invalid Login
    $result = Invoke-ApiCall -Endpoint "/api/auth/login" -Method "POST" -Body @{
        email = $testEmail
        password = "wrongpassword"
    }
    
    Write-TestResult -Name "POST /api/auth/login (invalid credentials)" `
        -Passed (-not $result.Success -and $result.Status -eq 401) `
        -Details $(if (-not $result.Success) { "Correctly rejected invalid credentials" } else { "Should have failed" })
    
    # Test Refresh Token
    if ($script:RefreshToken) {
        $result = Invoke-ApiCall -Endpoint "/api/auth/refresh" -Method "POST" -Body @{
            refreshToken = $script:RefreshToken
        }
        
        Write-TestResult -Name "POST /api/auth/refresh" `
            -Passed $result.Success `
            -Details $(if ($result.Success) { "Token refreshed successfully" } else { "Error: $($result.Status)" })
        
        if ($result.Success) {
            $script:AuthToken = $result.Data.accessToken
        }
    }
}

# Test Funds Endpoints
function Test-FundsEndpoints {
    Write-Section "Testing Funds Endpoints"
    
    # Test Get All Funds
    $result = Invoke-ApiCall -Endpoint "/api/funds?page=1&limit=10"
    $fundsCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
    $totalFunds = if ($result.Data.pagination) { $result.Data.pagination.total } else { 0 }
    
    Write-TestResult -Name "GET /api/funds" `
        -Passed ($result.Success -and $result.Data.data -is [Array]) `
        -Details $(if ($result.Success) { "Found $fundsCount funds, Total: $totalFunds" } else { "Error: $($result.Status)" })
    
    if ($result.Success -and $result.Data.data.Count -gt 0) {
        $script:FundId = $result.Data.data[0].id
    }
    
    # Test Search Funds
    $result = Invoke-ApiCall -Endpoint "/api/funds?search=SBI&page=1&limit=5"
    $fundsCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
    
    Write-TestResult -Name "GET /api/funds?search=SBI" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Found $fundsCount funds matching 'SBI'" } else { "Error: $($result.Status)" })
    
    # Test Filter by Category
    $result = Invoke-ApiCall -Endpoint "/api/funds?category=Equity&page=1&limit=5"
    $fundsCount = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
    
    Write-TestResult -Name "GET /api/funds?category=Equity" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Found $fundsCount equity funds" } else { "Error: $($result.Status)" })
    
    # Test Get Fund by ID
    if ($script:FundId) {
        $result = Invoke-ApiCall -Endpoint "/api/funds/$script:FundId"
        Write-TestResult -Name "GET /api/funds/:id" `
            -Passed $result.Success `
            -Details $(if ($result.Success) { "Fund: $($result.Data.fund.name)" } else { "Error: $($result.Status)" })
        
        # Test Get Fund NAVs
        $result = Invoke-ApiCall -Endpoint "/api/funds/$script:FundId/navs?limit=10"
        $navsCount = if ($result.Data.navs) { $result.Data.navs.Count } else { 0 }
        
        Write-TestResult -Name "GET /api/funds/:id/navs" `
            -Passed $result.Success `
            -Details $(if ($result.Success) { "Found $navsCount NAV records" } else { "Error: $($result.Status)" })
    } else {
        Write-TestResult -Name "GET /api/funds/:id" -Passed $false -Details "Skipped: No fund ID available"
        Write-TestResult -Name "GET /api/funds/:id/navs" -Passed $false -Details "Skipped: No fund ID available"
    }
    
    # Test Invalid Fund ID
    $result = Invoke-ApiCall -Endpoint "/api/funds/999999999"
    Write-TestResult -Name "GET /api/funds/:id (invalid ID)" `
        -Passed ($result.Status -eq 404) `
        -Details $(if ($result.Status -eq 404) { "Correctly returns 404" } else { "Unexpected status: $($result.Status)" })
}

# Test Users Endpoints
function Test-UsersEndpoints {
    Write-Section "Testing Users Endpoints (Authenticated)"
    
    if (-not $script:AuthToken) {
        Write-TestResult -Name "GET /api/users/me" -Passed $false -Details "Skipped: No auth token available"
        Write-TestResult -Name "PUT /api/users/me" -Passed $false -Details "Skipped: No auth token available"
        return
    }
    
    # Test Get Current User
    $result = Invoke-ApiCall -Endpoint "/api/users/me" -UseAuth $true
    Write-TestResult -Name "GET /api/users/me" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "User: $($result.Data.user.email)" } else { "Error: $($result.Status)" })
    
    # Test Update Current User
    $result = Invoke-ApiCall -Endpoint "/api/users/me" -Method "PUT" -UseAuth $true -Body @{
        name = "Updated Test User"
        preferences = @{
            theme = "dark"
            notifications = $true
        }
    }
    
    Write-TestResult -Name "PUT /api/users/me" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Updated user: $($result.Data.user.name)" } else { "Error: $($result.Status)" })
    
    # Test Unauthorized Access
    $result = Invoke-ApiCall -Endpoint "/api/users/me" -UseAuth $false
    Write-TestResult -Name "GET /api/users/me (without auth)" `
        -Passed ($result.Status -eq 401) `
        -Details $(if ($result.Status -eq 401) { "Correctly requires authentication" } else { "Unexpected status: $($result.Status)" })
}

# Test Watchlist Endpoints
function Test-WatchlistEndpoints {
    Write-Section "Testing Watchlist Endpoints (Authenticated)"
    
    if (-not $script:AuthToken) {
        Write-TestResult -Name "POST /api/watchlist" -Passed $false -Details "Skipped: No auth token available"
        Write-TestResult -Name "GET /api/watchlist" -Passed $false -Details "Skipped: No auth token available"
        Write-TestResult -Name "DELETE /api/watchlist/:id" -Passed $false -Details "Skipped: No auth token available"
        return
    }
    
    if (-not $script:FundId) {
        Write-TestResult -Name "POST /api/watchlist" -Passed $false -Details "Skipped: No fund ID available"
        Write-TestResult -Name "GET /api/watchlist" -Passed $false -Details "Skipped: No fund ID available"
        Write-TestResult -Name "DELETE /api/watchlist/:id" -Passed $false -Details "Skipped: No fund ID available"
        return
    }
    
    # Test Add to Watchlist
    $result = Invoke-ApiCall -Endpoint "/api/watchlist" -Method "POST" -UseAuth $true -Body @{
        fundId = $script:FundId
    }
    
    Write-TestResult -Name "POST /api/watchlist" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Fund added to watchlist" } else { "Error: $($result.Status)" })
    
    if ($result.Success -and $result.Data.watchlistItem) {
        $script:WatchlistItemId = $result.Data.watchlistItem.id
    }
    
    # Test Get Watchlist
    $result = Invoke-ApiCall -Endpoint "/api/watchlist" -UseAuth $true
    $watchlistCount = if ($result.Data.watchlist) { $result.Data.watchlist.Count } else { 0 }
    
    Write-TestResult -Name "GET /api/watchlist" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Watchlist has $watchlistCount items" } else { "Error: $($result.Status)" })
    
    # Test Remove from Watchlist
    if ($script:WatchlistItemId) {
        $result = Invoke-ApiCall -Endpoint "/api/watchlist/$script:WatchlistItemId" -Method "DELETE" -UseAuth $true
        Write-TestResult -Name "DELETE /api/watchlist/:id" `
            -Passed $result.Success `
            -Details $(if ($result.Success) { "Fund removed from watchlist" } else { "Error: $($result.Status)" })
    } else {
        Write-TestResult -Name "DELETE /api/watchlist/:id" -Passed $false -Details "Skipped: No watchlist item ID"
    }
}

# Test Alerts Endpoints
function Test-AlertsEndpoints {
    Write-Section "Testing Alerts Endpoints (Authenticated)"
    
    if (-not $script:AuthToken) {
        Write-TestResult -Name "POST /api/alerts" -Passed $false -Details "Skipped: No auth token available"
        Write-TestResult -Name "GET /api/alerts" -Passed $false -Details "Skipped: No auth token available"
        return
    }
    
    if (-not $script:FundId) {
        Write-TestResult -Name "POST /api/alerts" -Passed $false -Details "Skipped: No fund ID available"
        Write-TestResult -Name "GET /api/alerts" -Passed $false -Details "Skipped: No fund ID available"
        return
    }
    
    # Test Create Alert
    $result = Invoke-ApiCall -Endpoint "/api/alerts" -Method "POST" -UseAuth $true -Body @{
        fundId = $script:FundId
        type = "NAV_THRESHOLD"
        threshold = 100
        condition = "ABOVE"
    }
    
    Write-TestResult -Name "POST /api/alerts" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "Alert created successfully" } else { "Error: $($result.Status)" })
    
    # Test Get Alerts
    $result = Invoke-ApiCall -Endpoint "/api/alerts" -UseAuth $true
    $alertsCount = if ($result.Data.alerts) { $result.Data.alerts.Count } else { 0 }
    
    Write-TestResult -Name "GET /api/alerts" `
        -Passed $result.Success `
        -Details $(if ($result.Success) { "User has $alertsCount alerts" } else { "Error: $($result.Status)" })
}

# Test Error Handling
function Test-ErrorHandling {
    Write-Section "Testing Error Handling and Edge Cases"
    
    # Test 404
    $result = Invoke-ApiCall -Endpoint "/api/nonexistent"
    Write-TestResult -Name "GET /api/nonexistent - 404 test" `
        -Passed ($result.Status -eq 404) `
        -Details $(if ($result.Status -eq 404) { "Correctly returns 404" } else { "Unexpected status: $($result.Status)" })
    
    # Test Missing Fields
    $result = Invoke-ApiCall -Endpoint "/api/auth/register" -Method "POST" -Body @{
        email = "test@example.com"
    }
    
    Write-TestResult -Name "POST /api/auth/register (missing fields)" `
        -Passed (-not $result.Success) `
        -Details $(if (-not $result.Success) { "Correctly rejects incomplete data" } else { "Should have failed validation" })
}

# Print Summary
function Write-Summary {
    Write-Section "Test Summary"
    
    $total = $TestResults.Passed + $TestResults.Failed
    $passRate = if ($total -gt 0) { [math]::Round(($TestResults.Passed / $total) * 100, 2) } else { 0 }
    
    Write-Host "Total Tests: $total"
    Write-Host "Passed: $($TestResults.Passed)" -ForegroundColor $ColorGreen
    Write-Host "Failed: $($TestResults.Failed)" -ForegroundColor $ColorRed
    Write-Host "Pass Rate: $passRate%"
    Write-Host ""
    
    if ($TestResults.Failed -gt 0) {
        Write-Host "Failed Tests:" -ForegroundColor $ColorYellow
        foreach ($test in $TestResults.Tests) {
            if (-not $test.Passed) {
                Write-Host "  [FAIL] $($test.Name)" -ForegroundColor $ColorRed
                if ($test.Details) {
                    Write-Host "    $($test.Details)" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor $ColorCyan
    Write-Host ""
}

# Main Execution
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor $ColorCyan
Write-Host "║   Mutual Funds API - Comprehensive Testing   ║" -ForegroundColor $ColorCyan
Write-Host "║              Server: $BaseUrl        ║" -ForegroundColor $ColorCyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor $ColorCyan
Write-Host ""

try {
    Test-HealthEndpoints
    Test-AuthEndpoints
    Test-FundsEndpoints
    Test-UsersEndpoints
    Test-WatchlistEndpoints
    Test-AlertsEndpoints
    Test-ErrorHandling
    
    Write-Summary
    
    # Exit with appropriate code
    if ($TestResults.Failed -gt 0) {
        exit 1
    } else {
        exit 0
    }
} catch {
    Write-Host "Fatal Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace -ForegroundColor Red
    exit 1
}
