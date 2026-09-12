import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  errorClass,
  inputClass,
  labelClass,
  textAreaClass,
} from "@/lib/formStyles";

const buttonClass =
  "inline-flex min-h-12 items-center justify-center bg-[#18181b] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const subtleButtonClass =
  "inline-flex min-h-12 items-center justify-center border border-[#b5b0a7] px-4 text-sm text-[#121212] hover:bg-[#f5f5f5]";

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
}

export default function MemorialFamilyManage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const manageQuery = trpc.familyRoom.manage.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(user && slug), retry: false }
  );

  if (loading) {
    return <StateScreen text="계정 정보를 확인하고 있습니다." />;
  }

  if (!user) {
    return <StateScreen text="로그인 후 가족관을 관리할 수 있습니다." />;
  }

  if (manageQuery.isLoading) {
    return <StateScreen text="가족관 정보를 불러오고 있습니다." />;
  }

  if (manageQuery.error) {
    return <StateScreen text={errorText(manageQuery.error)} showBack />;
  }

  const info = manageQuery.data;
  if (!info) {
    return <StateScreen text="가족관 정보를 찾을 수 없습니다." showBack />;
  }

  const reload = () =>
    utils.familyRoom.manage.invalidate({ memorialSlug: slug });

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
          가족관 관리
        </h1>
        <p className="mt-4 text-base leading-7 text-[#616161]">
          {info.memorialName} 님의 가족관입니다. 가족관은 비밀번호를 아는 가족만
          들어올 수 있는 공간이며, 여기에 적는 내용은 공개 추모관에 나오지
          않습니다.
        </p>

        {info.exists ? (
          <ExistingRoom slug={slug} info={info} onSaved={reload} />
        ) : (
          <CreateRoom
            slug={slug}
            memorialName={info.memorialName}
            passwordMinLength={info.passwordMinLength}
            onCreated={reload}
          />
        )}

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

function CreateRoom({
  slug,
  memorialName,
  passwordMinLength,
  onCreated,
}: {
  slug: string;
  memorialName: string;
  passwordMinLength: number;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(`${memorialName} 님 가족관`);
  const [intro, setIntro] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const create = trpc.familyRoom.create.useMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("두 비밀번호가 서로 다릅니다.");
      return;
    }

    try {
      await create.mutateAsync({
        memorialSlug: slug,
        title,
        intro,
        password,
      });
      setPassword("");
      setConfirmPassword("");
      onCreated();
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        가족관 만들기
      </h2>
      <p className="mt-4 text-base leading-7 text-[#616161]">
        아직 가족관이 없습니다. 제목과 소개글, 그리고 가족들이 함께 쓸
        비밀번호를 정해 주세요.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className={labelClass}>제목</span>
          <input
            className={inputClass}
            value={title}
            onChange={event => setTitle(event.target.value)}
            maxLength={160}
            required
          />
        </label>

        <label className="block">
          <span className={labelClass}>소개글</span>
          <textarea
            className={textAreaClass}
            value={intro}
            onChange={event => setIntro(event.target.value)}
            maxLength={2000}
            required
            placeholder="가족들이 들어왔을 때 처음 보게 될 인사말을 적어 주세요."
          />
        </label>

        <PasswordFields
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirmPassword}
          minLength={passwordMinLength}
        />

        {message && <p className={errorClass}>{message}</p>}

        <button
          type="submit"
          className={buttonClass}
          disabled={create.isPending}
        >
          {create.isPending ? "만드는 중" : "가족관 만들기"}
        </button>
      </form>
    </section>
  );
}

function ExistingRoom({
  slug,
  info,
  onSaved,
}: {
  slug: string;
  info: {
    title: string;
    intro: string;
    href: string;
    updatedAt: Date | string | null;
    passwordMinLength: number;
  };
  onSaved: () => void;
}) {
  return (
    <>
      <RoomAddress href={info.href} updatedAt={info.updatedAt} />
      <PasswordSection slug={slug} minLength={info.passwordMinLength} />
      <InfoSection
        slug={slug}
        initialTitle={info.title}
        initialIntro={info.intro}
        onSaved={onSaved}
      />
    </>
  );
}

function RoomAddress({
  href,
  updatedAt,
}: {
  href: string;
  updatedAt: Date | string | null;
}) {
  const [notice, setNotice] = useState("");
  const address =
    typeof window === "undefined"
      ? href
      : new URL(href, window.location.origin).href;

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setNotice("복사했습니다. 가족에게 전달해 주세요.");
    } catch {
      setNotice(
        "자동 복사를 쓸 수 없습니다. 주소를 직접 선택해 복사해 주세요."
      );
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        가족에게 알려줄 주소
      </h2>
      <p className="mt-4 text-base leading-7 text-[#616161]">
        이 주소와 비밀번호를 가족에게 함께 알려 주세요. 비밀번호는 저장된 뒤에는
        아무도 다시 볼 수 없으니, 잊으셨다면 아래에서 새로 정하시면 됩니다.
      </p>
      <input
        readOnly
        value={address}
        onFocus={event => event.target.select()}
        className={`mt-5 ${inputClass}`}
        aria-label="가족관 주소"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={subtleButtonClass}>
          주소 복사
        </button>
        <Link href={href}>
          <span className={subtleButtonClass}>가족관 열어보기</span>
        </Link>
      </div>
      {notice && (
        <p role="status" className="mt-3 text-sm leading-6 text-[#616161]">
          {notice}
        </p>
      )}
      {updatedAt && (
        <p className="mt-3 text-xs text-[#8a8a8a]">
          마지막 변경 {formatDate(updatedAt)}
        </p>
      )}
    </section>
  );
}

function PasswordSection({
  slug,
  minLength,
}: {
  slug: string;
  minLength: number;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const updatePassword = trpc.familyRoom.updatePassword.useMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setDone(false);

    if (password !== confirmPassword) {
      setMessage("두 비밀번호가 서로 다릅니다.");
      return;
    }

    try {
      await updatePassword.mutateAsync({ memorialSlug: slug, password });
      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        비밀번호 바꾸기
      </h2>
      <p className="mt-4 text-base leading-7 text-[#616161]">
        새 비밀번호를 정하면 예전 비밀번호는 바로 쓸 수 없게 됩니다. 바꾸신
        뒤에는 가족들에게 새 비밀번호를 알려 주세요.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <PasswordFields
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={value => {
            setPassword(value);
            setDone(false);
          }}
          onConfirmChange={value => {
            setConfirmPassword(value);
            setDone(false);
          }}
          minLength={minLength}
          label="새 비밀번호"
        />

        {message && <p className={errorClass}>{message}</p>}
        {done && (
          <p role="status" className="text-sm leading-6 text-[#2f6f4f]">
            비밀번호를 바꿨습니다. 가족들에게 새 비밀번호를 알려 주세요.
          </p>
        )}

        <button
          type="submit"
          className={buttonClass}
          disabled={updatePassword.isPending}
        >
          {updatePassword.isPending ? "바꾸는 중" : "비밀번호 바꾸기"}
        </button>
      </form>
    </section>
  );
}

function InfoSection({
  slug,
  initialTitle,
  initialIntro,
  onSaved,
}: {
  slug: string;
  initialTitle: string;
  initialIntro: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [intro, setIntro] = useState(initialIntro);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const updateInfo = trpc.familyRoom.updateInfo.useMutation();

  // 저장한 내용을 다시 불러오면 화면의 값도 그 내용으로 맞춘다.
  useEffect(() => {
    setTitle(initialTitle);
    setIntro(initialIntro);
  }, [initialTitle, initialIntro]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setDone(false);

    try {
      await updateInfo.mutateAsync({ memorialSlug: slug, title, intro });
      setDone(true);
      onSaved();
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-[#e2e2e2] pb-3 text-lg font-medium text-[#121212]">
        제목과 소개글
      </h2>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className={labelClass}>제목</span>
          <input
            className={inputClass}
            value={title}
            onChange={event => {
              setTitle(event.target.value);
              setDone(false);
            }}
            maxLength={160}
            required
          />
        </label>

        <label className="block">
          <span className={labelClass}>소개글</span>
          <textarea
            className={textAreaClass}
            value={intro}
            onChange={event => {
              setIntro(event.target.value);
              setDone(false);
            }}
            maxLength={2000}
            required
          />
        </label>

        {message && <p className={errorClass}>{message}</p>}
        {done && (
          <p role="status" className="text-sm leading-6 text-[#2f6f4f]">
            저장했습니다.
          </p>
        )}

        <button
          type="submit"
          className={buttonClass}
          disabled={updateInfo.isPending}
        >
          {updateInfo.isPending ? "저장 중" : "저장"}
        </button>
      </form>
    </section>
  );
}

function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  minLength,
  label = "비밀번호",
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  minLength: number;
  label?: string;
}) {
  return (
    <>
      <label className="block">
        <span className={labelClass}>{label}</span>
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={event => onPasswordChange(event.target.value)}
          minLength={minLength}
          maxLength={100}
          required
          placeholder={`${minLength}자 이상`}
          autoComplete="new-password"
        />
        <span className="mt-2 block text-xs text-[#8a8a8a]">
          가족들이 함께 쓰고 기억해야 하므로 {minLength}자 이상이면 됩니다.
        </span>
      </label>

      <label className="block">
        <span className={labelClass}>{label} 확인</span>
        <input
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={event => onConfirmChange(event.target.value)}
          minLength={minLength}
          maxLength={100}
          required
          placeholder="한 번 더 입력"
          autoComplete="new-password"
        />
      </label>
    </>
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
