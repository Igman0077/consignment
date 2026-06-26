# Ensures portable Node is available for Consignment (junction, sibling, or download)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Tools = Join-Path $Root "tools"
$NodeDir = Join-Path $Tools "node"
$NodeExe = Join-Path $NodeDir "node.exe"
$SiblingNodeDir = Join-Path (Split-Path $Root -Parent) "north-country-detailer-finder\tools\node"
$Version = "22.16.0"
$ZipName = "node-v$Version-win-x64.zip"
$ZipPath = Join-Path $Tools $ZipName
$Url = "https://nodejs.org/dist/v$Version/$ZipName"

if (Test-Path $NodeExe) {
  Write-Host "Portable Node ready:" -ForegroundColor Green
  & $NodeExe --version
  exit 0
}

New-Item -ItemType Directory -Force -Path $Tools | Out-Null

if (Test-Path (Join-Path $SiblingNodeDir "node.exe")) {
  Write-Host "Linking to Node from north-country-detailer-finder..." -ForegroundColor Cyan
  cmd /c mklink /J "$NodeDir" "$SiblingNodeDir" | Out-Null
  Write-Host "Portable Node ready (shared):" -ForegroundColor Green
  & $NodeExe --version
  exit 0
}

Write-Host "Downloading Node.js $Version (portable zip)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing

Write-Host "Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $ZipPath -DestinationPath $Tools -Force
Rename-Item (Join-Path $Tools "node-v$Version-win-x64") "node" -Force
Remove-Item $ZipPath -Force

Write-Host "Done." -ForegroundColor Green
& $NodeExe --version
