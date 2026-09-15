import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "./Navbar";
import Footer from "./Footer";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: vi.fn() }));

function renderNavigation(role?: "user" | "admin") {
  vi.mocked(useAuth).mockReturnValue({
    user: role ? { role, name: "가족 사용자" } : null,
    isAuthenticated: Boolean(role),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
  return renderToStaticMarkup(
    createElement(Router, { ssrPath: "/" }, createElement(Navbar))
  );
}

describe("public navigation account access", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("offers sign-in without showing signed-in account actions to guests", () => {
    const markup = renderNavigation();
    expect(markup).not.toContain('href="/login?redirect=/admin"');
    expect(markup).toContain('href="/login"');
    expect(markup).not.toContain('href="/my/account"');
    expect(markup).not.toContain("로그아웃");
    const footer = renderToStaticMarkup(
      createElement(Router, { ssrPath: "/" }, createElement(Footer))
    );
    expect(footer).toContain('href="/login?redirect=/admin"');
  });

  it("preserves account and memorial navigation without an admin link for members", () => {
    const markup = renderNavigation("user");
    expect(markup).toContain('href="/my/account"');
    expect(markup).toContain('href="/my/memorials"');
    expect(markup).toContain("로그아웃");
    expect(markup).not.toContain('href="/admin"');
  });

  it("keeps the administration entry available to administrators", () => {
    const markup = renderNavigation("admin");
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain('href="/my/account"');
    expect(markup).toContain("로그아웃");
  });
});
