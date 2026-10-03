"use client";

import { useEffect, useRef } from "react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * BottomSheet — slides up from the bottom of the viewport.
 *
 * Layout:
 *   - Backdrop covers viewport EXCEPT the bottom 64px reserved for FixedActionBar.
 *   - Sheet sits above FixedActionBar: `bottom: 64px`, `max-height: calc(100vh - 64px)`.
 *   - Animate in/out via `transform: translateY(100% | 0)` with a 300 ms ease transition.
 *   - Sheet stays in the DOM when closed so the CSS transition can animate out.
 *
 * Accessibility:
 *   - `role="dialog"`, `aria-modal="true"`, `aria-label` from `title` prop.
 *   - Focus trap: Tab / Shift+Tab cycle within the sheet while open.
 *   - Escape key closes the sheet.
 */
export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Escape key handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ── Focus trap (Tab / Shift+Tab) ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const sheet = sheetRef.current;
      if (!sheet) return;

      const focusableSelectors = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // ── Move focus into sheet on open ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // Small delay lets the CSS transition start before we steal focus
    const id = setTimeout(() => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const first = sheet.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (first) {
        first.focus();
      } else {
        sheet.focus();
      }
    }, 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────────
          Covers the full viewport minus the 64px FixedActionBar at the bottom.
          Click on backdrop → close sheet. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          bottom: 64, // leave FixedActionBar visible
          background: "rgba(0, 0, 0, 0.55)",
          zIndex: 200,
          // Fade in/out in sync with sheet slide
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
        }}
      />

      {/* ── Sheet ─────────────────────────────────────────────────────────────
          Positioned above FixedActionBar (bottom: 64px).
          Slides in from bottom via translateY. */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // tabIndex makes the container programmatically focusable as a fallback
        tabIndex={-1}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 64, // sit on top of FixedActionBar
          maxHeight: "calc(100vh - 64px)",
          background: "var(--color-bg-secondary, #1e1e2e)",
          borderTop: "1px solid var(--color-border, rgba(255,255,255,0.1))",
          borderRadius: "16px 16px 0 0",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // Slide animation
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease",
          // Sheet is always in the DOM; pointer events only when open
          pointerEvents: isOpen ? "auto" : "none",
          // Prevent focus reaching hidden sheet
          visibility: isOpen ? "visible" : "hidden",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px 12px",
              borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.1))",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              {title}
            </h2>

            {/* Close button — 44×44 px touch target */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                fontSize: "1.2rem",
                padding: 0,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Scrollable content area ──────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: title ? "16px 20px 20px" : "20px",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
