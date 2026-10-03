/**
 * Unit tests for LobbyScreen state transitions.
 *
 * Validates: Requirements 2.1–2.11, 3.1–3.6
 *
 * `useLobbyPolling` is mocked so every test controls lobby state directly
 * without real timers or network calls.
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Prevent real API calls
vi.mock("@/lib/api/endpoints", () => ({
  testsApi: {
    getLobby: vi.fn(),
  },
}));

// Pass-through wrapper — renders children without the fixed positioning that
// would interfere with JSDOM layout queries.
vi.mock("@/components/ui/FixedActionBar", () => ({
  FixedActionBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="fixed-action-bar">{children}</div>
  ),
}));

// Control lobby state directly in each test.
const mockUseLobbyPolling = vi.fn();
vi.mock("@/hooks/useLobbyPolling", () => ({
  useLobbyPolling: (opts: unknown) => mockUseLobbyPolling(opts),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import LobbyScreen from "./LobbyScreen";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const TEST_CODE = "ABC123";
const ON_START_EXAM = vi.fn();

const baseTest = {
  title: "Sample Exam",
  description: "A test for unit testing purposes.",
  duration: 60,
  totalMarks: 100,
  questionCount: 20,
  status: "active" as const,
};

const baseAttempt = {
  id: "attempt-001",
  testTitle: "Sample Exam",
  status: "in_progress" as const,
  startedAt: "2025-01-01T10:00:00Z",
  endsAt: "2025-01-01T11:00:00Z",
  submittedAt: null,
  score: null,
  totalMarks: 100,
  correctCount: null,
  answeredCount: null,
};

function renderLobbyScreen() {
  return render(<LobbyScreen code={TEST_CODE} onStartExam={ON_START_EXAM} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LobbyScreen", () => {
  beforeEach(() => {
    ON_START_EXAM.mockClear();
    mockUseLobbyPolling.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 1. Loading state ──────────────────────────────────────────────────────

  it("renders a loading/spinner indicator when isLoading=true and no lobbyState yet", () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: null,
      error: null,
      isLoading: true,
      isDegraded: false,
    });

    renderLobbyScreen();

    // The spinner has role="status" and aria-label="Loading"
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });

  // ── 2. "waiting" state ────────────────────────────────────────────────────

  it('renders the test title and waiting message when state is "waiting"', () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: { state: "waiting", test: baseTest, attempt: null },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    expect(screen.getByText("Sample Exam")).toBeInTheDocument();
    expect(
      screen.getByText(/waiting for the exam to start/i)
    ).toBeInTheDocument();
  });

  // ── 3. "ready" state — initial render ─────────────────────────────────────

  it('renders test title, 3 unchecked checkboxes, and a disabled Start Exam button when state is "ready"', () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: {
        state: "ready",
        test: baseTest,
        attempt: { ...baseAttempt, status: "in_progress" as const },
      },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    // Test title appears in TestMetaSummary
    expect(screen.getByText("Sample Exam")).toBeInTheDocument();

    // 3 acknowledgment checkboxes, all unchecked
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());

    // When not all boxes are checked the button reads "Check all 3 boxes to continue"
    // and is disabled.
    const button = screen.getByRole("button", { name: /check all 3 boxes/i });
    expect(button).toBeDisabled();
  });

  // ── 4. "ready" state — checking all boxes enables Start Exam ─────────────

  it("enables the Start Exam button after all 3 checkboxes are checked", () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: {
        state: "ready",
        test: baseTest,
        attempt: { ...baseAttempt, status: "in_progress" as const },
      },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => fireEvent.click(cb));

    const button = screen.getByRole("button", { name: /start exam/i });
    expect(button).not.toBeDisabled();
  });

  // ── 5. "in_progress" state ────────────────────────────────────────────────

  it('shows "Exam is already in progress" and a Resume button when state is "in_progress"', () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: {
        state: "in_progress",
        test: baseTest,
        attempt: baseAttempt,
      },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    expect(
      screen.getByText(/exam is already in progress/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resume exam/i })
    ).toBeInTheDocument();
  });

  // ── 6. "finished" state ───────────────────────────────────────────────────

  it('shows "You have completed this exam" when state is "finished"', () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: {
        state: "finished",
        test: baseTest,
        attempt: {
          ...baseAttempt,
          status: "graded" as const,
          score: 80,
          correctCount: 16,
          answeredCount: 20,
          submittedAt: "2025-01-01T10:50:00Z",
        },
      },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    expect(
      screen.getByText(/you have completed this exam/i)
    ).toBeInTheDocument();
  });

  // ── 7. "ended" state ──────────────────────────────────────────────────────

  it('shows "This exam has ended" when state is "ended"', () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: { state: "ended", test: baseTest, attempt: null },
      error: null,
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    expect(screen.getByText(/this exam has ended/i)).toBeInTheDocument();
  });

  // ── 8. Error state (no data) ──────────────────────────────────────────────

  it("shows the error message when there is an error and no lobbyState", () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: null,
      error: "Network error",
      isLoading: false,
      isDegraded: false,
    });

    renderLobbyScreen();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  // ── 9. Degraded connectivity banner ──────────────────────────────────────

  it("shows the degraded connection indicator when isDegraded=true", () => {
    mockUseLobbyPolling.mockReturnValue({
      lobbyState: { state: "waiting", test: baseTest, attempt: null },
      error: null,
      isLoading: false,
      isDegraded: true,
    });

    renderLobbyScreen();

    // The degraded banner uses aria-live="polite" and contains "Connection issues"
    expect(screen.getByText(/connection issues/i)).toBeInTheDocument();
  });
});
