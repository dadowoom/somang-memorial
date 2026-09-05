export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

/**
 * 로그인 상태를 유지하는 기간.
 *
 * 예전에는 1년이었다. 교회 공용 컴퓨터나 키오스크에서 로그아웃을 잊으면
 * 다음 사람이 그 계정으로 들어갈 수 있었고, 1년이면 사실상 영구다.
 *
 * 대신 아래 SESSION_RENEW_AFTER_MS 로 자동 연장을 둔다. 계속 쓰는 분은
 * 로그아웃되지 않고, 방치된 것만 만료된다.
 */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

/**
 * 남은 기간이 이보다 짧아지면 요청이 올 때 조용히 새로 발급한다.
 * 매 요청마다 새로 만들면 서명 비용과 쿠키 쓰기가 낭비다.
 */
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_MS / 2;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
