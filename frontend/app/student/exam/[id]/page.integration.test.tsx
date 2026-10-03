/**
 * Integration tests for exam submission flow.
 * Requirements: 15.1, 17.x
 */

import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// next/navigation
const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "att_test1_user1" }),
  useRouter: () => ({ replace: mockRouterReplace }),
}));

// Mock session with 2 questions (for navigation test)
const mockSession2Q = {
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
      totalMarks: 10,
      correctCount: null,
      answeredCount: null,
    },
    test: { title: "Test Exam", duration: 60, totalMarks: 10 },
    questions: [
      { id: "q1", text: "Question 1", options: ["A", "B", "C", "D"], marks: 1, order: 1 },
      { id: "q2", text: "Question 2", options: ["A", "B", "C", "D"], marks: 1, order: 2 },
    ],
    answers: {},
    remainingMs: 600000,
    serverTime: "2024-01-01T00:00:00Z",
  },
};

// Mock session with 1 question (Submit button appears immediately)
const mockSession1Q = {
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
      totalMarks: 10,
      correctCount: null,
      answeredCount: null,
    },
    test: { title: "Test Exam", duration: 60, totalMarks: 10 },
    questions: [
      { id: "q1", text: "Only Question", options: ["A", "B", "C", "D"], marks: 1, order: 1 },
    ],
    answers: {},
    remainingMs: 600000,
    serverTime: "2024-01-01T00:00:00Z",
  },
};

// Successful submit result
const mockSubmitResult = {
  success: true,
  data: {
    attempt: {
      id: "att1",
      testTitle: "Test Exam",
      status: "graded",
      score: 8,
      totalMarks: 10,
      correctCount: 4,
      answeredCount: 5,
      startedAt: "2024-01-01T00:00:00Z",
      endsAt: "2024-01-01T01:00:00Z",
      submittedAt: "2024-01-01T00:30:00Z",
    },
  },
};

// attemptsApi mock
const mockGetById = vi.fn();
const mockSaveAnswers = vi.fn().mockResolvedValue({ success: true });
const mockSubmit = vi.fn();

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

// SubmitConfirmationDialog — renders real interactive buttons
vi.mock("@/components/student/SubmitConfirmationDialog", () => ({
  SubmitConfirmationDialog: ({
    isOpen,
    onConfirm,
    onCancel,
    isSubmitting,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
  }) =>
    isOpen ? (
      <div data-testid="submit-dialog">
        <button
          type="button"
          data-testid="confirm-submit"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Confirm Submit"}
        </button>
        <button type="button" data-testid="cancel-submit" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// ── Import page after all mocks ───────────────────────────────────────────────
import ExamPage from "./page";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExamPage — integration: load session → submit exam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue(mockSubmitResult);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads session and shows the first question card", async () => {
    mockGetById.mockResolvedValue(mockSession2Q);

    render(<ExamPage />);

    await waitFor(() => {
      expect(screen.getByTestId("question-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Question 1")).toBeInTheDocument();
  });

  it("single-question session: shows Submit button immediately after load", async () => {
    mockGetById.mockResolvedValue(mockSession1Q);

    render(<ExamPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit exam/i })).toBeInTheDocument();
    });
  });

  it("single-question session: full submit flow shows result screen", async () => {
    mockGetById.mockResolvedValue(mockSession1Q);

    render(<ExamPage />);

    // Wait for session to load — Submit Exam is immediately visible for 1-question exam
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit exam/i })).toBeInTheDocument();
    });

    // Click Submit Exam to open confirmation dialog
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    });

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByTestId("submit-dialog")).toBeInTheDocument();
    });

    // Confirm submission
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-submit"));
    });

    // Result screen should render after successful submit
    await waitFor(() => {
      expect(screen.getByText(/exam submitted/i)).toBeInTheDocument();
    });

    // Verify score details are displayed
    expect(screen.getByText(/8\s*\/\s*10/)).toBeInTheDocument();
    expect(screen.getByText(/test exam/i)).toBeInTheDocument();
  });

  it("calls attemptsApi.submit with the correct attemptId", async () => {
    mockGetById.mockResolvedValue(mockSession1Q);

    render(<ExamPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit exam/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("submit-dialog")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-submit"));
    });

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        "att_test1_user1",
        expect.any(Array)
      );
    });
  });

  it("multi-question session: Next and Previous buttons are rendered correctly", async () => {
    mockGetById.mockResolvedValue(mockSession2Q);

    render(<ExamPage />);

    // Wait for question 1 to appear
    await waitFor(() => {
      expect(screen.getByText("Question 1")).toBeInTheDocument();
    });

    // On Q1: Previous is disabled, Next is enabled
    expect(screen.getByRole("button", { name: /previous question/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next question/i })).not.toBeDisabled();

    // Submit button should NOT appear on first question (has Next instead)
    expect(screen.queryByRole("button", { name: /submit exam/i })).not.toBeInTheDocument();
  });
});

describe("ExamPage — integration: redirect when attempt already submitted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects to /student/results when getById returns a non-session response", async () => {
    // Simulate an already-submitted attempt: response.data has no "questions" key
    mockGetById.mockResolvedValue({
      success: true,
      data: {
        id: "att_test1_user1",
        testTitle: "Test Exam",
        status: "graded",
        startedAt: "2024-01-01T00:00:00Z",
        endsAt: "2024-01-01T01:00:00Z",
        submittedAt: "2024-01-01T00:30:00Z",
        score: 8,
        totalMarks: 10,
        correctCount: 4,
        answeredCount: 5,
      },
    });

    render(<ExamPage />);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/student/results");
    });
  });
});
