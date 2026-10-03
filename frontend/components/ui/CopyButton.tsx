"use client";

import { useState } from "react";

export interface CopyButtonProps {
  /** The text to copy to the clipboard. */
  text: string;
  /** Accessible label for the button. Defaults to "Copy". */
  label?: string;
  /** Optional visible text to render inside the button alongside the icon. */
  displayText?: string;
}

/**
 * CopyButton — copies `text` to the clipboard and shows a 2-second "Copied!"
 * feedback state.
 *
 * Requirements: 5.5, 6.6
 *
 * - Default state : 📋 icon (+ `displayText` when provided)
 * - Feedback state: ✓ icon + "Copied!" text, rendered in green
 * - Touch target  : minimum 44 × 44 CSS pixels (WCAG 2.5.5)
 * - `aria-label`  : updates to "Copied!" during feedback state
 */
export function CopyButton({ text, label = "Copy", displayText }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (copied) return; // already in feedback state — ignore duplicate taps
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed (permissions denied, insecure context, etc.)
      // Silently ignore — no feedback state shown
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? "Copied!" : label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        minWidth: "44px",
        minHeight: "44px",
        padding: "0 12px",
        background: copied
          ? "rgba(34, 197, 94, 0.12)"
          : "rgba(255, 255, 255, 0.05)",
        border: copied
          ? "1px solid rgba(34, 197, 94, 0.35)"
          : "1px solid var(--color-border, rgba(255,255,255,0.12))",
        borderRadius: "8px",
        color: copied ? "#4ade80" : "var(--color-text-secondary, #a1a1aa)",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "color 150ms ease, background 150ms ease, border-color 150ms ease",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "1rem", lineHeight: 1 }}>
        {copied ? "✓" : "📋"}
      </span>

      {/* Always render a text node so the button has a legible label even
          without emoji support, and to show `displayText` when provided. */}
      <span>
        {copied ? "Copied!" : (displayText ?? label)}
      </span>
    </button>
  );
}
