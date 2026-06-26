# One-time (or repeat) setup: Node, npm install, database, .env
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host ""
Write-Host "  Consignment Shop - Setup" -ForegroundColor Cyan
Write-Host ""

# 1. Node
& (Join-Path $Root "setup-portable-node.ps1")
$NodeExe = & (Join-Path $Root "scripts\resolve-node.ps1") -Quiet
if (-not $NodeExe) {
  Write-Host "Could not find Node.js. Run setup-portable-node.ps1 manually." -ForegroundColor Red
  exit 1
}

$NodeDir = Split-Path $NodeExe -Parent
$NpmCmd = Join-Path $NodeDir "npm.cmd"
$env:PATH = "$NodeDir" + ";" + $env:PATH

$nodeVer = & $NodeExe --version
$npmVer = & $NpmCmd --version
Write-Host ""
Write-Host "Node: $nodeVer  npm: $npmVer" -ForegroundColor Green

# 2. .env
$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"
if (-not (Test-Path $EnvFile)) {
  Copy-Item $EnvExample $EnvFile
  Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

$envLines = Get-Content $EnvFile
$updated = $false
$newLines = foreach ($line in $envLines) {
  if ($line -match '^NEXTAUTH_SECRET="change-me') {
    $secret = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 32 | ForEach-Object { [char]$_ }))
    $updated = $true
    'NEXTAUTH_SECRET="' + $secret + '"'
  } else {
    $line
  }
}
if ($updated) {
  Set-Content -Path $EnvFile -Value $newLines
  Write-Host "Generated a random NEXTAUTH_SECRET in .env" -ForegroundColor Yellow
}

# 3. Dependencies
Write-Host ""
Write-Host "Installing npm packages (first time may take a few minutes)..." -ForegroundColor Cyan
& $NpmCmd install --prefix $Root
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4. Database (PostgreSQL)
Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Cyan
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (Test-Path $psql) {
  Write-Host "PostgreSQL found — run init-local-db.bat if this is your first setup." -ForegroundColor DarkGray
  & (Join-Path $Root "scripts\init-local-postgres.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "Start PostgreSQL first: docker compose up -d  OR  install PostgreSQL 17" -ForegroundColor Yellow
  & $NpmCmd run db:push --prefix $Root
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $NpmCmd run db:seed --prefix $Root
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Double-click dev.bat to start the shop." -ForegroundColor White
Write-Host "  Owner login: owner@shop.com / owner123" -ForegroundColor White
Write-Host ""
