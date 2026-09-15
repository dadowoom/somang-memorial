import { useAuth } from "@/_core/hooks/useAuth";
import AdminNavigation from "@/components/admin/AdminNavigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { compressImageFile } from "@/lib/imageCompression";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  MonitorPlay,
  Trash2,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";

type AdminKioskPoster = {
  id: number;
  imageUrl: string;
  caption: string | null;
  displaySeconds: number;
  sortOrder: number;
  isActive: number;
};

const SECOND_CHOICES = [3, 5, 8, 10, 12, 15, 20, 30];

const serifStyle = { fontFamily: "'Noto Serif KR', serif" } as const;

export default function AdminKioskPosters() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();

  const postersQuery = trpc.kioskPoster.adminList.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const refresh = async () => {
    await Promise.all([
      utils.kioskPoster.adminList.invalidate(),
      utils.kioskPoster.list.invalidate(),
    ]);
  };

  const createPoster = trpc.kioskPoster.create.useMutation({
    onSuccess: refresh,
  });
  const updatePoster = trpc.kioskPoster.update.useMutation({
    onSuccess: refresh,
  });
  const deletePoster = trpc.kioskPoster.delete.useMutation({
    onSuccess: refresh,
  });

  const posters = (postersQuery.data ?? []) as AdminKioskPoster[];
  const activeCount = posters.filter(poster => poster.isActive === 1).length;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setMessage("");
    let added = 0;

    for (const file of files) {
      try {
        const compressed = await compressImageFile(file);
        await createPoster.mutateAsync({
          dataUrl: compressed.dataUrl,
          fileName: compressed.fileName,
          displaySeconds: 8,
        });
        added += 1;
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
      }
    }

    setBusy(false);
    if (added > 0) {
      setMessage(`${added}장을 추가했습니다. 키오스크에 바로 나옵니다.`);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= posters.length) return;

    const reordered = [...posters];
    const moved = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = moved;

    setBusy(true);
    setMessage("");
    try {
      // 1 번부터 다시 매긴다. 옛 자료의 순서가 겹쳐 있어도 정리된다.
      for (let position = 0; position < reordered.length; position += 1) {
        const poster = reordered[position];
        if (poster.sortOrder !== position + 1) {
          await updatePoster.mutateAsync({
            id: poster.id,
            sortOrder: position + 1,
          });
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "순서를 바꾸지 못했습니다."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(poster: AdminKioskPoster) {
    setMessage("");
    try {
      await updatePoster.mutateAsync({
        id: poster.id,
        isActive: poster.isActive !== 1,
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "상태를 바꾸지 못했습니다."
      );
    }
  }

  async function changeSeconds(poster: AdminKioskPoster, seconds: number) {
    setMessage("");
    try {
      await updatePoster.mutateAsync({
        id: poster.id,
        displaySeconds: seconds,
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "시간을 바꾸지 못했습니다."
      );
    }
  }

  async function remove(poster: AdminKioskPoster) {
    if (
      !window.confirm(
        "이 광고를 지울까요? 키오스크에서 바로 사라집니다. 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    setMessage("");
    try {
      await deletePoster.mutateAsync({ id: poster.id });
      setMessage("광고 한 장을 지웠습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "지우지 못했습니다.");
    }
  }

  if (loading) {
    return <StateScreen text="관리자 권한을 확인하고 있습니다." />;
  }

  if (user?.role !== "admin") {
    return <StateScreen text="관리자만 접근할 수 있습니다." />;
  }

  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />

      <main className="pt-16 lg:pl-60">
        <AdminNavigation />

        <section className="border-b border-[#b5b0a7]">
          <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:items-end">
            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#616161]">
                Kiosk Attract
              </p>
              <h1
                className="break-keep text-4xl font-normal leading-tight [overflow-wrap:anywhere] md:text-5xl"
                style={serifStyle}
              >
                키오스크 광고 화면
              </h1>
              <p className="mt-6 max-w-xl break-keep text-sm leading-7 text-[#616161] [overflow-wrap:anywhere]">
                아무도 만지지 않을 때 키오스크에 뜨는 화면입니다. 여기에 올린
                사진이 화면 가득 차례로 바뀌고, 방문하신 분이 화면을 터치하면
                성함 검색 화면으로 넘어갑니다. 검색 화면에서 한동안 손대지
                않으면 다시 이 광고로 돌아옵니다.
              </p>
            </div>

            <aside className="border border-[#b5b0a7] bg-[#f7f7f7] p-6">
              <MonitorPlay
                className="h-5 w-5 text-[#121212]"
                strokeWidth={1.5}
              />
              <p className="mt-4 text-sm font-medium text-[#121212]">
                지금 키오스크에 나오는 광고 {activeCount}장
              </p>
              <p className="mt-2 break-keep text-xs leading-5 text-[#616161] [overflow-wrap:anywhere]">
                올린 사진이 한 장도 없으면 키오스크는 지금처럼 검색 화면부터
                보여 줍니다. 세로 화면(9:16)으로 만든 사진이 가장 잘 맞습니다.
              </p>
            </aside>
          </div>
        </section>

        <section className="container py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#b5b0a7] pb-4">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <ImagePlus className="h-4 w-4" strokeWidth={1.8} />
              광고 사진
            </h2>
            <span className="text-sm text-[#616161]">{posters.length}장</span>
          </div>

          <label
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[#b5b0a7] bg-[#fafafa] px-6 py-10 text-center transition-colors hover:bg-white ${
              busy ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <ImagePlus className="h-6 w-6 text-[#616161]" strokeWidth={1.6} />
            <span className="text-sm font-medium text-[#121212]">
              {busy ? "올리는 중입니다" : "사진 고르기 (여러 장 가능)"}
            </span>
            <span className="text-xs text-[#777]">
              JPG · PNG · WEBP · 한 장당 20MB까지
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={handleFiles}
              className="sr-only"
            />
          </label>

          {message && (
            <p className="mt-4 break-keep text-sm text-[#454545] [overflow-wrap:anywhere]">
              {message}
            </p>
          )}

          {postersQuery.isLoading ? (
            <Panel text="광고 사진을 불러오고 있습니다." />
          ) : posters.length === 0 ? (
            <Panel text="아직 올린 광고가 없습니다. 위에서 사진을 골라 주세요." />
          ) : (
            <div className="mt-8 divide-y divide-[#b5b0a7] border-y border-[#b5b0a7]">
              {posters.map((poster, index) => (
                <article
                  key={poster.id}
                  className="flex flex-wrap items-center gap-5 py-5"
                >
                  <img
                    src={poster.imageUrl}
                    alt=""
                    className="h-28 w-16 shrink-0 border border-[#b5b0a7] bg-[#f2f2f2] object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {index + 1}번째로 나옵니다
                      <StatusBadge
                        label={poster.isActive === 1 ? "사용 중" : "중지"}
                        tone={poster.isActive === 1 ? "normal" : "muted"}
                      />
                    </p>
                    <p className="mt-2 break-all text-xs text-[#777]">
                      {poster.caption || poster.imageUrl}
                    </p>

                    <label className="mt-3 flex items-center gap-2 text-xs text-[#616161]">
                      한 장을 보여 줄 시간
                      <select
                        value={poster.displaySeconds}
                        disabled={busy}
                        onChange={event =>
                          changeSeconds(poster, Number(event.target.value))
                        }
                        className="h-9 border border-[#b5b0a7] bg-white px-2 text-sm text-[#121212]"
                      >
                        {SECOND_CHOICES.map(seconds => (
                          <option key={seconds} value={seconds}>
                            {seconds}초
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <IconButton
                      label="위로"
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                      icon={<ArrowUp className="h-4 w-4" />}
                    />
                    <IconButton
                      label="아래로"
                      disabled={busy || index === posters.length - 1}
                      onClick={() => move(index, 1)}
                      icon={<ArrowDown className="h-4 w-4" />}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleActive(poster)}
                      className="inline-flex h-9 items-center gap-2 border border-[#18181b] px-3 text-sm transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {poster.isActive === 1 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {poster.isActive === 1 ? "중지" : "사용"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(poster)}
                      className="inline-flex h-9 items-center gap-2 border border-[#b5b0a7] px-3 text-sm text-[#9f2a2a] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center border border-[#b5b0a7] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "normal" | "muted";
}) {
  return (
    <span
      className={`inline-flex w-fit items-center border px-2 py-1 text-xs ${
        tone === "normal"
          ? "border-[#18181b] text-[#121212]"
          : "border-[#b5b0a7] text-[#616161]"
      }`}
    >
      {label}
    </span>
  );
}

function Panel({ text }: { text: string }) {
  return (
    <div className="mt-8 border border-[#b5b0a7] py-16 text-center">
      <p className="text-sm text-[#616161]">{text}</p>
    </div>
  );
}

function StateScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-white text-[#121212]">
      <Navbar />
      <main className="container pt-32">
        <Panel text={text} />
      </main>
    </div>
  );
}
