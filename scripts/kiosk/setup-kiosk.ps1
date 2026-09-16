<#
  소망교회 추모관 — 키오스크 PC 한 번에 설정하기 (Windows 10/11)

  이 파일을 키오스크 PC에서 "관리자 권한 PowerShell" 로 한 번 실행하면:
    1. 키오스크 전용 계정(kiosk)을 만든다. 관리자 권한이 없는 일반 계정이다.
    2. PC 를 켜면 그 계정으로 자동 로그인한다.
    3. 로그인되자마자 Chrome 이 전체 화면(키오스크 모드)으로 추모관 검색 화면을 연다.
    4. 누가 브라우저를 닫아도 3초 뒤 다시 뜬다.
    5. 화면이 꺼지거나 절전에 들어가지 않는다.
    6. Windows 업데이트 활성 시간을 08~22시로 지정한다.

  주소가 바뀌면 같은 파일을 -KioskUrl 로 다시 실행하거나
  C:\Kiosk\config.json 의 url 만 고치면 된다.

  사용법 (관리자 PowerShell):
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\setup-kiosk.ps1
    .\setup-kiosk.ps1 -KioskUrl "https://새주소/kiosk"
    .\setup-kiosk.ps1 -Preview # 관리자 권한 없이 오늘 화면만 체험 (Alt+F4로 종료)

  자세한 설명은 docs/KIOSK_SETUP.md 를 본다.
#>
[CmdletBinding()]
param(
  [string]$KioskUrl = "https://somangmemorial.co.kr/kiosk",
  [string]$KioskUser = "kiosk",
  # 자동 로그인을 걸지 않으려면 지정한다 (예: 이미 다른 방법으로 자동 로그인 중일 때).
  [switch]$SkipAutoLogon,
  # 자동 로그인·예약 작업·전원 설정 없이 Chrome 전체화면만 연다.
  [switch]$Preview
)

$ErrorActionPreference = "Stop"
$KioskRoot = "C:\Kiosk"
$ChromeProfile = Join-Path $KioskRoot "ChromeProfile"
$Launcher = Join-Path $KioskRoot "start-kiosk.ps1"
$ConfigPath = Join-Path $KioskRoot "config.json"
$TaskName = "SomangKiosk"

function Write-Step([string]$text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Write-Ok([string]$text) { Write-Host "   $text" -ForegroundColor Green }
function Write-Warn2([string]$text) { Write-Host "   $text" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. 주소와 모든 사용자용 Chrome 설치 확인. 미리보기에는 관리자 권한이 필요 없다.
# ---------------------------------------------------------------------------
$uri = $null
if (-not [Uri]::TryCreate($KioskUrl, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -ne 'https' -or $uri.UserInfo -or $KioskUrl -match '[\s"]') {
  throw '키오스크 주소는 사용자 정보나 공백이 없는 HTTPS 주소여야 합니다.'
}
$chromeCandidates = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chromePath) {
  throw 'Google Chrome을 모든 사용자용으로 먼저 설치해 주세요. 현재 관리자 개인 계정에만 설치하면 kiosk 계정이 실행할 수 없습니다.'
}
if ($Preview) {
  # 기존 개인 Chrome 창과 프로필을 재사용하지 않는다.
  $previewProfile = Join-Path $env:LOCALAPPDATA 'SomangKiosk\ChromePreview'
  $previewArgs = @('--kiosk', "`"$KioskUrl`"", '--incognito', '--no-first-run',
    '--no-default-browser-check', '--disable-background-mode',
    "--user-data-dir=`"$previewProfile`"")
  Start-Process -FilePath $chromePath -ArgumentList $previewArgs | Out-Null
  Write-Ok 'Chrome 미리보기를 열었습니다. Alt+F4로 종료합니다. 자동 실행과 Windows 설정은 변경하지 않았습니다.'
  return
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "관리자 권한 PowerShell 에서 실행해 주세요. (시작 → PowerShell → 마우스 오른쪽 → 관리자 권한으로 실행)" -ForegroundColor Red
  exit 1
}

Write-Step "설정 내용"
Write-Host "   키오스크 주소 : $KioskUrl"
Write-Host "   전용 계정     : $KioskUser"
Write-Host "   브라우저      : $chromePath"
Write-Warn2 '이 PC 전체 Chrome 정책(브라우저 로그인·동기화·저장 제안·알림·백그라운드 실행)을 변경합니다.'

# ---------------------------------------------------------------------------
# 1. 폴더와 설정 파일
# ---------------------------------------------------------------------------
Write-Step "폴더 준비"
New-Item -ItemType Directory -Force -Path $KioskRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null
@{ url = $KioskUrl } | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
Write-Ok "$ConfigPath 에 주소를 적었습니다."

# ---------------------------------------------------------------------------
# 2. 키오스크 전용 계정 (관리자 아님)
# ---------------------------------------------------------------------------
Write-Step "키오스크 전용 계정"
$existing = Get-LocalUser -Name $KioskUser -ErrorAction SilentlyContinue
$securePassword = $null
if (-not $existing -or -not $SkipAutoLogon) {
  Write-Host "   '$KioskUser' 계정 비밀번호를 정해 주세요. 이 PC 에서만 쓰는 단순한 것으로도 됩니다."
  Write-Host "   (자동 로그인을 위해 PC 안에 저장되므로, 다른 곳에서 쓰는 비밀번호는 넣지 마세요.)"
  $securePassword = Read-Host "   비밀번호" -AsSecureString
}
if (-not $existing) {
  New-LocalUser -Name $KioskUser -Password $securePassword -PasswordNeverExpires -AccountNeverExpires -Description "소망교회 추모관 키오스크 전용" | Out-Null
  # S-1-5-32-545 = Users 그룹. 한글 Windows 에서는 그룹 이름이 달라 SID 로 지정한다.
  Add-LocalGroupMember -SID "S-1-5-32-545" -Member $KioskUser -ErrorAction SilentlyContinue
  Write-Ok "'$KioskUser' 계정을 만들었습니다 (일반 사용자, 관리자 아님)."
} else {
  if ($securePassword) { Set-LocalUser -Name $KioskUser -Password $securePassword -PasswordNeverExpires $true }
  Write-Ok "'$KioskUser' 계정이 이미 있어 그대로 씁니다."
}

# 키오스크 계정이 Chrome 프로필과 로그에는 쓸 수 있어야 한다.
& icacls $ChromeProfile /grant "${KioskUser}:(OI)(CI)M" /T | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Chrome 프로필 권한 설정 실패' }
& icacls $KioskRoot /grant "${KioskUser}:(OI)(CI)RX" | Out-Null
if ($LASTEXITCODE -ne 0) { throw '키오스크 폴더 권한 설정 실패' }
$logPath = Join-Path $KioskRoot 'kiosk.log'
if (-not (Test-Path -LiteralPath $logPath)) { New-Item -ItemType File -Path $logPath | Out-Null }
& icacls $logPath /grant "${KioskUser}:M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw '키오스크 로그 권한 설정 실패' }

# ---------------------------------------------------------------------------
# 3. 자동 로그인
# ---------------------------------------------------------------------------
Write-Step "자동 로그인"
if ($SkipAutoLogon) {
  Write-Warn2 "-SkipAutoLogon 이 지정되어 자동 로그인은 건드리지 않습니다."
} else {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  $winlogon = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
  Set-ItemProperty -Path $winlogon -Name AutoAdminLogon -Value "1" -Type String
  Set-ItemProperty -Path $winlogon -Name DefaultUserName -Value $KioskUser -Type String
  Set-ItemProperty -Path $winlogon -Name DefaultDomainName -Value $env:COMPUTERNAME -Type String
  Set-ItemProperty -Path $winlogon -Name DefaultPassword -Value $plain -Type String
  Remove-ItemProperty -Path $winlogon -Name AutoLogonCount -ErrorAction SilentlyContinue
  $plain = $null
  Write-Ok "PC 를 켜면 '$KioskUser' 로 자동 로그인합니다."
  Write-Warn2 "비밀번호가 PC 안(레지스트리)에 저장됩니다. 키오스크 전용 비밀번호만 쓰세요."
}

# ---------------------------------------------------------------------------
# 4. Chrome 로그인 권유·알림 끄기 (이 PC의 모든 Chrome에 적용되는 정책)
# ---------------------------------------------------------------------------
Write-Step "Chrome 정책"
$chromePolicy = "HKLM:\SOFTWARE\Policies\Google\Chrome"
New-Item -Path $chromePolicy -Force | Out-Null
$policies = @{
  BrowserSignin              = 0
  SyncDisabled               = 1
  DefaultNotificationsSetting = 2
  PasswordManagerEnabled     = 0
  AutofillAddressEnabled     = 0
  AutofillCreditCardEnabled  = 0
  TranslateEnabled           = 0
  ShowHomeButton             = 0
  BackgroundModeEnabled      = 0
}
foreach ($name in $policies.Keys) {
  Set-ItemProperty -Path $chromePolicy -Name $name -Value $policies[$name] -Type DWord
}
Write-Ok "첫 실행 안내, 로그인 권유, 알림, 비밀번호 저장 제안을 껐습니다."

# ---------------------------------------------------------------------------
# 5. 실행 파일: Chrome 을 키오스크 모드로 열고, 닫히면 다시 연다
# ---------------------------------------------------------------------------
Write-Step "키오스크 실행 파일"
$launcherBody = @'
# 소망교회 추모관 키오스크 실행기. setup-kiosk.ps1 이 만든다. 직접 고치지 말 것.
$ErrorActionPreference = "Continue"
$root = "C:\Kiosk"
$config = Get-Content -Path (Join-Path $root "config.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$url = $config.url
$chrome = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$profileDir = Join-Path $root "ChromeProfile"
$log = Join-Path $root "kiosk.log"

function Log([string]$text) {
  Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $text)
}

# 지난번 비정상 종료 뒤 "복원하시겠습니까?" 창이 뜨지 않게 한다.
$prefs = Join-Path $profileDir "Default\Preferences"
if (Test-Path $prefs) {
  try {
    $text = Get-Content -Path $prefs -Raw -Encoding UTF8
    $text = $text -replace '"exit_type":"Crashed"', '"exit_type":"Normal"'
    Set-Content -Path $prefs -Value $text -Encoding UTF8 -NoNewline
  } catch { }
}

Log "start url=$url"
if (-not $chrome) { Log 'Chrome not installed for all users'; exit 1 }
$uri = $null
if (-not [Uri]::TryCreate($url, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -ne 'https' -or $uri.UserInfo -or $url -match '[\s"]') {
  Log 'Invalid HTTPS kiosk URL'; exit 1
}
while ($true) {
  $chromeArgs = @(
    "--kiosk", "`"$url`"",
    "--incognito",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--noerrdialogs",
    "--disable-session-crashed-bubble",
    "--overscroll-history-navigation=0",
    "--disable-features=OverscrollHistoryNavigation,TouchpadOverscrollHistoryNavigation",
    "--disable-pinch",
    "--user-data-dir=`"$profileDir`""
  )
  try {
    $proc = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -PassThru -ErrorAction Stop
    $proc.WaitForExit()
    Log "chrome exited code=$($proc.ExitCode); relaunch in 3s"
  } catch {
    Log 'Chrome launch failed; retry in 3s'
  }
  Start-Sleep -Seconds 3
}
'@
Set-Content -Path $Launcher -Value $launcherBody -Encoding UTF8
Write-Ok "$Launcher 을 만들었습니다."

# ---------------------------------------------------------------------------
# 6. 로그인할 때 자동 실행 (작업 스케줄러)
# ---------------------------------------------------------------------------
Write-Step "자동 실행 등록"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Launcher`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $KioskUser
$principal = New-ScheduledTaskPrincipal -UserId $KioskUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "소망교회 추모관 키오스크 자동 실행" | Out-Null
Write-Ok "'$KioskUser' 로 로그인하면 키오스크가 자동으로 뜹니다."

# ---------------------------------------------------------------------------
# 7. 화면 꺼짐·절전 끄기
# ---------------------------------------------------------------------------
Write-Step "전원 설정"
& powercfg /change monitor-timeout-ac 0 | Out-Null
& powercfg /change standby-timeout-ac 0 | Out-Null
& powercfg /change hibernate-timeout-ac 0 | Out-Null
& powercfg /change monitor-timeout-dc 0 | Out-Null
& powercfg /change standby-timeout-dc 0 | Out-Null
& powercfg /hibernate off | Out-Null
Write-Ok "화면이 꺼지지 않고 절전에 들어가지 않습니다."

# ---------------------------------------------------------------------------
# 8. Windows 업데이트 활성 시간 (재부팅을 절대 방지하는 것은 아님)
# ---------------------------------------------------------------------------
Write-Step "Windows 업데이트"
$ux = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
New-Item -Path $ux -Force | Out-Null
Set-ItemProperty -Path $ux -Name ActiveHoursStart -Value 8 -Type DWord
Set-ItemProperty -Path $ux -Name ActiveHoursEnd -Value 22 -Type DWord
Write-Ok "Windows 업데이트 활성 시간을 08시~22시로 지정했습니다."

# ---------------------------------------------------------------------------
# 끝
# ---------------------------------------------------------------------------
Write-Step "완료"
Write-Host "   이제 PC 를 다시 시작하면 '$KioskUser' 로 자동 로그인되고 추모관 검색 화면이 전체 화면으로 뜹니다."
Write-Host "   관리가 필요할 때: Ctrl+Alt+Del → 로그아웃 → 관리자 계정으로 로그인."
Write-Host "   주소를 바꾸려면: $ConfigPath 의 url 을 고치거나 이 파일을 -KioskUrl 로 다시 실행."
Write-Host ""
Write-Warn2 '자동으로 다시 시작하지 않습니다. 진행 중인 작업을 저장하고 승인받은 뒤 Windows 시작 메뉴에서 다시 시작하세요.'
