# ==================================================
# AI MUTUALS BACKEND - QUICK START SCRIPT (Windows)
# ==================================================
# PowerShell script for Windows users
# ==================================================

# Set strict mode
$ErrorActionPreference = "Stop"

# Colors
function Print-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Header {
    param([string]$Message)
    Write-Host "`n=================================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "=================================================`n" -ForegroundColor Blue
}

# Check prerequisites
function Check-Prerequisites {
    Print-Header "Checking Prerequisites"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Print-Success "Node.js installed: $nodeVersion"
    } catch {
        Print-Error "Node.js is not installed. Please install Node.js 20.x or higher."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Print-Success "npm installed: $npmVersion"
    } catch {
        Print-Error "npm is not installed."
        exit 1
    }
    
    # Check Docker (optional)
    try {
        $dockerVersion = docker --version
        Print-Success "Docker installed: $dockerVersion"
    } catch {
        Print-Warning "Docker not found. Docker is recommended but optional."
    }
    
    # Check MongoDB (optional)
    try {
        $mongoVersion = mongod --version
        Print-Success "MongoDB installed locally"
    } catch {
        Print-Warning "MongoDB not found locally. You can use MongoDB Atlas or Docker."
    }
}

# Install dependencies
function Install-Dependencies {
    Print-Header "Installing Dependencies"
    
    if (Test-Path "package.json") {
        Print-Info "Installing npm packages..."
        npm install
        Print-Success "Dependencies installed successfully"
    } else {
        Print-Error "package.json not found. Are you in the correct directory?"
        exit 1
    }
}

# Setup environment
function Setup-Environment {
    Print-Header "Setting Up Environment"
    
    if (Test-Path ".env") {
        Print-Warning ".env file already exists. Skipping..."
    } else {
        if (Test-Path ".env.comprehensive") {
            Print-Info "Copying comprehensive .env template..."
            Copy-Item ".env.comprehensive" ".env"
            Print-Success ".env file created from comprehensive template"
        } elseif (Test-Path ".env.example") {
            Print-Info "Copying .env.example..."
            Copy-Item ".env.example" ".env"
            Print-Success ".env file created"
        } else {
            Print-Error "No .env template found!"
            exit 1
        }
        
        Print-Warning "⚠️  IMPORTANT: You need to edit .env file with your API keys and database URL"
        Print-Info "Run: notepad .env  or  code .env"
    }
}

# Start with Docker
function Start-WithDocker {
    Print-Header "Starting with Docker Compose"
    
    try {
        docker --version | Out-Null
    } catch {
        Print-Error "Docker is not installed. Please install Docker Desktop for Windows."
        exit 1
    }
    
    Print-Info "Starting services (MongoDB, Redis, Backend, Worker, Scheduler)..."
    docker-compose -f docker-compose.production.yml up -d
    
    Print-Success "Docker services started!"
    Print-Info "Waiting for services to be healthy..."
    Start-Sleep -Seconds 10
    
    # Check health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Print-Success "Backend is healthy!"
        }
    } catch {
        Print-Warning "Backend might still be starting... Check logs with:"
        Print-Info "docker-compose logs -f"
    }
}

# Start without Docker
function Start-WithoutDocker {
    Print-Header "Starting Without Docker"
    
    # Check if .env has MongoDB URL
    $envContent = Get-Content ".env" -Raw
    if (-not ($envContent -match "DATABASE_URL")) {
        Print-Error ".env file is missing DATABASE_URL"
        Print-Info "Please add your MongoDB connection string to .env"
        exit 1
    }
    
    Print-Info "Building TypeScript..."
    npm run build
    
    Print-Info "Starting backend server..."
    Start-Process npm -ArgumentList "start" -NoNewWindow
    
    Print-Success "Backend started!"
    Print-Info "View logs in the console or check logs/ directory"
}

# Run tests
function Run-Tests {
    Print-Header "Running Tests"
    
    Print-Info "Running test suite..."
    npm test
    
    Print-Success "Tests completed!"
}

# Display info
function Display-Info {
    Print-Header "Setup Complete! 🎉"
    
    Write-Host "Your AI Mutuals Backend is ready!`n" -ForegroundColor Green
    
    Write-Host "📍 API Endpoints:" -ForegroundColor Blue
    Write-Host "   Health:     http://localhost:3002/health"
    Write-Host "   Test:       http://localhost:3002/api/test"
    Write-Host "   Funds:      http://localhost:3002/api/funds"
    Write-Host "   ML API:     http://localhost:3002/api/ml/smart-score"
    Write-Host "   AI Chat:    http://localhost:3002/api/ai/chat"
    Write-Host ""
    
    Write-Host "🔧 Useful Commands:" -ForegroundColor Blue
    Write-Host "   View logs:          docker-compose logs -f"
    Write-Host "   Stop services:      docker-compose down"
    Write-Host "   Restart:            docker-compose restart"
    Write-Host "   Run tests:          npm test"
    Write-Host "   Development mode:   npm run dev"
    Write-Host ""
    
    Write-Host "📚 Documentation:" -ForegroundColor Blue
    Write-Host "   Full API docs:      README.comprehensive.md"
    Write-Host "   Setup guide:        SETUP_GUIDE.md"
    Write-Host "   Implementation:     IMPLEMENTATION_SUMMARY.md"
    Write-Host ""
    
    Write-Host "🔗 Admin UIs (if using Docker with --profile tools):" -ForegroundColor Blue
    Write-Host "   Mongo Express:      http://localhost:8081"
    Write-Host "   Redis Commander:    http://localhost:8082"
    Write-Host ""
    
    Print-Warning "⚠️  Don't forget to:"
    Write-Host "   1. Add your API keys to .env file"
    Write-Host "   2. Update DATABASE_URL in .env"
    Write-Host "   3. Test the endpoints"
    Write-Host "   4. Connect your frontend"
}

# Test API
function Test-API {
    Print-Header "Testing API Endpoints"
    
    Print-Info "Testing health endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Print-Success "Health endpoint working!"
        }
    } catch {
        Print-Error "Health endpoint failed. Is the server running?"
    }
    
    Print-Info "Testing test endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002/api/test" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Print-Success "Test endpoint working!"
        }
    } catch {
        Print-Warning "Test endpoint failed."
    }
}

# Main menu
function Show-Menu {
    Print-Header "AI MUTUALS BACKEND - QUICK START"
    
    Write-Host "Please choose an option:"
    Write-Host ""
    Write-Host "1) Full Setup (Check → Install → Configure → Start with Docker)"
    Write-Host "2) Quick Start with Docker (Recommended)"
    Write-Host "3) Quick Start without Docker"
    Write-Host "4) Just Install Dependencies"
    Write-Host "5) Just Setup .env File"
    Write-Host "6) Run Tests"
    Write-Host "7) Test API Endpoints"
    Write-Host "8) Display Info Only"
    Write-Host "9) Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice [1-9]"
    return $choice
}

# Main script
$choice = Show-Menu

switch ($choice) {
    1 {
        Check-Prerequisites
        Install-Dependencies
        Setup-Environment
        Start-WithDocker
        Display-Info
    }
    2 {
        Start-WithDocker
        Test-API
        Display-Info
    }
    3 {
        Start-WithoutDocker
        Test-API
        Display-Info
    }
    4 {
        Install-Dependencies
    }
    5 {
        Setup-Environment
    }
    6 {
        Run-Tests
    }
    7 {
        Test-API
    }
    8 {
        Display-Info
    }
    9 {
        Print-Info "Exiting..."
        exit 0
    }
    default {
        Print-Error "Invalid option. Please choose 1-9."
        exit 1
    }
}

Print-Success "Script completed! 🚀"
