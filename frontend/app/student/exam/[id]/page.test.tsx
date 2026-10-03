/**
 * Unit tests for exam page state management.
 * Requirements: 15.x, 16.x, 17.x
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "att_test1_user1" }),
  useRouter: () => ({ replace: vi.fn() }),
}));

// Mock session data
const mockSession = {
  success: true,
  data: {
    resumed: false,
    attempt: {
      id: "att_test1_user1",
      testTitle: "Test Exam",
      status: "in_progress",
      startedAt: "2024-01-01T00:00:00Z",
      endsAt: "2024-01-01T01:00:00Z",
      submittedAt: null,
      score: null,
      totalMarks: 100,
      correctCount: null,
      answeredCount: null,
    },
    test: { title: "Test Exam", duration: 60, totalMarks: 100 },
    questions: [
      { id: "q1", text: "Question 1", options: ["A", "B", "C", "D"], marks: 1, order: 1 },
      { id: "q2", text: "Question 2", options: ["A", "B", "C", "D"], marks: 1, order: 2 },
    ],
    answers: {},
    remainingMs: 600000,
    serverTime: "2024-01-01T00:00:00Z",
  },
};

// attemptsApi mock — overridden per test
const mockGetById = vi.fn();
const mockSaveAnswers = vi.fn().mockResolvedValue({ success: true });
const mockSubmit = vi.fn().mockResolvedValue({ success: true, data: { attempt: null } });

vi.mock("@/lib/api/endpoints", () => ({
  attemptsApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    saveAnswers: (...args: unknown[]) => mockSaveAnswers(...args),
    submit: (...args: unknown[]) => mockSubmit(...args),
  },
}));

// useExamTimer
vi.mock("@/hooks/useExamTimer", () => ({
  useExamTimer: () => ({
    remainingMs: 600000,
    formattedTime: "00:10:00",
    colorState: "default" as const,
    isExpired: false,
  }),
}));

// useViolationDetector
vi.mock("@/hooks/useViolationDetector", () => ({
  useViolationDetector: vi.fn(),
}));

// UI components
vi.mock("@/components/ui/StickyTimerBar", () => ({
  StickyTimerBar: () => <div data-testid="sticky-timer-bar">00:10:00</div>,
}));

vi.mock("@/components/ui/FixedActionBar", () => ({
  FixedActionBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="fixed-action-bar">{children}</div>
  ),
}));

vi.mock("@/components/ui/FAB", () => ({
  FAB: () => <button data-testid="fab">Nav</button>,
}));

vi.mock("@/components/ui/ViolationOverlay", () => ({
  ViolationOverlay: () => null,
}));

vi.mock("@/components/student/QuestionCard", () => ({
  QuestionCard: ({ question }: { question: { text: string } }) => (
    <div data-testid="question-card">{question.text}</div>
  ),
}));

vi.mock("@/components/student/QuestionNavPanel", () => ({
  QuestionNavPanel: () => <div data-testid="question-nav-panel" />,
}));

vi.mock("@/components/student/SubmitConfirmationDialog", () => ({
  SubmitConfirmationDialog: () => null,
}));

// ── Import page after mocks ───────────────────────────────────────────────────
// Must be imported after all vi.mock calls so mocks are in place.
import ExamPage from "./page";
import { computeDialogCounts } from "@/lib/utils/exam";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state before session loads", () => {
    // Provide a promise that never resolves so the page stays in loading state
    mockGetById.mockReturnValue(new Promise(() => {}));

    render(<ExamPage />);

    expect(screen.getByText(/loading exam session/i)).toBeInTheDocument();
  });

  it("renders the sticky timer bar after session loads", async () => {
    mockGetById.mockResolvedValue(mockSession);

    const { container } = render(<ExamPage />);

    await waitFor(() => {
      expect(within(container).getByTestId("sticky-timer-bar")).toBeInTheDocument();
    });
  });

  it("shows the first question text after session loads", async () => {
    mockGetById.mockResolvedValue(mockSession);

    const { container } = render(<ExamPage />);

    await waitFor(() => {
      expect(within(container).getByText("Question 1")).toBeInTheDocument();
    });
  });

  it("Previous button is disabled on the first question", async () => {
    mockGetById.mockResolvedValue(mockSession);

    const { container } = render(<ExamPage />);

    // Wait for the session to load (question card appears)
    await waitFor(() => {
      expect(within(container).getByText("Question 1")).toBeInTheDocument();
    });

    const prevButton = within(container).getByRole("button", { name: /previous question/i });
    expect(prevButton).toBeDisabled();
  });

  it("Next button is enabled when not on the last question", async () => {
    mockGetById.mockResolvedValue(mockSession);

    const { container } = render(<ExamPage />);

    // Wait for the session to load (question card appears)
    await waitFor(() => {
      expect(within(container).getByText("Question 1")).toBeInTheDocument();
    });

    const nextButton = within(container).getByRole("button", { name: /next question/i });
    expect(nextButton).not.toBeDisabled();
  });
});

// ── computeDialogCounts direct tests ─────────────────────────────────────────

describe("computeDialogCounts", () => {
  it("correctly counts 2 questions: 1 answered, 1 unanswered, 1 marked", () => {
    const answers: Record<string, number | null> = {
      q1: 0,   // answered
      q2: null, // unanswered
    };
    const markedForReview = new Set(["q1"]);
    const totalQuestions = 2;

    const result = computeDialogCounts(answers, markedForReview, totalQuestions);

    expect(result.answeredCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.markedCount).toBe(1);
  });
});
