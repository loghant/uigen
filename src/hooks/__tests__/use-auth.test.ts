import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- signIn ---

describe("signIn", () => {
  test("calls signInAction and returns the result", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let response: unknown;

    await act(async () => {
      response = await result.current.signIn("test@example.com", "password");
    });

    expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password");
    expect(response).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to true while in progress", async () => {
    let resolveSignIn: (v: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((r) => {
        resolveSignIn = r;
      })
    );

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signIn("a@b.com", "pw");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn!({ success: false });
      await promise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("sets isLoading back to false when signIn throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("navigates to anon work project on success with anon data", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/": { type: "directory" } },
    });
    mockCreateProject.mockResolvedValue({ id: "proj-anon-123" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hello" }],
        data: { "/": { type: "directory" } },
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-anon-123");
  });

  test("navigates to most recent project when no anon work", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([
      { id: "proj-recent" },
      { id: "proj-old" },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-recent");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("creates a new project when no anon work and no existing projects", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "proj-new-456" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [],
        data: {},
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/proj-new-456");
  });

  test("does not navigate when signIn fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Bad password" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
  });

  test("ignores anon work with empty messages array", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("test@example.com", "password");
    });

    // Should skip anon work and go to existing project
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-existing");
  });
});

// --- signUp ---

describe("signUp", () => {
  test("calls signUpAction and returns the result", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "proj-1" });

    const { result } = renderHook(() => useAuth());
    let response: unknown;

    await act(async () => {
      response = await result.current.signUp("new@example.com", "password123");
    });

    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
    expect(response).toEqual({ success: true });
  });

  test("navigates after successful signUp the same as signIn", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "make a button" }],
      fileSystemData: {},
    });
    mockCreateProject.mockResolvedValue({ id: "proj-from-signup" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "pw");
    });

    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-from-signup");
  });

  test("does not navigate when signUp fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

    const { result } = renderHook(() => useAuth());

    const response = await act(async () => {
      return await result.current.signUp("taken@example.com", "pw");
    });

    expect(response).toEqual({ success: false, error: "Email taken" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading back to false when signUp throws", async () => {
    mockSignUp.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});
