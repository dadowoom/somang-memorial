import { trpc } from "@/lib/trpc";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const COMPLETE_REGISTRATION_CONFIRM =
  "등록을 마칠까요?\n\n마치면 정한 공개 범위대로 다른 분들이 이 추모관을 보고 편지를 남길 수 있습니다. 마친 뒤에도 글과 사진은 계속 고칠 수 있습니다.";

/**
 * "등록 완료하기" 단추 (2026-09-16 결정). 추모관은 "작성 중"으로 시작하고, 이
 * 단추를 눌러야 다른 분들이 보고 편지를 남길 수 있다. 서버: memorial.completeRegistration.
 */
export default function CompleteRegistrationButton({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const complete = trpc.memorial.completeRegistration.useMutation();
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (complete.isPending || done) return;
    if (!window.confirm(COMPLETE_REGISTRATION_CONFIRM)) return;
    setMessage("");
    try {
      await complete.mutateAsync({ slug });
      setDone(true);
      toast.success("등록을 마쳤습니다. 이제 다른 분들도 볼 수 있습니다.");
      await utils.invalidate();
    } catch (error) {
      setMessage(
        error instanceof Error &&
          error.message &&
          !error.message.trim().startsWith("[")
          ? error.message
          : "등록을 마치지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={complete.isPending || done}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#171717] px-5 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        {complete.isPending
          ? "등록을 마치는 중"
          : done
            ? "등록을 마쳤습니다"
            : "등록 완료하기"}
      </button>
      {message && (
        <p role="alert" className="mt-2 text-sm leading-6 text-[#9f2a2a]">
          {message}
        </p>
      )}
    </div>
  );
}
