import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Kiosk from "./pages/Kiosk";
import { KioskKeyboardProvider } from "./components/kiosk/KioskKeyboard";

// Kiosk routes stay in the first download. Less frequently used web and admin
// pages load only when opened, keeping the kiosk's first screen responsive.
const Home = lazy(() => import("./pages/Home"));
const MemorialCreate = lazy(() => import("./pages/MemorialCreate"));
const Letters = lazy(() => import("./pages/Letters"));
const Login = lazy(() => import("./pages/Login"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminMemorials = lazy(() => import("./pages/AdminMemorials"));
const AdminOperations = lazy(() => import("./pages/AdminOperations"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const MemorialSearch = lazy(() => import("./pages/MemorialSearch"));
const MemorialPublicDetail = lazy(() => import("./pages/MemorialPublicDetail"));
const SomangHill = lazy(() => import("./pages/SomangHill"));
const MemorialArchivePage = lazy(() => import("./pages/MemorialArchivePage"));
const MemorialFamilyPage = lazy(() => import("./pages/MemorialFamilyPage"));
const MemorialObituary = lazy(() => import("./pages/MemorialObituary"));
const MemorialEdit = lazy(() => import("./pages/MemorialEdit"));
const MyMemorials = lazy(() => import("./pages/MyMemorials"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const ParentFinder = lazy(() => import("./pages/ParentFinder"));
const NotFound = lazy(() => import("./pages/NotFound"));
const KioskMemorial = lazy(() => import("./pages/KioskMemorial"));

function KioskIndexRoute() {
  return (
    <KioskKeyboardProvider>
      <Kiosk />
    </KioskKeyboardProvider>
  );
}

function KioskMemorialRoute() {
  return (
    <KioskKeyboardProvider>
      <KioskMemorial />
    </KioskKeyboardProvider>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={Login} />
        <Route path={"/kiosk/memorial/:slug"} component={KioskMemorialRoute} />
        <Route path={"/kiosk"} component={KioskIndexRoute} />
        <Route path={"/admin/operations"} component={AdminOperations} />
        <Route path={"/admin/users"} component={AdminUsers} />
        <Route path={"/admin"} component={AdminMemorials} />
        <Route path={"/admin/memorials/:slug/edit"} component={MemorialEdit} />
        <Route path={"/my/account"} component={AccountSettings} />
        <Route path={"/my/memorials"} component={MyMemorials} />
        <Route path={"/my/find-parent"} component={ParentFinder} />
        <Route path={"/my/memorials/:slug/edit"} component={MemorialEdit} />
        <Route path={"/memorial/create"} component={MemorialCreate} />
        <Route path={"/letters"} component={Letters} />
        <Route path={"/memorial/search"} component={MemorialSearch} />
        <Route path={"/somang-hill"} component={SomangHill} />
        <Route path={"/memorial/:slug/archive"} component={MemorialArchivePage} />
        <Route path={"/memorial/:slug/family"} component={MemorialFamilyPage} />
        <Route path={"/memorial/:slug/obituary"} component={MemorialObituary} />
        <Route path={"/memorial/:slug"} component={MemorialPublicDetail} />
        <Route path={"/privacy"} component={PrivacyPolicy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
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

    window.requestAnimationFrame(() => {
      if (hash) {
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0 });
    });
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
          <ScrollToRouteTop />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
