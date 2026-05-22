import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpenText,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

type FamilyRoom = {
  memorialId: number;
  memorialSlug: string;
  memorialName: string;
  memorialRole: string;
  church: string;
  title: string;
  intro: string;
  notes: Array<{
    title: string;
    body: string;
  }>;
};

type FamilyRoomStatus = {
  memorialId: number;
  memorialSlug: string;
  memorialName: string;
  enabled: boolean;
  href: string;
};

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;
const getMemorialAccessStorageKey = (slug: string) =>
  `somang.memorialAccess.${slug}`;
const readStoredAccessToken = (slug: string) => {
  if (!slug || typeof window === "undefined") return "";
  return sessionStorage.getItem(getMemorialAccessStorageKey(slug)) || "";
};

export default function MemorialFamilyPage() {
  const [, params] = useRoute<{ slug: string }>("/memorial/:slug/family");
  const slug = params?.slug ?? "";
  const [accessToken, setAccessToken] = useState(() =>
    readStoredAccessToken(slug)
  );
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<FamilyRoom | null>(null);

  const memorialQuery = trpc.memorial.bySlug.useQuery(
    { slug, accessToken: accessToken || undefined },
    { enabled: Boolean(slug), retry: false }
  );

  useEffect(() => {
    setAccessToken(readStoredAccessToken(slug));
  }, [slug]);

  const statusQuery = trpc.familyRoom.status.useQuery(
    { memorialSlug: slug },
    { enabled: Boolean(slug) }
  );
  const verifyMutation = trpc.familyRoom.verify.useMutation({
    onSuccess: data => {
      setRoom(data as FamilyRoom);
      setPassword("");
      setMessage("");
    },
    onError: error => setMessage(error.message),
  });

  const memorial = memorialQuery.data;
  const status = statusQuery.data as FamilyRoomStatus | undefined;
  const hasFamilyRoom = status?.enabled ?? false;

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setMessage("비밀번호를 입력해주세요.");
      return;
    }
    setMessage("");
    verifyMutation.mutate({ memorialSlug: slug, password: trimmed });
  };

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16">
        {room ? (
          <section className="border-b border-[#e6ded1] bg-white">
            <div className="container py-12 md:py-20">
              <Link href={`/memorial/${slug}/archive`}>
                <button className="mb-10 inline-flex h-10 items-center gap-2 border border-[#e6ded1] bg-white px-4 text-sm text-[#4f4638] transition-colors hover:bg-[#faf9f7]">
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
                  기념관으로 돌아가기
                </button>
              </Link>

              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:items-end">
                <div>
                  <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.28em] text-[#7f673d]">
                    Family Room
                  </p>
                  <h1
                    className="text-5xl font-light leading-tight md:text-7xl"
                    style={serifStyle}
                  >
                    가족관
                  </h1>
                  <p
                    className="mt-5 text-xl font-light text-[#7f673d]"
                    style={serifStyle}
                  >
                    {room.memorialName} {room.memorialRole}
                  </p>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-[#4f4f4f]">
                    비밀번호 확인이 완료되었습니다. 가족에게만 남기고 싶은
                    기억과 안부를 이 공간에서 조용히 이어갈 수 있습니다.
                  </p>
                </div>

                <div className="border border-[#e6ded1] bg-[#fbfaf8] p-6 md:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#1f1d1a] text-white">
                      <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#121212]">
                        가족 전용 공간
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[#6f6a61]">
                        공개 추모관과 분리된 비공개 기록 공간입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={room ? "py-14 md:py-20" : "py-12 md:py-20"}>
          <div className="container">
            {statusQuery.isLoading ? (
              <StateBlock text="가족관을 불러오고 있습니다." />
            ) : statusQuery.isError || !status ? (
              <StateBlock text="추모관을 찾을 수 없습니다." />
            ) : !hasFamilyRoom ? (
              <StateBlock text="아직 준비된 가족관이 없습니다." />
            ) : room ? (
              <UnlockedRoom room={room} />
            ) : (
              <PasswordGate
                memorialName={memorial?.name ?? status.memorialName}
                memorialRole={memorial?.role ?? ""}
                password={password}
                message={message}
                isPending={verifyMutation.isPending}
                onPasswordChange={setPassword}
                onSubmit={submitPassword}
                backHref={`/memorial/${slug}/archive`}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PasswordGate({
  memorialName,
  memorialRole,
  password,
  message,
  isPending,
  backHref,
  onPasswordChange,
  onSubmit,
}: {
  memorialName: string;
  memorialRole: string;
  password: string;
  message: string;
  isPending: boolean;
  backHref: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref}>
        <button className="mb-6 inline-flex h-10 items-center gap-2 border border-[#e6ded1] bg-white px-4 text-sm text-[#4f4638] transition-colors hover:bg-[#faf9f7]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
          기념관으로 돌아가기
        </button>
      </Link>

      <form
        onSubmit={onSubmit}
        className="border border-[#e6ded1] bg-white p-6 md:p-10"
      >
        <div className="mb-8 border-b border-[#e6ded1] pb-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center bg-[#1f1d1a] text-white">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#7f673d]">
            Private Family Room
          </p>
          <h1
            className="text-4xl font-light leading-tight md:text-6xl"
            style={serifStyle}
          >
            가족관
          </h1>
          <p className="mt-5 text-lg font-light text-[#7f673d]" style={serifStyle}>
            {memorialName} {memorialRole}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#6f6a61]">
            이 공간은 유족과 가족을 위한 비공개 공간입니다. 전달받은
            비밀번호를 입력한 뒤 들어갈 수 있습니다.
          </p>
        </div>

        <label className="mb-3 block text-sm font-medium text-[#4f4638]">
          가족관 비밀번호
        </label>
        <input
          value={password}
          onChange={event => onPasswordChange(event.target.value)}
          type="password"
          placeholder="비밀번호를 입력해주세요"
          autoFocus
          className="h-12 w-full border border-[#e6ded1] bg-white px-4 text-base outline-none transition-colors focus:border-[#1f1d1a]"
        />
        {message && (
          <p className="mt-3 text-sm text-red-500">{message}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#1f1d1a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#33302b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "확인 중" : "비밀번호 확인"}
          <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </form>
    </div>
  );
}

function UnlockedRoom({ room }: { room: FamilyRoom }) {
  const icons = [Users, BookOpenText, HeartHandshake];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border border-[#e6ded1] bg-[#fbfaf8] p-6 md:p-10">
        <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#7f673d]">
          Unlocked
        </p>
        <h2 className="text-3xl font-light md:text-5xl" style={serifStyle}>
          {room.title}
        </h2>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[#4f4f4f]">
          {room.intro}
        </p>
      </div>

      <div className="mt-6 grid gap-px bg-[#e6ded1] md:grid-cols-3">
        {room.notes.map((note, index) => {
          const Icon = icons[index] ?? BookOpenText;
          return (
            <article key={note.title} className="bg-white p-6 md:p-7">
              <div className="mb-8 flex h-10 w-10 items-center justify-center border border-[#e6ded1]">
                <Icon className="h-5 w-5 text-[#1f1d1a]" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-light" style={serifStyle}>
                {note.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#6f6a61]">{note.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StateBlock({ text }: { text: string }) {
  return (
    <div className="border border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
      {text}
    </div>
  );
}
