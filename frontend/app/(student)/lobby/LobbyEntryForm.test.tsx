/**
 * Unit tests for LobbyEntryForm validation rendering.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import React from "react";

// ---------- Module mocks ----------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockLogin = vi.fn();
const mockGetLobby = vi.fn();

vi.mock("@/lib/api/endpoints", () => ({
  authApi: { login: (...args: unknown[]) => mockLogin(...args) },
  testsApi: { getLobby: (...args: unknown[]) => mockGetLobby(...args) },
}));

vi.mock("@/lib/api/client", () => ({
  setAuthToken: vi.fn(),
}));

// ---------- Component import (after mocks) ----------

import LobbyEntryForm from "./LobbyEntryForm";

// ---------- Helpers ----------

function renderForm() {
  const result = render(<LobbyEntryForm />);
  // Return query helpers scoped to this render's container
  const container = result.container;
  return {
    ...result,
    getUsername: () =>
      within(container).getByLabelText(/username/i),
    getCode: () =>
      within(container).getByLabelText(/test code/i),
    getSubmit: () =>
      within(container).getByRole("button", { name: /enter lobby/i }),
    queryByText: (pattern: RegExp) =>
      within(container).queryByText(pattern),
    findByText: (pattern: RegExp) =>
      within(container).findByText(pattern),
    getByText: (pattern: RegExp) =>
      within(container).getByText(pattern),
  };
}

// ---------- Tests ----------

describe("LobbyEntryForm — validation rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows both field errors when username and code are empty on submit (Requirement 1.2, 1.3, 1.4)", async () => {
    const { getSubmit, findByText } = renderForm();

    fireEvent.click(getSubmit());

    await findByText(/username is required/i);
    await findByText(/test code is required/i);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("does NOT call authApi.login when either field is invalid (Requirement 1.2)", async () => {
    const { getSubmit, findByText } = renderForm();

    fireEvent.click(getSubmit());

    await findByText(/username is required/i);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("calls authApi.login when both fields have valid values (Requirement 1.2, 1.5)", async () => {
    mockLogin.mockResolvedValue({
      success: true,
      data: { token: "tok", user: { role: "student" } },
    });
    mockGetLobby.mockResolvedValue({ success: true, data: {} });

    const { getUsername, getCode, getSubmit, queryByText } = renderForm();

    fireEvent.change(getUsername(), { target: { value: "alice" } });
    fireEvent.change(getCode(), { target: { value: "EXAM2026" } });
    fireEvent.click(getSubmit());

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("alice");
    });

    expect(queryByText(/is required/i)).not.toBeInTheDocument();
  });

  it("shows usernameError (not codeError) when username is only whitespace (Requirement 1.3)", async () => {
    const { getUsername, getCode, getSubmit, findByText, queryByText } = renderForm();

    fireEvent.change(getUsername(), { target: { value: "   " } });
    fireEvent.change(getCode(), { target: { value: "EXAM01" } });
    fireEvent.click(getSubmit());

    await findByText(/username is required/i);

    expect(queryByText(/test code is required/i)).not.toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows codeError (not usernameError) when code is only whitespace (Requirement 1.4)", async () => {
    const { getUsername, getCode, getSubmit, findByText, queryByText } = renderForm();

    fireEvent.change(getUsername(), { target: { value: "alice" } });
    fireEvent.change(getCode(), { target: { value: "   " } });
    fireEvent.click(getSubmit());

    await findByText(/test code is required/i);

    expect(queryByText(/username is required/i)).not.toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows usernameError when username exceeds 100 characters (Requirement 1.9)", async () => {
    const { getUsername, getCode, getSubmit, findByText } = renderForm();

    fireEvent.change(getUsername(), { target: { value: "a".repeat(101) } });
    fireEvent.change(getCode(), { target: { value: "EXAM01" } });
    fireEvent.click(getSubmit());

    await findByText(/username must be 100 characters or fewer/i);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows codeError when test code exceeds 50 characters (Requirement 1.9)", async () => {
    const { getUsername, getCode, getSubmit, findByText } = renderForm();

    fireEvent.change(getUsername(), { target: { value: "alice" } });
    fireEvent.change(getCode(), { target: { value: "X".repeat(51) } });
    fireEvent.click(getSubmit());

    await findByText(/test code must be 50 characters or fewer/i);

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("does NOT call authApi.login when username is missing but code is filled (Requirement 1.2)", async () => {
    const { getCode, getSubmit, findByText } = renderForm();

    fireEvent.change(getCode(), { target: { value: "EXAM01" } });
    fireEvent.click(getSubmit());

    await findByText(/username is required/i);

    expect(mockLogin).not.toHaveBeenCalled();
  });
});
