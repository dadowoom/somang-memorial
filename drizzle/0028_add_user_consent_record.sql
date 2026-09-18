-- 가입 동의 기록 (2026-09-19). 언제 어느 판의 약관·개인정보처리방침에 동의했는지 남긴다.
-- 칸만 늘린다. 기존 회원은 비어 있는 채로 둔다(그분들은 옛 화면에서 동의 확인 후 가입했다).
ALTER TABLE `users` ADD `termsAgreedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `privacyAgreedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `consentVersion` varchar(20) NULL;
