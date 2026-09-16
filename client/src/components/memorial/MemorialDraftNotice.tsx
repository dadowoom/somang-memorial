import { Link } from "wouter";
import CompleteRegistrationButton from "./CompleteRegistrationButton";

/**
 * 작성 중(등록 완료 전) 추모관을 볼 때 맨 위에 띄우는 안내 (2026-09-16).
 * 작성 중인 추모관은 주인·초대받은 가족·관리자만 열 수 있으므로, 이 안내를 보는
 * 사람은 모두 등록을 마칠 수 있는 사람이다.
 */
export default function MemorialDraftNotice({
  slug,
  photoHref,
}: {
  slug: string;
  /** "#gallery"처럼 같은 화면이면 a, 다른 화면이면 Link 로 간다. */
  photoHref: string;
}) {
  const photoButtonClass =
    "inline-flex min-h-12 items-center justify-center border border-[#b5a46e] bg-white px-4 text-base font-medium text-[#171717]";

  return (
    <section
      aria-label="작성 중인 추모관 안내"
      className="border-b border-[#e5d9b6] bg-[#fbf6e6]"
    >
      <div className="container py-5">
        <p className="text-base font-medium leading-7 text-[#5c4300]">
          작성 중인 추모관입니다. 아직 다른 분들에게는 보이지 않고, 편지도 받지
          않습니다.
        </p>
        <p className="mt-1 text-sm leading-6 text-[#6b5a2e]">
          프로필 사진과 앨범, 글을 다 준비한 뒤 &lsquo;등록 완료하기&rsquo;를
          눌러 주세요. 등록을 마친 뒤에도 계속 고칠 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {photoHref.startsWith("#") ? (
            <a href={photoHref} className={photoButtonClass}>
              프로필·앨범 사진 올리기
            </a>
          ) : (
            <Link href={photoHref}>
              <span className={photoButtonClass}>프로필·앨범 사진 올리기</span>
            </Link>
          )}
          <CompleteRegistrationButton slug={slug} />
        </div>
      </div>
    </section>
  );
}
