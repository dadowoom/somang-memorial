import { useState } from "react";
import { Link } from "wouter";
import { memorialNextAction } from "@/lib/memorialNextAction";

type MemorialActionItem = {
  name: string;
  slug: string;
  href: string;
  editHref: string;
  status: string;
  visibility: string;
};
const buttonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#b5b0a7] px-3 py-2 text-sm text-[#121212] hover:bg-[#f5f5f5]";

export default function MemorialNextActions({
  memorial,
  isAdmin,
}: {
  memorial: MemorialActionItem;
  isAdmin: boolean;
}) {
  const action = memorialNextAction(
    memorial.status,
    memorial.visibility,
    isAdmin
  );
  const [showRequest, setShowRequest] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [changes, setChanges] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const address =
    typeof window === "undefined"
      ? memorial.href
      : new URL(memorial.href, window.location.origin).href;
  const requestText = `추모관 수정 요청\n성함: ${memorial.name}\n주소: ${address}\n수정할 내용: ${changes.trim() || "수정할 내용을 적어 주세요."}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice("복사했습니다. 전달할 곳에 붙여넣어 주세요.");
    } catch {
      setCopyNotice(
        "자동 복사를 사용할 수 없습니다. 아래 내용을 선택해 직접 복사해 주세요."
      );
    }
  };
  return (
    <>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {action.canEdit && (
          <Link href={memorial.editHref}>
            <span className={buttonClass}>이어서 수정</span>
          </Link>
        )}
        {action.canAddPhotos && (
          <Link href={`/memorial/${memorial.slug}/archive#gallery`}>
            <span className={buttonClass}>사진 추가</span>
          </Link>
        )}
        {!action.canEdit && (
          <button
            type="button"
            onClick={() => {
              setShowRequest(value => !value);
              setCopyNotice("");
            }}
            aria-expanded={showRequest}
            className={buttonClass}
          >
            수정 요청 안내
          </button>
        )}
        {action.canShare && (
          <button
            type="button"
            onClick={() => {
              setShowShare(value => !value);
              setCopyNotice("");
            }}
            aria-expanded={showShare}
            className={buttonClass}
          >
            가족에게 공유
          </button>
        )}
        <Link href={memorial.href}>
          <span className={buttonClass}>추모관 보기</span>
        </Link>
      </div>
      <div className="border-t border-[#e4ded5] pt-3 lg:col-span-full">
        <p className="text-base leading-7 text-[#616161]">{action.message}</p>
        {showRequest && (
          <div className="mt-4 space-y-3 rounded-sm border border-[#d5cfc5] bg-[#fcfbf8] p-4">
            <p className="text-base leading-7">
              아래 문장을 복사해 교회 담당자에게 전달해 주세요. 이 화면에서
              요청이 자동으로 접수되지는 않습니다.
            </p>
            <label className="block text-sm font-medium">
              수정할 내용
              <textarea
                value={changes}
                onChange={event => {
                  setChanges(event.target.value);
                  setCopyNotice("");
                }}
                maxLength={2000}
                className="mt-2 min-h-24 w-full border border-[#b5b0a7] bg-white p-3 text-base"
                placeholder="예: 소천일을 2026-01-01로 바꾸고 싶습니다."
              />
            </label>
            <textarea
              aria-label="담당자에게 전달할 수정 요청 문구"
              readOnly
              value={requestText}
              className="min-h-32 w-full border border-[#b5b0a7] bg-white p-3 text-base"
              onFocus={event => event.target.select()}
            />
            <button
              type="button"
              className={buttonClass}
              onClick={() => copy(requestText)}
            >
              요청 문구 복사
            </button>
          </div>
        )}
        {showShare && (
          <div className="mt-4 space-y-3 border border-[#d5cfc5] bg-[#fcfbf8] p-4">
            <label className="block text-sm font-medium">
              가족에게 보낼 추모관 주소
              <input
                readOnly
                value={address}
                onFocus={event => event.target.select()}
                className="mt-2 h-12 w-full border border-[#b5b0a7] bg-white px-3 text-base"
              />
            </label>
            <button
              type="button"
              onClick={() => copy(address)}
              className={buttonClass}
            >
              주소 복사
            </button>
          </div>
        )}
        {copyNotice && (
          <p role="status" className="mt-3 text-sm leading-6 text-[#616161]">
            {copyNotice}
          </p>
        )}
      </div>
    </>
  );
}
