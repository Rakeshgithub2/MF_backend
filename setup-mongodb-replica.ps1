# MongoDB Replica Set Setup Script
Write-Host "`n MONGODB REPLICA SET SETUP`n" -ForegroundColor Yellow

# Stop MongoDB if running
$mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "Stopping MongoDB..." -ForegroundColor Cyan
    Stop-Process -Name mongod -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# Create data directory
$mongoDataPath = "C:\data\db"
if (!(Test-Path $mongoDataPath)) {
    New-Item -ItemType Directory -Path $mongoDataPath -Force | Out-Null
    Write-Host " Created data directory" -ForegroundColor Green
}

# Start MongoDB as replica set
Write-Host "Starting MongoDB as replica set..." -ForegroundColor Cyan
Start-Process mongod -ArgumentList "--replSet", "rs0", "--bind_ip", "localhost", "--port", "27017", "--dbpath", $mongoDataPath -WindowStyle Hidden
Start-Sleep -Seconds 5

# Initialize replica set
Write-Host "Initializing replica set..." -ForegroundColor Cyan
mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"

Write-Host "`n MongoDB configured as replica set!`n" -ForegroundColor Green
