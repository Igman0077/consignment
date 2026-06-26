# Creates the local consignment database and runs Prisma setup.
# Run after PostgreSQL is installed (Docker or winget PostgreSQL 17).
#
# Usage:
#   .\scripts\init-local-postgres.ps1
#   .\scripts\init-local-postgres.ps1 -PostgresPassword "your-postgres-superuser-password"

param(
  [string]$PostgresPassword = "",
  [string]$DbUser = "consignment",
  [string]$DbPassword = "consignment",
  [string]$DbName = "consignment"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$Psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $Psql)) {
  Write-Host "PostgreSQL psql not found at $Psql" -ForegroundColor Red
  Write-Host "Install PostgreSQL 17 or Docker (docker compose up -d), then run this script again."
  exit 1
}

if (-not $PostgresPassword) {
  $secure = Read-Host "Enter the PostgreSQL superuser (postgres) password" -AsSecureString
  $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

$env:PGPASSWORD = $PostgresPassword

Write-Host "Creating database user and database..." -ForegroundColor Cyan

$sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DbUser') THEN
    CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword';
  END IF;
END
`$`$;
"@

& $Psql -U postgres -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$dbExists = & $Psql -U postgres -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
if ($dbExists -ne "1") {
  & $Psql -U postgres -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DbName OWNER $DbUser;"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& $Psql -U postgres -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

$databaseUrl = "postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
Write-Host "Updating .env DATABASE_URL..." -ForegroundColor Cyan

$envPath = Join-Path $Root ".env"
$lines = if (Test-Path $envPath) { Get-Content $envPath } else { @() }
$updated = $false
$newLines = foreach ($line in $lines) {
  if ($line -match '^DATABASE_URL=') {
    $updated = $true
    "DATABASE_URL=`"$databaseUrl`""
  } else {
    $line
  }
}
if (-not $updated) {
  $newLines = @("DATABASE_URL=`"$databaseUrl`"") + $newLines
}
Set-Content -Path $envPath -Value $newLines

Write-Host "Running prisma db push..." -ForegroundColor Cyan
npm run db:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seeding database..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Local PostgreSQL setup complete!" -ForegroundColor Green
Write-Host "DATABASE_URL=$databaseUrl"
Write-Host "Start the shop with: npm run dev"
Write-Host "Owner login: owner@shop.com / owner123"
Write-Host ""
