import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Kiosk from "./pages/Kiosk";
// 추모관 화면도 첫 다운로드에 넣는다. 나중에 따로 받다가 회선이 끊기면 흰 화면이
// 됐다 (2026-09-14). 34KB 라 첫 화면에 부담이 없다.
import KioskMemorial from "./pages/KioskMemorial";
import KioskNotFound from "./pages/KioskNotFound";
import MemorialWritingSafety from "./components/memorial/MemorialWritingSafety";
import { KioskKeyboardProvider } from "./components/kiosk/KioskKeyboard";
import KioskConnectionBanner from "./components/kiosk/KioskConnectionBanner";
import KioskPortraitLock from "./components/kiosk/KioskPortraitLock";
import { useKioskDocumentMode } from "./hooks/useKioskDocumentMode";
import { markScreenRendered } from "./lib/chunkReload";
import "./pages/memberEditorial.css";

// Kiosk routes stay in the first download. Less frequently used web and admin
// pages load only when opened, keeping the kiosk's first screen responsive.
const Home = lazy(() => import("./pages/Home"));
const MemorialCreate = lazy(() => import("./pages/MemorialCreate"));
const Letters = lazy(() => import("./pages/Letters"));
const LifeGarden = lazy(() => import("./pages/LifeGarden"));
const Guide = lazy(() => import("./pages/Guide"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminMemorials = lazy(() => import("./pages/AdminMemorials"));
const AdminOperations = lazy(() => import("./pages/AdminOperations"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminKioskPosters = lazy(() => import("./pages/AdminKioskPosters"));
const AdminInterment = lazy(() => import("./pages/AdminInterment"));
const MemorialSearch = lazy(() => import("./pages/MemorialSearch"));
const MemorialPublicDetail = lazy(() => import("./pages/MemorialPublicDetail"));
const SomangHill = lazy(() => import("./pages/SomangHill"));
const MemorialArchivePage = lazy(() => import("./pages/MemorialArchivePage"));
const MemorialFamilyPage = lazy(() => import("./pages/MemorialFamilyPage"));
const MemorialObituary = lazy(() => import("./pages/MemorialObituary"));
const MemorialEdit = lazy(() => import("./pages/MemorialEdit"));
const MemorialFamilyManage = lazy(() => import("./pages/MemorialFamilyManage"));
const MemorialFamilyMembers = lazy(
  () => import("./pages/MemorialFamilyMembers")
);
const MemorialLetters = lazy(() => import("./pages/MemorialLetters"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const MyMemorials = lazy(() => import("./pages/MyMemorials"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const ParentFinder = lazy(() => import("./pages/ParentFinder"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 키오스크 화면은 세로 고정 상자로 감싼다 (2026-10-03). 창이 이미 세로이거나
// 설정이 꺼져 있으면 상자는 아무것도 하지 않는다.
function KioskIndexRoute() {
  useKioskDocumentMode();
  return (
    <KioskPortraitLock>
      <KioskKeyboardProvider>
        <KioskConnectionBanner />
        <Kiosk />
      </KioskKeyboardProvider>
    </KioskPortraitLock>
  );
}

function KioskMemorialRoute() {
  useKioskDocumentMode();
  return (
    <KioskPortraitLock>
      <KioskKeyboardProvider>
        <KioskConnectionBanner />
        <KioskMemorial />
      </KioskKeyboardProvider>
    </KioskPortraitLock>
  );
}

function KioskNotFoundRoute() {
  return (
    <KioskPortraitLock>
      <KioskNotFound />
    </KioskPortraitLock>
  );
}

function Router() {
  const [location] = useLocation();
  const memberPage =
    /^\/(login|forgot-password|reset-password|my|invite|letters|privacy|terms|memorial)(?:\/|$)/.test(location) &&
    !location.endsWith("/obituary");
  const routes = (
    <Suspense fallback={<RouteLoading />}>
      <ScreenRenderedSignal />
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={Login} />
        <Route path={"/kiosk/memorial/:slug"} component={KioskMemorialRoute} />
        <Route path={"/kiosk"} component={KioskIndexRoute} />
        {/* 잘못된 키오스크 주소는 일반 홈페이지의 404 로 새지 않게 키오스크 안에서 받는다. */}
        <Route path={"/kiosk/*"} component={KioskNotFoundRoute} />
        <Route path={"/admin/operations"} component={AdminOperations} />
        <Route path={"/admin/users"} component={AdminUsers} />
        <Route path={"/admin/kiosk"} component={AdminKioskPosters} />
        <Route path={"/admin/interment"} component={AdminInterment} />
        <Route path={"/admin"} component={AdminMemorials} />
        <Route path={"/admin/memorials/:slug/edit"} component={MemorialEdit} />
        <Route path={"/my/account"} component={AccountSettings} />
        <Route path={"/my/memorials"} component={MyMemorials} />
        <Route path={"/my/find-parent"} component={ParentFinder} />
        <Route path={"/my/memorials/:slug/edit"} component={MemorialEdit} />
        <Route
          path={"/my/memorials/:slug/family"}
          component={MemorialFamilyManage}
        />
        <Route
          path={"/my/memorials/:slug/family-members"}
          component={MemorialFamilyMembers}
        />
        <Route
          path={"/my/memorials/:slug/letters"}
          component={MemorialLetters}
        />
        <Route path={"/invite/:token"} component={InvitePage} />
        <Route path={"/memorial/create"} component={MemorialCreate} />
        <Route path={"/letters"} component={Letters} />
        <Route path={"/services/life-garden"} component={LifeGarden} />
        <Route path={"/guide"} component={Guide} />
        <Route path={"/memorial/search"} component={MemorialSearch} />
        <Route path={"/somang-hill"} component={SomangHill} />
        <Route path={"/memorial/:slug/archive"} component={MemorialArchivePage} />
        <Route path={"/memorial/:slug/family"} component={MemorialFamilyPage} />
        <Route path={"/memorial/:slug/obituary"} component={MemorialObituary} />
        <Route path={"/memorial/:slug"} component={MemorialPublicDetail} />
        <Route path={"/privacy"} component={PrivacyPolicy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/forgot-password"} component={ForgotPassword} />
        <Route path={"/reset-password"} component={ResetPassword} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
  return memberPage ? (
    <div className="member-editorial">{routes}</div>
  ) : routes;
}

/**
 * 화면이 실제로 그려졌다고 알린다 (2026-10-07). 위 Suspense 안에 두었으므로 늦게 받는
 * 화면 조각까지 다 받아 그려진 뒤에만 불린다. 조각을 못 받아 오류 화면이 되면 불리지 않는다.
 * 조각 파일 새로고침의 반복 방지 표시는 이 알림 뒤에만 지운다 (lib/chunkReload.ts).
 */
function ScreenRenderedSignal() {
  useEffect(() => {
    markScreenRendered();
  }, []);
  return null;
}

function RouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-sm text-[#616161]">
      화면을 불러오는 중입니다.
    </main>
  );
}

function ScrollToRouteTop() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");

    if (!hash) {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
      return;
    }

    // 추모관 자료는 서버에서 받아온 뒤에 그려지므로, 페이지가 열리는 순간에는
    // #gallery 같은 대상이 아직 없을 수 있다. 잠시 기다렸다가 생기면 그때 간다.
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(hash);
      tries += 1;
      if (target) {
        target.scrollIntoView({ block: "start" });
        window.clearInterval(timer);
      } else if (tries >= 40) {
        window.clearInterval(timer);
      }
    }, 75);

    return () => window.clearInterval(timer);
  }, [location]);

  return null;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <MemorialWritingSafety />
          <ScrollToRouteTop />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
