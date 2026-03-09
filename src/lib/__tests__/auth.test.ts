// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

// Mock cookies store
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock server-only to be a no-op
vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession signs a JWT and sets an httpOnly cookie", async () => {
  const { createSession } = await import("../auth");

  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();

  const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

  expect(cookieName).toBe("auth-token");

  expect(typeof token).toBe("string");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
  expect(payload.expiresAt).toBeDefined();

  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets cookie expiry to 7 days from now", async () => {
  const { createSession } = await import("../auth");
  const before = Date.now();

  await createSession("user-123", "test@example.com");

  const after = Date.now();
  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiryTime = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiryTime).toBeGreaterThanOrEqual(before + sevenDaysMs);
  expect(expiryTime).toBeLessThanOrEqual(after + sevenDaysMs);
});

// --- getSession ---

async function createValidToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({
    userId,
    email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

test("getSession returns payload for a valid token", async () => {
  const { getSession } = await import("../auth");
  const token = await createValidToken("user-456", "hello@example.com");

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-456");
  expect(session!.email).toBe("hello@example.com");
});

test("getSession returns null when no cookie exists", async () => {
  const { getSession } = await import("../auth");

  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  const { getSession } = await import("../auth");

  mockCookieStore.get.mockReturnValue({ value: "not-a-valid-jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a token signed with wrong secret", async () => {
  const { getSession } = await import("../auth");
  const wrongSecret = new TextEncoder().encode("wrong-secret");

  const token = await new SignJWT({ userId: "user-789", email: "bad@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const { getSession } = await import("../auth");

  const token = await new SignJWT({ userId: "user-old", email: "old@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(JWT_SECRET);

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession reads from the auth-token cookie", async () => {
  const { getSession } = await import("../auth");

  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();

  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});
