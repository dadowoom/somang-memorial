export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getLoginUrl = (redirectTo?: string) => {
  const next =
    redirectTo ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");

  if (!next || next === "/" || next.startsWith("/login")) {
    return "/login";
  }

  return `/login?redirect=${encodeURIComponent(next)}`;
};
