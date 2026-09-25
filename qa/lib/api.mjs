// 시험 서버에 tRPC 요청을 보내는 작은 도우미. 로그인 쿠키를 사람(역할)마다 따로 들고 다닌다.
import zlib from "node:zlib";
import { BASE, requireFromRepo } from "./env.mjs";

const superjson = requireFromRepo("superjson");
const sj = superjson.default ?? superjson;

export class Api {
  constructor(label = "방문자", base = BASE) {
    this.label = label;
    this.base = base;
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  keepCookies(res) {
    const list = res.headers.getSetCookie?.() ?? [];
    for (const line of list) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some(a => /max-age=0\b/i.test(a) || /expires=thu, 01 jan 1970/i.test(a));
      if (!value || expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async raw(method, path, { input, headers = {} } = {}) {
    const url = new URL(`/api/trpc/${path}`, this.base);
    const init = { method, headers: { ...headers }, redirect: "manual" };
    if (this.cookies.size) init.headers.cookie = this.cookieHeader();
    if (method === "GET") {
      if (input !== undefined) url.searchParams.set("input", JSON.stringify(sj.serialize(input)));
    } else {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(input === undefined ? {} : sj.serialize(input));
    }
    const res = await fetch(url, init);
    this.keepCookies(res);
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { text };
    }
    let data;
    let error;
    if (body?.result?.data !== undefined) data = sj.deserialize(body.result.data);
    if (body?.error) {
      const e = body.error.json ?? body.error;
      error = { code: e?.data?.code ?? e?.code, message: e?.message, httpStatus: e?.data?.httpStatus };
    }
    return { status: res.status, data, error, text };
  }

  query(path, input) {
    return this.raw("GET", path, { input });
  }
  mutate(path, input) {
    return this.raw("POST", path, { input });
  }

  /** 성공해야 하는 요청. 실패하면 멈춘다. */
  async must(kind, path, input) {
    const r = kind === "q" ? await this.query(path, input) : await this.mutate(path, input);
    if (r.status !== 200) {
      throw new Error(`[${this.label}] ${path} 실패 ${r.status} ${r.error?.message ?? r.text.slice(0, 200)}`);
    }
    return r.data;
  }

  async login(account) {
    await this.must("m", "auth.login", { identifier: account.login, password: account.password });
    const me = await this.must("q", "auth.me");
    if (!me) throw new Error(`[${this.label}] 로그인 뒤에도 auth.me 가 비어 있음`);
    return me;
  }

  /** 브라우저에 넣을 쿠키 모양 */
  browserCookies() {
    const u = new URL(this.base);
    return [...this.cookies].map(([name, value]) => ({ name, value, domain: u.hostname, path: "/" }));
  }
}

/** 가짜 사진(단색 PNG). 사진 올리기 시험용. 색을 바꾸면 다른 파일이 된다. */
export function fakePngDataUrl(size = 32, rgb = [120, 140, 160]) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill(rgb).flat())]);
  const raw = Buffer.concat(Array(size).fill(row));
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 색 깊이
  ihdr[9] = 2; // RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}
