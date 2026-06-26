# Start the Consignment Shop dev server (clean restart if port 3000 is in use)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$NodeExe = & (Join-Path $Root "scripts\resolve-node.ps1")
if (-not $NodeExe) {
  Write-Host ""
  Write-Host "Node.js not found. Running setup first..." -ForegroundColor Yellow
  & (Join-Path $Root "scripts\setup.ps1")
  $NodeExe = & (Join-Path $Root "scripts\resolve-node.ps1") -Quiet
  if (-not $NodeExe) { exit 1 }
}

$NodeDir = Split-Path $NodeExe -Parent
$NpmCmd = Join-Path $NodeDir "npm.cmd"
$NpxCmd = Join-Path $NodeDir "npx.cmd"
$env:PATH = "$NodeDir" + ";" + $env:PATH

if (-not (Test-Path (Join-Path $Root "node_modules\next"))) {
  Write-Host "Dependencies missing - running setup..." -ForegroundColor Yellow
  & (Join-Path $Root "scripts\setup.ps1")
}

if (-not (Test-Path (Join-Path $Root ".env"))) {
  Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env")
}

# Stop any existing dev server on port 3000 (avoids stale Prisma + broken .next cache)
$existing = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Stopping existing server on port 3000..." -ForegroundColor Yellow
  $existing | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

# Fresh build cache — required after interrupted dev sessions
$NextDir = Join-Path $Root ".next"
if (Test-Path $NextDir) {
  Write-Host "Clearing .next cache..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force $NextDir
}

Write-Host "Syncing database and Prisma client..." -ForegroundColor Cyan
Push-Location $Root
& $NpxCmd prisma db push
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
& $NpxCmd prisma generate
$genExit = $LASTEXITCODE
Pop-Location
if ($genExit -ne 0) { exit $genExit }

Write-Host ""
Write-Host "  Consignment Shop" -ForegroundColor Cyan
Write-Host "  Site:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Admin: http://localhost:3000/admin  (owner@shop.com / owner123)" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

& $NpmCmd run dev
