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

# The launcher holds a named lock so that only one copy runs (2026-10-07 on site: two launchers
# made the first screen reopen every 3-5 seconds). Every test run gets its own lock name, so a
# real kiosk launcher on the same PC is never touched.
$realLockName = "'Local\SomangKioskLauncher'"
Assert ($launcher.Contains($realLockName)) 'Launcher must take the single-instance lock'
function New-TestLauncherText {
  $name = "'Local\SomangKioskLauncherTest-{0}'" -f [guid]::NewGuid().ToString('N')
  return $launcher.Replace($realLockName, $name)
}

# Fake process, clock, log and delay functions for one launcher run.
#   RunPlan   seconds each Chrome stays open before it exits
#   RunningAt which checks for an already running kiosk Chrome find one (1 = first check)
#   StopAfter number of waits before the test stops the endless loop
$launcherMocks = {
  function Get-Content { '{"url":"https://somangmemorial.co.kr/kiosk"}' }
  function Test-Path { param([Parameter(Position=0)]$Path) return $Path -like '*chrome.exe' }
  function Add-Content { param($Path, $Value) $capture.Logs += $Value }
  function Get-Date { param([string]$Format) if ($Format) { return '2026-10-07 09:00:00' } return $capture.Now }
  function Get-CimInstance {
    param($ClassName, $Filter, $ErrorAction)
    $capture.Checks++
    if ($capture.RunningAt -contains $capture.Checks) { $capture.Processes }
  }
  function Start-Process {
    param($FilePath, $ArgumentList, [switch]$PassThru, $ErrorAction)
    Assert ($FilePath -like '*chrome.exe') 'Launcher did not select Chrome'
    $capture.Launches++
    $capture.Args = $ArgumentList
    if ($capture.FailLaunch) { throw 'Simulated launch failure' }
    $fake = [pscustomobject]@{ ExitCode = 0 }
    $fake | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
      $seconds = $capture.RunPlan[[Math]::Min($capture.Waited, $capture.RunPlan.Count - 1)]
      $capture.Waited++
      $capture.Now = $capture.Now.AddSeconds($seconds)
    }
    return $fake
  }
  function Start-Sleep {
    param($Seconds)
    $capture.Delays += $Seconds
    if ($capture.Delays.Count -ge $capture.StopAfter) { throw 'TEST_END' }
  }
}
function New-Capture([hashtable]$settings) {
  $capture = @{
    Logs = @(); Delays = @(); Args = @(); Launches = 0; Waited = 0; Checks = 0
    Now = [datetime]'2026-10-07T09:00:00'; RunPlan = @(3600); RunningAt = @(); Processes = @()
    FailLaunch = $false; StopAfter = 1
  }
  foreach ($key in $settings.Keys) { $capture[$key] = $settings[$key] }
  return $capture
}
function Invoke-TestLauncher([hashtable]$capture) {
  & {
    . $launcherMocks
    try { & ([scriptblock]::Create((New-TestLauncherText))) } catch {
      if ($_.Exception.Message -ne 'TEST_END') { throw }
    }
  }
  # The single-instance lock must really be taken, not skipped because it could not be created.
  Assert (($capture.Logs -match 'lock unavailable').Count -eq 0) ('Launcher could not take its lock: ' + ($capture.Logs -join ' | '))
}

# Chrome that ran normally comes back after three seconds, with the kiosk arguments.
$capture = New-Capture @{ RunPlan = @(3600) }
Invoke-TestLauncher $capture
Assert ($capture.Launches -eq 1) 'Launcher must open Chrome once'
Assert ($capture.Waited -eq 1) 'Launcher must wait for Chrome to exit'
Assert (($capture.Delays -join ',') -eq '3') 'Chrome that ran normally must come back after three seconds'
Assert (($capture.Logs -match 'chrome exited code=0 after 3600s; relaunch in 3s').Count -eq 1) 'Exit was not logged'
Assert ($capture.Args -contains '--kiosk') 'Missing kiosk argument'
Assert ($capture.Args -contains '--disable-pinch') 'Missing pinch zoom block'
Assert (($capture.Args | Where-Object { $_ -like '--disable-features=*OverscrollHistoryNavigation*' }).Count -eq 1) 'Missing swipe navigation block'
Assert ($capture.Args -contains '--user-data-dir="C:\Kiosk\ChromeProfile"') 'Missing isolated Chrome profile'
Assert (($capture.Args -match 'edge-kiosk|kiosk-idle-timeout').Count -eq 0) 'Edge-only arguments remain'

# A failed launch is logged and the next try waits longer.
$capture = New-Capture @{ FailLaunch = $true }
Invoke-TestLauncher $capture
Assert (($capture.Logs -match 'launch failed').Count -eq 1) 'Launch failure was not logged'
Assert (($capture.Delays -join ',') -eq '10') 'Launch failure must wait longer before the next try'

# Chrome that keeps closing right away is not reopened every three seconds.
$capture = New-Capture @{ RunPlan = @(1); StopAfter = 4 }
Invoke-TestLauncher $capture
Assert (($capture.Delays -join ',') -eq '10,30,60,60') ('Quick exits must back off: ' + ($capture.Delays -join ','))
Assert (($capture.Logs -match 'quick exit').Count -eq 4) 'Quick exits were not logged'

# One normal run resets the waiting time.
$capture = New-Capture @{ RunPlan = @(1, 3600, 1); StopAfter = 3 }
Invoke-TestLauncher $capture
Assert (($capture.Delays -join ',') -eq '10,3,10') ('A normal run must reset the back-off: ' + ($capture.Delays -join ','))

# A kiosk Chrome that is already open (Windows reopened it, or Chrome restarted itself after an
# update) is watched, not opened a second time. Helper processes and other profiles are ignored.
$kioskBrowser = [pscustomobject]@{ ProcessId = 4242; CommandLine = '"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk "https://somangmemorial.co.kr/kiosk" --user-data-dir="C:\Kiosk\ChromeProfile"' }
$kioskHelper = [pscustomobject]@{ ProcessId = 4243; CommandLine = '"C:\Program Files\Google\Chrome\Application\chrome.exe" --type=renderer --user-data-dir="C:\Kiosk\ChromeProfile"' }
$otherProfile = [pscustomobject]@{ ProcessId = 5000; CommandLine = '"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\staff\Chrome"' }
$capture = New-Capture @{ RunningAt = @(1, 2); Processes = @($kioskBrowser, $kioskHelper, $otherProfile); StopAfter = 3 }
Invoke-TestLauncher $capture
Assert (($capture.Logs -match 'already running pid=4242;').Count -eq 1) 'Running kiosk Chrome was not recognised'
Assert (($capture.Logs -match '4243|5000').Count -eq 0) 'Helper process or other profile was mistaken for the kiosk Chrome'
Assert (($capture.Delays -join ',') -eq '5,5,3') ('Launcher must watch the running Chrome: ' + ($capture.Delays -join ','))
Assert ($capture.Launches -eq 1) 'Launcher must open Chrome only after the running one closed'

# Chrome that closes at once but keeps running under a new process (update restart) is watched
# from the next check on, instead of being opened again.
$capture = New-Capture @{ RunPlan = @(1, 3600); RunningAt = @(2, 3); Processes = @($kioskBrowser); StopAfter = 4 }
Invoke-TestLauncher $capture
Assert (($capture.Delays -join ',') -eq '10,5,5,3') ('Restarted Chrome must be watched: ' + ($capture.Delays -join ','))
Assert ($capture.Launches -eq 2) 'Launcher opened Chrome while another kiosk Chrome was running'

# Two launchers at the same time: the second one must leave at once without opening Chrome.
# The first one runs on another thread (its own runspace) so the lock is really held. Its fake
# Chrome is a compiled class whose WaitForExit blocks until the test releases it, so it stays
# open no matter which thread or runspace calls it.
if (-not ('KioskTestChrome' -as [type])) {
  Add-Type -TypeDefinition @'
public class KioskTestChrome {
  private readonly System.Threading.WaitHandle closed;
  public KioskTestChrome(System.Threading.WaitHandle closed) { this.closed = closed; }
  public int ExitCode { get { return 0; } }
  public void WaitForExit() { closed.WaitOne(30000); }
}
'@
}
$pairText = New-TestLauncherText
$shared = [hashtable]::Synchronized(@{
  Launches = 0
  Logs = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))
  Release = New-Object System.Threading.ManualResetEvent($false)
})
$firstRunner = @'
param($launcherText, $shared)
function Get-Content { '{"url":"https://somangmemorial.co.kr/kiosk"}' }
function Test-Path { param([Parameter(Position=0)]$Path) return $Path -like '*chrome.exe' }
function Add-Content { param($Path, $Value) [void]$shared.Logs.Add("first: $Value") }
function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) }
function Start-Process {
  param($FilePath, $ArgumentList, [switch]$PassThru, $ErrorAction)
  $shared.Launches++
  return New-Object KioskTestChrome($shared.Release)
}
function Start-Sleep { param($Seconds) throw 'TEST_END' }
try { & ([scriptblock]::Create($launcherText)) } catch {
  if ($_.Exception.Message -ne 'TEST_END') { throw }
}
'@
$first = [PowerShell]::Create()
[void]$first.AddScript($firstRunner).AddArgument($pairText).AddArgument($shared)
function Get-FirstLauncherDetail {
  ' | first launcher log: ' + (@($shared.Logs) -join ' / ') + ' | first launcher errors: ' + (($first.Streams.Error | Out-String).Trim())
}
$firstRun = $first.BeginInvoke()
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while ($shared.Launches -lt 1 -and -not $firstRun.IsCompleted -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 100
  }
  Assert ($shared.Launches -eq 1) ('First launcher did not open Chrome' + (Get-FirstLauncherDetail))
  Assert (-not $firstRun.IsCompleted) ('First launcher stopped while its Chrome was still open' + (Get-FirstLauncherDetail))
  Assert ((@($shared.Logs) -match 'lock unavailable').Count -eq 0) ('First launcher could not take its lock' + (Get-FirstLauncherDetail))
  & {
    $second = @{ Logs = @(); Launches = 0; Slept = $false }
    function Get-Content { '{"url":"https://somangmemorial.co.kr/kiosk"}' }
    function Test-Path { param([Parameter(Position=0)]$Path) return $Path -like '*chrome.exe' }
    function Add-Content { param($Path, $Value) $second.Logs += $Value }
    function Get-CimInstance { param($ClassName, $Filter, $ErrorAction) }
    function Start-Process { param($FilePath, $ArgumentList, [switch]$PassThru, $ErrorAction) $second.Launches++ }
    function Start-Sleep { param($Seconds) $second.Slept = $true; throw 'TEST_END' }
    try { & ([scriptblock]::Create($pairText)) } catch {
      if ($_.Exception.Message -ne 'TEST_END') { throw }
    }
    $detail = ' | second launcher log: ' + ($second.Logs -join ' / ') + (Get-FirstLauncherDetail)
    Assert ($second.Launches -eq 0) ('Second launcher opened another Chrome' + $detail)
    Assert (-not $second.Slept) ('Second launcher kept running' + $detail)
    Assert (($second.Logs -match 'another launcher is already running').Count -eq 1) ('Second launcher did not log why it stopped' + $detail)
  }
} finally {
  [void]$shared.Release.Set()
  [void]$firstRun.AsyncWaitHandle.WaitOne(30000)
}
Assert $firstRun.IsCompleted ('First launcher did not stop' + (Get-FirstLauncherDetail))
[void]$first.EndInvoke($firstRun)
Assert ($first.Streams.Error.Count -eq 0) ('First launcher failed' + (Get-FirstLauncherDetail))
Assert ($shared.Launches -eq 1) ('Two launchers must open only one Chrome' + (Get-FirstLauncherDetail))
Assert ((@($shared.Logs) -match 'first: chrome exited').Count -eq 1) ('First launcher stopped watching its Chrome' + (Get-FirstLauncherDetail))
$first.Dispose()
$shared.Release.Dispose()

Write-Host 'PASS: syntax, preview isolation, URL validation, one launcher only, running Chrome watched, quick-exit back-off, failure retries'
