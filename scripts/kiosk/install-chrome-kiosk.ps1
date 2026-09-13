$ErrorActionPreference = 'Stop'
$setup = Join-Path $PSScriptRoot 'setup-kiosk.ps1'
if (-not (Test-Path -LiteralPath $setup)) { throw 'setup-kiosk.ps1 is missing' }
# Windows prompts the user for elevation; the elevated window receives the password directly.
Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') `
  -Verb RunAs -WindowStyle Normal `
  -ArgumentList @('-NoProfile', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $setup))
