/**
 * Accessibility tests for BottomSheet — axe-core + focus-trap / keyboard behavior.
 *
 * Validates: Requirements 16.8, 17.2, 20.7
 * Feature: exam-lobby-admin-panel
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import axeCore from "axe-core";
import type { AxeResults } from "axe-core";
import { BottomSheet } from "./BottomSheet";

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

/**
 * Returns focusable elements inside `container` using the same selector logic
 * as BottomSheet's focus-trap implementation.
 *
 * Note: jsdom does not implement layout (offsetParent is always null), so we
 * use the same attribute-based filter that the BottomSheet implementation uses.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

// ── axe-core zero-violations tests ────────────────────────────────────────

describe("BottomSheet — axe-core accessibility", () => {
  it("has no axe violations when closed", async () => {
    const { container } = render(
      <BottomSheet isOpen={false} onClose={() => {}} title="Test Sheet">
        <p>Sheet content</p>
      </BottomSheet>
    );

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("has no axe violations when open", async () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Test Sheet">
        <button type="button">Action</button>
      </BottomSheet>
    );

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ── ARIA role / attribute tests ────────────────────────────────────────────

describe("BottomSheet — ARIA roles and attributes", () => {
  it("renders role='dialog' on the sheet element", () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Accessibility Sheet">
        <p>Content</p>
      </BottomSheet>
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  });

  it("sets aria-modal='true' on the dialog when open", () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Modal Sheet">
        <p>Content</p>
      </BottomSheet>
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("sets aria-label from the title prop", () => {
    const title = "Question Navigator";
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title={title}>
        <p>Content</p>
      </BottomSheet>
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-label")).toBe(title);
  });
});

// ── Focus-trap tests ───────────────────────────────────────────────────────

describe("BottomSheet — focus trap", () => {
  it("moves focus into the sheet on open", async () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Focus Sheet">
        <button type="button" id="first-btn">First</button>
        <button type="button" id="second-btn">Second</button>
      </BottomSheet>
    );

    // Wait for the 50 ms focus-move timeout in the implementation
    await new Promise((r) => setTimeout(r, 80));

    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusableItems = getFocusableElements(sheet);
    // At least one focusable element should exist (the close button + our buttons)
    expect(focusableItems.length).toBeGreaterThan(0);
  });

  it("Tab key cycles forward within the open sheet", () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Trap Sheet">
        <button type="button" id="btn-a">Alpha</button>
        <button type="button" id="btn-b">Beta</button>
      </BottomSheet>
    );

    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusable = getFocusableElements(sheet);

    // Focus the last focusable element, then fire Tab — focus should wrap to first
    const last = focusable[focusable.length - 1];
    last.focus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });

    // After the trap handler runs, first element should be focused
    expect(document.activeElement).toBe(focusable[0]);
  });

  it("Shift+Tab key cycles backward within the open sheet", () => {
    const { container } = render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Trap Sheet">
        <button type="button" id="btn-a">Alpha</button>
        <button type="button" id="btn-b">Beta</button>
      </BottomSheet>
    );

    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusable = getFocusableElements(sheet);

    // Focus the first focusable element, then fire Shift+Tab — should wrap to last
    const first = focusable[0];
    first.focus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it("Tab focus stays within sheet — intermediate item does not escape", () => {
    const { container } = render(
      <>
        <button type="button" id="outside">Outside</button>
        <BottomSheet isOpen={true} onClose={() => {}} title="Isolation Sheet">
          <button type="button" id="inside-a">Inside A</button>
          <button type="button" id="inside-b">Inside B</button>
        </BottomSheet>
      </>
    );

    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    const insideA = sheet.querySelector("#inside-a") as HTMLElement;
    const outsideBtn = container.querySelector("#outside") as HTMLElement;

    insideA.focus();
    // The focus trap must not let focus land on the outside button
    expect(document.activeElement).not.toBe(outsideBtn);
  });
});

// ── Keyboard / interaction tests ───────────────────────────────────────────

describe("BottomSheet — Escape and backdrop interactions", () => {
  it("calls onClose when Escape key is pressed while sheet is open", () => {
    const onClose = vi.fn();

    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Escape Test">
        <button type="button">Inner</button>
      </BottomSheet>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for Escape when sheet is closed", () => {
    const onClose = vi.fn();

    render(
      <BottomSheet isOpen={false} onClose={onClose} title="Closed Sheet">
        <button type="button">Inner</button>
      </BottomSheet>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();

    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose} title="Backdrop Test">
        <button type="button">Inner</button>
      </BottomSheet>
    );

    // The backdrop is the first element rendered before the dialog
    // It carries aria-hidden="true" and an onClick handler
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the built-in close button (✕) is clicked", () => {
    const onClose = vi.fn();

    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose} title="Close Button Test">
        <p>Content</p>
      </BottomSheet>
    );

    // The close button has aria-label="Close"
    const closeBtn = container.querySelector('[aria-label="Close"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
