export function getLoginMode(search: string): "login" | "signup" {
  // Returning members should not be sent back into sign-up by their destination.
  return new URLSearchParams(search).get("mode") === "signup"
    ? "signup"
    : "login";
}
