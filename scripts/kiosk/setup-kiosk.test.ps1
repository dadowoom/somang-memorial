# Run with Windows PowerShell 5.1. No accounts, policies, tasks or browsers are changed.
$ErrorActionPreference = 'Stop'
$setup = Join-Path $PSScriptRoot 'setup-kiosk.ps1'
function Assert($condition, [string]$message) {
  if (-not $condition) { throw $message }
}
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($setup, [ref]$tokens, [ref]$errors)
Assert ($errors.Count -eq 0) 'Setup syntax error'
$assignment = $ast.FindAll({ param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
  $node.Left.Extent.Text -eq '$launcherBody'
}, $true)[0]
$literal = $assignment.Find({ param($node)
  $node -is [System.Management.Automation.Language.StringConstantExpressionAst]
}, $true)
$launcher = $literal.Value
Assert ($launcher.Length -gt 500) 'Launcher was not extracted'
[void][System.Management.Automation.Language.Parser]::ParseInput($launcher, [ref]$tokens, [ref]$errors)
Assert ($errors.Count -eq 0) 'Launcher syntax error'

# All filesystem checks are mocked; this also runs on PCs without Chrome installed.
& {
  $capture = @{}
  function Test-Path { param($LiteralPath, $Path) return $true }
  function Start-Process { param($FilePath, $ArgumentList) $capture.Path = $FilePath; $capture.Args = $ArgumentList }
  function New-Item { throw 'Preview must not create Windows settings' }
  function Set-ItemProperty { throw 'Preview must not change registry' }
  function New-LocalUser { throw 'Preview must not create accounts' }
  function Register-ScheduledTask { throw 'Preview must not register tasks' }
  function powercfg { throw 'Preview must not change power settings' }
  function Restart-Computer { throw 'Preview must not reboot' }
  & $setup -Preview
  Assert ($capture.Path -like '*\Google\Chrome\Application\chrome.exe') 'Preview did not select Chrome'
  Assert ($capture.Args -contains '--kiosk') 'Preview is not fullscreen kiosk'
  Assert ($capture.Args -contains '--incognito') 'Preview must use incognito'
  Assert (($capture.Args | Where-Object { $_ -like '--user-data-dir="*ChromePreview"' }).Count -eq 1) 'Preview profile must be isolated and quoted'
  foreach ($url in @('http://example.com/kiosk', 'https://user:pass@example.com/kiosk', 'https://example.com/" --other-flag')) {
    $rejected = $false
    try { & $setup -Preview -KioskUrl $url } catch { $rejected = $true }
    Assert $rejected 'Unsafe URL was accepted'
  }
}

# Run one launcher iteration with fake process/log/delay functions.
foreach ($failLaunch in @($false, $true)) {
  & {
    $capture = @{ Args = @(); Logs = @(); Waited = $false; Delay = 0 }
    function Get-Content { '{"url":"https://somangmemorial.co.kr/kiosk"}' }
    function Test-Path { param([Parameter(Position=0)]$Path) return $Path -like '*chrome.exe' }
    function Add-Content { param($Path, $Value) $capture.Logs += $Value }
    function Start-Process {
      param($FilePath, $ArgumentList, [switch]$PassThru, $ErrorAction)
      Assert ($FilePath -like '*chrome.exe') 'Launcher did not select Chrome'
      $capture.Args = $ArgumentList
      if ($failLaunch) { throw 'Simulated launch failure' }
      $fake = [pscustomobject]@{ ExitCode = 0 }
      $fake | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value { $capture.Waited = $true }
      return $fake
    }
    function Start-Sleep { param($Seconds) $capture.Delay = $Seconds; throw 'TEST_END' }
    try { & ([scriptblock]::Create($launcher)) } catch {
      if ($_.Exception.Message -ne 'TEST_END') { throw }
    }
    Assert ($capture.Delay -eq 3) 'Launcher must retry after three seconds'
    Assert ($capture.Args -contains '--kiosk') 'Missing kiosk argument'
    Assert ($capture.Args -contains '--disable-pinch') 'Missing pinch zoom block'
    Assert (($capture.Args | Where-Object { $_ -like '--disable-features=*OverscrollHistoryNavigation*' }).Count -eq 1) 'Missing swipe navigation block'
    Assert ($capture.Args -contains '--user-data-dir="C:\Kiosk\ChromeProfile"') 'Missing isolated Chrome profile'
    Assert (($capture.Args -match 'edge-kiosk|kiosk-idle-timeout').Count -eq 0) 'Edge-only arguments remain'
    if ($failLaunch) {
      Assert (($capture.Logs -match 'launch failed').Count -eq 1) 'Launch failure was not logged'
    } else {
      Assert $capture.Waited 'Launcher must wait for Chrome to exit'
      Assert (($capture.Logs -match 'chrome exited').Count -eq 1) 'Exit was not logged'
    }
  }
}
Write-Host 'PASS: syntax, preview isolation, URL validation, Chrome exit and failure retries'
