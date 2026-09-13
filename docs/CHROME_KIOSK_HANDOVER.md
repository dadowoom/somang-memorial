# Chrome 키오스크 인수인계 — 2026-09-14

## 코드와 검사

- 기준 main: `70db1c6751b075b4a26c1f4f0fb70194d2090845`.
- 작업 브랜치: `codex/chrome-kiosk`.
- Chrome 전환 구현 커밋: `0c34ef9188734e5c618a33d0db4b3a2d563bb2fd`.
- 실행기, 설치 안내, 미리보기, Windows PowerShell 시험과 CI를 Chrome 기준으로 변경했다.
- 타입 검사, 테스트 328개, 빌드, `git diff --check`, Windows PowerShell 5.1 실행기 시험 통과.
- 테스트는 운영 환경변수 없이 실행했다. Bash 시험은 검증용 휴대용 Git의 Bash를 사용했다.
- 사이트 디자인·관리자 기능·서버/API·DB 변경이나 운영 배포는 하지 않았다. PWA는 보류다.

## PC 적용 상태

- Windows 11 Pro, Chrome 설치, 유선 인터넷 및 공식 HTTPS 연결 확인.
- 사용자가 관리자 설치를 실행했고 완료 화면을 제공했다.
- 일반 로컬 계정 `kiosk` 생성과 활성화, 해당 계정 자동 로그인 설정 확인.
- 공식 주소 `https://somangmemorial.co.kr/kiosk`, Chrome 실행기와 프로필·로그 파일 확인.
- AC/DC 화면 꺼짐 및 절전 시간 0(사용 안 함) 확인.
- `SomangKiosk` 예약 작업 등록 흔적은 레지스트리에서 확인했다.
  현재 비관리자 세션의 스케줄러 직접 조회는 접근 거부이므로 상세 검증은 미완료다.
- Chrome 미리보기 프로세스의 공식 주소·키오스크 옵션·분리 프로필 확인.
  Chrome 실제 창의 자동 시각 검증은 브라우저 연결이 없어 수행하지 못했다.
- 앱 내 브라우저에서 공식 초기 화면, 한글 자판과 미사용 후 초기 화면 복귀 확인.
- **재부팅 시험 성공:** 2026-09-14 사용자가 재부팅 후 키오스크가 자동으로 뜬다고 확인했다.
  이후 앱 개발은 MacBook에서 이어가고, 이 PC는 Chrome 키오스크 표시용으로 사용한다.

## 아직 확인할 것

- 세로 모니터 연결 후 1080×1920·100%·세로 방향 및 실제 터치 좌표를 확인한다.
- 검색·자판·사진·영상·홈 복귀·90초 초기화·브라우저 종료 후 재실행을 현장에서 확인한다.
- 네트워크 끊김/복구 시험은 별도 승인 후 진행한다. 운영 편지를 승인 없이 제출하지 않는다.

## GitHub 반영

이 기록 작성 시점에 GitHub 반영은 미완료다. 연결된 GitHub 앱은 브랜치/트리 작성 요청을
`403 Resource not accessible by integration`으로 거부했고, 로컬 Git에도 HTTPS 인증이 없다.
쓰기 가능한 연결 또는 Git 로그인을 사용자가 복구한 뒤 아래 순서로 마무리한다.

1. `git fetch origin`으로 최신 main과 원격 브랜치를 확인한다.
2. 로컬 `codex/chrome-kiosk`를 push하고 PR을 생성한다.
3. CI 및 현장 검증 결과를 PR에 기록한다. main에 직접 push하거나 강제로 초기화하지 않는다.

Windows 계정이나 레지스트리 자체를 GitHub에 올리는 것이 아니다. 복구 가능한 설정 코드,
실행 파일과 인수인계 문서만 보관한다. 비밀번호·토큰·환경변수·브라우저 프로필·운영 자료는 제외한다.

## 더블클릭 실행 파일

`scripts/kiosk`의 네 파일을 같은 폴더에 둔다:
`setup-kiosk.ps1`, `chrome-preview.cmd`, `install-chrome-kiosk.cmd`, `install-chrome-kiosk.ps1`.
미리보기는 `chrome-preview.cmd`, 관리자 설치는 `install-chrome-kiosk.cmd`로 실행한다.
미리보기 종료는 Alt+F4이며, 설치기는 자동 재부팅하지 않는다.
