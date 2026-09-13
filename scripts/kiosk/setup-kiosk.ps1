<#
  소망교회 추모관 — 키오스크 PC 한 번에 설정하기 (Windows 10/11)

  이 파일을 키오스크 PC에서 "관리자 권한 PowerShell" 로 한 번 실행하면:
    1. 키오스크 전용 계정(kiosk)을 만든다. 관리자 권한이 없는 일반 계정이다.
    2. PC 를 켜면 그 계정으로 자동 로그인한다.
    3. 로그인되자마자 Edge 가 전체 화면(키오스크 모드)으로 추모관 검색 화면을 연다.
    4. 누가 브라우저를 닫아도 3초 뒤 다시 뜬다.
    5. 화면이 꺼지거나 절전에 들어가지 않는다.
    6. Windows 업데이트가 낮 시간(08~22시)에 재부팅하지 않는다.

  주소가 바뀌면 같은 파일을 -KioskUrl 로 다시 실행하거나
  C:\Kiosk\config.json 의 url 만 고치면 된다.

  사용법 (관리자 PowerShell):
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\setup-kiosk.ps1
    .\setup-kiosk.ps1 -KioskUrl "https://새주소/kiosk"

  자세한 설명은 docs/KIOSK_SETUP.md 를 본다.
#>
[CmdletBinding()]
param(
  [string]$KioskUrl = "https://somangmemorial.co.kr/kiosk",
  [string]$KioskUser = "kiosk",
  # 자동 로그인을 걸지 않으려면 지정한다 (예: 이미 다른 방법으로 자동 로그인 중일 때).
  [switch]$SkipAutoLogon
)

$ErrorActionPreference = "Stop"
$KioskRoot = "C:\Kiosk"
$EdgeProfile = Join-Path $KioskRoot "EdgeProfile"
$Launcher = Join-Path $KioskRoot "start-kiosk.ps1"
$ConfigPath = Join-Path $KioskRoot "config.json"
$TaskName = "SomangKiosk"

function Write-Step([string]$text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Write-Ok([string]$text) { Write-Host "   $text" -ForegroundColor Green }
function Write-Warn2([string]$text) { Write-Host "   $text" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. 관리자 권한인지, Edge 가 있는지 확인
# ---------------------------------------------------------------------------
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "관리자 권한 PowerShell 에서 실행해 주세요. (시작 → PowerShell → 마우스 오른쪽 → 관리자 권한으로 실행)" -ForegroundColor Red
  exit 1
}

$edgeCandidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
)
$edgePath = $edgeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $edgePath) {
  Write-Host "Microsoft Edge 를 찾지 못했습니다. Windows 업데이트로 Edge 를 먼저 설치해 주세요." -ForegroundColor Red
  exit 1
}

Write-Step "설정 내용"
Write-Host "   키오스크 주소 : $KioskUrl"
Write-Host "   전용 계정     : $KioskUser"
Write-Host "   브라우저      : $edgePath"

# ---------------------------------------------------------------------------
# 1. 폴더와 설정 파일
# ---------------------------------------------------------------------------
Write-Step "폴더 준비"
New-Item -ItemType Directory -Force -Path $KioskRoot | Out-Null
New-Item -ItemType Directory -Force -Path $EdgeProfile | Out-Null
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

# 키오스크 계정이 Edge 프로필 폴더에 쓸 수 있어야 한다.
& icacls $EdgeProfile /grant "${KioskUser}:(OI)(CI)M" /T | Out-Null
& icacls $KioskRoot /grant "${KioskUser}:(OI)(CI)RX" | Out-Null

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
# 4. Edge 첫 실행 안내·로그인 권유·알림 끄기 (정책)
# ---------------------------------------------------------------------------
Write-Step "Edge 정책"
$edgePolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
New-Item -Path $edgePolicy -Force | Out-Null
$policies = @{
  HideFirstRunExperience     = 1
  BrowserSignin              = 0
  SyncDisabled               = 1
  DefaultNotificationsSetting = 2
  PasswordManagerEnabled     = 0
  AutofillAddressEnabled     = 0
  AutofillCreditCardEnabled  = 0
  TranslateEnabled           = 0
  ShowHomeButton             = 0
  StartupBoostEnabled        = 0
  BackgroundModeEnabled      = 0
  PromotionalTabsEnabled     = 0
  EdgeShoppingAssistantEnabled = 0
}
foreach ($name in $policies.Keys) {
  Set-ItemProperty -Path $edgePolicy -Name $name -Value $policies[$name] -Type DWord
}
Write-Ok "첫 실행 안내, 로그인 권유, 알림, 비밀번호 저장 제안을 껐습니다."

# ---------------------------------------------------------------------------
# 5. 실행 파일: Edge 를 키오스크 모드로 열고, 닫히면 다시 연다
# ---------------------------------------------------------------------------
Write-Step "키오스크 실행 파일"
$launcherBody = @'
# 소망교회 추모관 키오스크 실행기. setup-kiosk.ps1 이 만든다. 직접 고치지 말 것.
$ErrorActionPreference = "Continue"
$root = "C:\Kiosk"
$config = Get-Content -Path (Join-Path $root "config.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$url = $config.url
$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$profileDir = Join-Path $root "EdgeProfile"
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
while ($true) {
  $edgeArgs = @(
    "--kiosk", $url,
    "--edge-kiosk-type=fullscreen",
    "--no-first-run",
    "--noerrdialogs",
    "--disable-session-crashed-bubble",
    "--overscroll-history-navigation=0",
    "--kiosk-idle-timeout-minutes=0",
    "--user-data-dir=$profileDir"
  )
  $proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru
  $proc.WaitForExit()
  Log "edge exited code=$($proc.ExitCode); relaunch in 3s"
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
# 8. Windows 업데이트 재부팅은 밤에만
# ---------------------------------------------------------------------------
Write-Step "Windows 업데이트"
$ux = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
New-Item -Path $ux -Force | Out-Null
Set-ItemProperty -Path $ux -Name ActiveHoursStart -Value 8 -Type DWord
Set-ItemProperty -Path $ux -Name ActiveHoursEnd -Value 22 -Type DWord
Write-Ok "08시~22시에는 업데이트로 재부팅하지 않습니다."

# ---------------------------------------------------------------------------
# 끝
# ---------------------------------------------------------------------------
Write-Step "완료"
Write-Host "   이제 PC 를 다시 시작하면 '$KioskUser' 로 자동 로그인되고 추모관 검색 화면이 전체 화면으로 뜹니다."
Write-Host "   관리가 필요할 때: Ctrl+Alt+Del → 로그아웃 → 관리자 계정으로 로그인."
Write-Host "   주소를 바꾸려면: $ConfigPath 의 url 을 고치거나 이 파일을 -KioskUrl 로 다시 실행."
Write-Host ""
$answer = Read-Host "지금 다시 시작할까요? (y/N)"
if ($answer -match '^[yY]') { Restart-Computer -Force }
