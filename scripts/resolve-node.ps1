# Finds Node.js for this project: local portable -> sibling project -> system PATH
param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$LocalNode = Join-Path $ProjectRoot "tools\node\node.exe"
$SiblingNode = Join-Path (Split-Path $ProjectRoot -Parent) "north-country-detailer-finder\tools\node\node.exe"

function Write-NodeMsg($msg) {
  if (-not $Quiet) { Write-Host $msg }
}

if (Test-Path $LocalNode) {
  Write-NodeMsg "Using portable Node: $LocalNode"
  return $LocalNode
}

if (Test-Path $SiblingNode) {
  Write-NodeMsg "Using Node from north-country-detailer-finder: $SiblingNode"
  return $SiblingNode
}

$sysNode = Get-Command node -ErrorAction SilentlyContinue
if ($sysNode) {
  Write-NodeMsg "Using system Node: $($sysNode.Source)"
  return $sysNode.Source
}

return $null
