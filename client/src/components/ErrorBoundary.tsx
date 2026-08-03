import { clearBrowserKioskAccessStorage } from "@/hooks/useKioskIdleReset";
import { cn } from "@/lib/utils";
import { AlertTriangle, House, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private goToStart = () => {
    const isKiosk = window.location.pathname.startsWith("/kiosk");

    if (isKiosk) {
      try {
        clearBrowserKioskAccessStorage();
      } catch {
        // Navigation still recovers the kiosk if browser storage is unavailable.
      }
    }

    window.location.assign(isKiosk ? "/kiosk" : "/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="flex w-full max-w-2xl flex-col items-center p-8 text-center">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="mb-3 text-2xl font-semibold">
              화면을 표시하는 중 문제가 생겼습니다.
            </h2>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              잠시 후 다시 불러오거나 처음 화면으로 돌아가 주세요.
            </p>

            {import.meta.env.DEV && this.state.error?.stack && (
              <div className="mb-6 mt-6 w-full overflow-auto rounded bg-muted p-4 text-left">
                <pre className="whitespace-break-spaces text-sm text-muted-foreground">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center gap-2 px-5",
                  "bg-primary text-primary-foreground",
                  "cursor-pointer hover:opacity-90"
                )}
              >
                <RotateCcw size={18} />
                다시 불러오기
              </button>
              <button
                type="button"
                onClick={this.goToStart}
                className="flex h-14 flex-1 items-center justify-center gap-2 border border-border bg-background px-5 text-foreground hover:bg-muted"
              >
                <House size={18} />
                처음 화면으로
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
