/**
 * 올리는 사진의 크기 한도 (2026-09-24 사용자 결정).
 *
 * "용량 큰 사진을 올려도 서버에는 크기를 줄인 것만 저장한다. 풀사이즈 원본은
 * 저장하지 않는다." 전에는 8MB 이하면 휴대폰 원본(4000px, 3~5MB)이 그대로 올라갔다.
 *
 * - 브라우저: 긴 변 2048px, 1MB 안팎으로 줄여서 올린다 (client/src/lib/imageCompression.ts)
 * - 서버: 긴 변 2048px 또는 1.5MB 를 넘으면 받지 않는다 (server/_core/imageUpload.ts).
 *   브라우저가 줄이지 못한 경우(옛 화면이 열려 있는 등)를 막는 두 번째 문이다.
 *
 * 2048px 은 휴대폰·PC 화면으로 보기와 작은 인화(4x6 인치)에는 충분하다. 큰 인화용
 * 원본은 가족이 따로 가지고 있어야 한다.
 */
export const UPLOAD_MAX_DIMENSION = 2048;
export const UPLOAD_TARGET_BYTES = 1024 * 1024;
export const UPLOAD_MAX_BYTES = 1.5 * 1024 * 1024;
