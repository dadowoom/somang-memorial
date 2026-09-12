import { useState } from "react";
import { Link, useParams } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { inputClass } from "@/lib/formStyles";

const buttonClass =
  "inline-flex min-h-12 items-center justify-center bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const subtleButtonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] hover:bg-[#f5f5f5] disabled:opacity-50";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

/**
 * 가족 초대 (2026-09-13). 추모관 주인이 초대 링크를 만들어 가족에게 주면, 그 링크로
 * 들어온 가족이 글·사진·가족관을 함께 관리한다. 초대와 제외는 주인과 관리자만.
 */
export default function MemorialFamilyMembers() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const listQuery = trpc.familyMembers.list.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(user && slug), retry: false }
  );

  if (loading) {
    return <StateScreen text="계정 정보를 확인하고 있습니다." />;
  }

  if (!user) {
    return <StateScreen text="로그인 후 가족을 초대할 수 있습니다." />;
  }

  if (listQuery.isLoading) {
    return <StateScreen text="가족 목록을 불러오고 있습니다." />;
  }

  if (listQuery.error) {
    return <StateScreen text={errorText(listQuery.error)} showBack />;
  }

  const info = listQuery.data;
  if (!info) {
    return <StateScreen text="추모관을 찾을 수 없습니다." showBack />;
  }

  const reload = () =>
    utils.familyMembers.list.invalidate({ memorialSlug: slug });

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[680px] px-6 pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          SOMANG FAMILY
        </p>
        <h1
          className="mt-5 text-[30px] font-light leading-tight text-[#121212]"
          style={serifStyle}
        >
          가족 초대
        </h1>
        <p className="mt-4 text-base leading-7 text-[#616161]">
          {info.memorialName} 님의 추모관을 함께 관리할 가족을 초대합니다.
          초대받은 가족은 글과 사진, 가족관을 함께 고칠 수 있습니다. 다른 가족을
          초대하거나 제외하는 것은 추모관을 만든 분만 할 수 있습니다.
        </p>

        <InvitationSection
          slug={slug}
          invitation={info.invitation}
          invitationDays={info.invitationDays}
          onChanged={reload}
        />

        <MembersSection slug={slug} members={info.members} onChanged={reload} />

        <div className="mt-12 border-t border-[#e2e2e2] pt-6">
          <Link href="/my/memorials">
            <span className={subtleButtonClass}>내 추모관으로 돌아가기</span>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InvitationSection({
  slug,
  invitation,
  invitationDays,
  onChanged,
}: {
  slug: string;
  invitation: { expiresAt: Date | string; createdAt: Date | string } | null;
  invitationDays: number;
  onChanged: () => void;
}) {
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | string | null>(null);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const create = trpc.familyMembers.createInvitation.useMutation();
  const revoke = trpc.familyMembers.revokeInvitation.useMutation();

  async function handleCreate() {
    setMessage("");
    setNotice("");
    try {
      const created = await create.mutateAsync({ memorialSlug: slug });
      const absolute =
        typeof window === "undefined"
          ? created.href
          : new URL(created.href, window.location.origin).href;
      setLink(absolute);
      setExpiresAt(created.expiresAt);
      onChanged();
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  async function handleRevoke() {
    if (
      !window.confirm(
        "지금 살아 있는 초대 링크를 닫을까요? 이미 들어온 가족은 그대로 남습니다."
      )
    ) {
      return;
    }
    setMessage("");
    setNotice("");
    try {
      await revoke.mutateAsync({ memorialSlug: slug });
      setLink("");
      setExpiresAt(null);
      onChanged();
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice("복사했습니다. 가족에게 카카오톡이나 문자로 보내 주세요.");
    } catch {
      setNotice(
        "자동 복사를 쓸 수 없습니다. 링크를 직접 선택해 복사해 주세요."
      );
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        초대 링크
      </h2>
      <p className="mt-4 text-base leading-7 text-[#616161]">
        링크를 만들어 가족에게 보내 주세요. 링크는 {invitationDays}일 동안 쓸 수
        있고, 여러 가족이 같은 링크로 들어올 수 있습니다. 새 링크를 만들면 이전
        링크는 닫힙니다.
      </p>

      {link ? (
        <>
          <input
            readOnly
            value={link}
            onFocus={event => event.target.select()}
            className={`mt-5 ${inputClass}`}
            aria-label="가족 초대 링크"
          />
          <p className="mt-2 text-xs text-[#8a8a8a]">
            이 링크는 지금 한 번만 보여 드립니다. 창을 닫으면 다시 볼 수 없으니
            먼저 복사해 두세요.
            {expiresAt ? ` ${formatDate(expiresAt)}까지 쓸 수 있습니다.` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={buttonClass}>
              링크 복사
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className={subtleButtonClass}
              disabled={create.isPending}
            >
              새 링크 만들기
            </button>
          </div>
        </>
      ) : (
        <div className="mt-5">
          {invitation && (
            <p className="mb-3 text-sm leading-6 text-[#616161]">
              {formatDate(invitation.createdAt)}에 만든 링크가{" "}
              {formatDate(invitation.expiresAt)}까지 살아 있습니다. 링크 원문은
              다시 볼 수 없으니, 잃어버렸다면 새로 만들어 주세요.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className={buttonClass}
              disabled={create.isPending}
            >
              {create.isPending
                ? "만드는 중"
                : invitation
                  ? "새 링크 만들기"
                  : "초대 링크 만들기"}
            </button>
            {invitation && (
              <button
                type="button"
                onClick={handleRevoke}
                className={subtleButtonClass}
                disabled={revoke.isPending}
              >
                링크 닫기
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <p role="status" className="mt-3 text-sm leading-6 text-[#616161]">
          {notice}
        </p>
      )}
      {message && (
        <p className="mt-3 text-sm leading-6 text-[#9f2a2a]">{message}</p>
      )}
    </section>
  );
}

function MembersSection({
  slug,
  members,
  onChanged,
}: {
  slug: string;
  members: Array<{
    userId: number;
    name: string;
    email: string;
    joinedAt: Date | string;
  }>;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const remove = trpc.familyMembers.removeMember.useMutation();

  async function handleRemove(member: { userId: number; name: string }) {
    if (
      !window.confirm(
        `${member.name || "이 가족"} 님을 함께 관리하는 가족에서 제외할까요? 다시 초대하면 돌아올 수 있습니다.`
      )
    ) {
      return;
    }
    setMessage("");
    try {
      await remove.mutateAsync({ memorialSlug: slug, userId: member.userId });
      onChanged();
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        함께 관리하는 가족
      </h2>

      {members.length === 0 ? (
        <p className="mt-4 text-base leading-7 text-[#616161]">
          아직 초대로 들어온 가족이 없습니다. 위에서 링크를 만들어 보내 주세요.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#e2e2e2] border-y border-[#e2e2e2]">
          {members.map(member => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="text-sm font-medium text-[#121212]">
                  {member.name || "이름 없음"}
                </p>
                <p className="mt-1 text-xs text-[#8a8a8a]">
                  {member.email}
                  {" · "}
                  {formatDate(member.joinedAt)} 참여
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(member)}
                className={subtleButtonClass}
                disabled={remove.isPending}
              >
                제외
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p className="mt-3 text-sm leading-6 text-[#9f2a2a]">{message}</p>
      )}
    </section>
  );
}

function StateScreen({ text, showBack }: { text: string; showBack?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <Navbar />
      <main className="mx-auto w-full max-w-[680px] px-6 pb-24 pt-28 sm:pt-32">
        <div className="border border-[#b5b0a7] bg-white py-20 text-center">
          <p className="text-sm leading-7 text-[#616161]">{text}</p>
          {showBack && (
            <Link href="/my/memorials">
              <span className={`mt-6 ${subtleButtonClass}`}>
                내 추모관으로 돌아가기
              </span>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
