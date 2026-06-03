import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MemorialDemo from "./pages/MemorialDemo";
import MemorialCreate from "./pages/MemorialCreate";
import HomeWarm from "./pages/HomeWarm";
import Letters from "./pages/Letters";
import Login from "./pages/Login";
import AdminMemorials from "./pages/AdminMemorials";
import AdminOperations from "./pages/AdminOperations";
import MemorialSearch from "./pages/MemorialSearch";
import MemorialDark from "./pages/MemorialDark";
import MemorialPublicDetail from "./pages/MemorialPublicDetail";
import SomangHill from "./pages/SomangHill";
import MemorialArchivePage from "./pages/MemorialArchivePage";
import MemorialFamilyPage from "./pages/MemorialFamilyPage";
import MemorialEdit from "./pages/MemorialEdit";
import MyMemorials from "./pages/MyMemorials";
import Kiosk from "./pages/Kiosk";
import KioskMemorial from "./pages/KioskMemorial";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/kiosk/memorial/:slug"} component={KioskMemorial} />
      <Route path={"/kiosk"} component={Kiosk} />
      <Route path={"/admin/operations"} component={AdminOperations} />
      <Route path={"/admin"} component={AdminMemorials} />
      <Route path={"/admin/memorials/:slug/edit"} component={MemorialEdit} />
      <Route path={"/my/memorials"} component={MyMemorials} />
      <Route path={"/my/memorials/:slug/edit"} component={MemorialEdit} />
      <Route path={"/memorial/demo"} component={MemorialDemo} />
      <Route path={"/memorial/create"} component={MemorialCreate} />
      <Route path={"/memorial/warm"} component={HomeWarm} />
      <Route path={"/letters"} component={Letters} />
      <Route path={"/memorial/search"} component={MemorialSearch} />
      <Route path={"/memorial/dark"} component={MemorialDark} />
      <Route path={"/somang-hill"} component={SomangHill} />
      <Route path={"/memorial/:slug/archive"} component={MemorialArchivePage} />
      <Route path={"/memorial/:slug/family"} component={MemorialFamilyPage} />
      <Route path={"/memorial/:slug"} component={MemorialPublicDetail} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
