/**
 * Accessibility tests for QuestionCard using axe-core.
 *
 * Validates: Requirements 20.1, 20.3, 20.7, 20.8
 * Feature: exam-lobby-admin-panel
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import axeCore from "axe-core";
import type { AxeResults } from "axe-core";
import { QuestionCard } from "./QuestionCard";
import type { QuestionCardQuestion } from "./QuestionCard";

afterEach(() => cleanup());

// ── Helper ─────────────────────────────────────────────────────────────────

function runAxe(container: Element): Promise<AxeResults> {
  return new Promise((resolve, reject) =>
    axeCore.run(container, {}, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    })
  );
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const sampleQuestion: QuestionCardQuestion = {
  id: "q-1",
  text: "Which data structure is used for LIFO operations?",
  options: ["Queue", "Stack", "Tree", "Heap"],
  marks: 2,
  order: 1,
};

const noop = () => {};

// ── axe-core zero-violations tests ────────────────────────────────────────

describe("QuestionCard — axe-core accessibility", () => {
  it("has no axe violations when no answer is selected", async () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("has no axe violations when an answer is selected", async () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={1}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("has no axe violations when question is marked for review", async () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={true}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ── ARIA role / attribute tests ────────────────────────────────────────────

describe("QuestionCard — ARIA roles and attributes", () => {
  it("renders role='radiogroup' on the options container", () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();
  });

  it("renders role='radio' on every answer option", () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const radioButtons = container.querySelectorAll('[role="radio"]');
    expect(radioButtons).toHaveLength(sampleQuestion.options.length);
  });

  it("sets aria-checked='false' on all options when nothing is selected", () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const radios = Array.from(container.querySelectorAll('[role="radio"]'));
    radios.forEach((radio) => {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    });
  });

  it("sets aria-checked='true' only on the selected option", () => {
    const selectedIndex = 2;
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={selectedIndex}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const radios = Array.from(container.querySelectorAll('[role="radio"]'));
    radios.forEach((radio, index) => {
      const expected = index === selectedIndex ? "true" : "false";
      expect(radio.getAttribute("aria-checked")).toBe(expected);
    });
  });

  it("updates the live-region text when an option is selected", () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={1}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    // Should contain the selected option text
    expect(liveRegion!.textContent).toContain("Stack");
  });

  it("live-region is empty when no option is selected", () => {
    const { container } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toBe("");
  });

  it("mark-for-review button has correct aria-pressed attribute", () => {
    const { container, rerender } = render(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={false}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    const reviewBtn = container.querySelector('[aria-pressed]');
    expect(reviewBtn?.getAttribute("aria-pressed")).toBe("false");

    rerender(
      <QuestionCard
        question={sampleQuestion}
        selectedOptionIndex={null}
        isMarkedForReview={true}
        onSelectOption={noop}
        onToggleReview={noop}
        totalQuestions={5}
      />
    );

    expect(reviewBtn?.getAttribute("aria-pressed")).toBe("true");
  });
});
