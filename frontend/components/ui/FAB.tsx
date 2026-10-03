"use client";

import React from "react";

export interface FABProps {
  onClick: () => void;
  label: string;
  badge?: string | number;
  isVisible?: boolean;
}

export function FAB({ onClick, label, badge, isVisible = true }: FABProps) {
  if (!isVisible) return null;

  return (
    <>
      <style>{`
        .fab-button {
          position: fixed;
          bottom: calc(64px + 16px);
          right: 16px;
          z-index: 90;
          min-width: 56px;
          min-height: 56px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: var(--gradient-primary, #4f8ef7);
          color: #fff;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          padding: 0;
          gap: 2px;
          /* ensure 44×44 touch target is already satisfied by the 56×56 size */
        }

        .fab-button:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        .fab-icon {
          font-size: 1.4rem;
          line-height: 1;
          pointer-events: none;
        }

        .fab-badge {
          font-size: 0.6rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.02em;
          pointer-events: none;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .fab-button {
            display: none;
          }
        }
      `}</style>
      <button
        type="button"
        className="fab-button"
        onClick={onClick}
        aria-label={label}
      >
        <span className="fab-icon" aria-hidden="true">
          ☰
        </span>
        {badge !== undefined && badge !== null && badge !== "" && (
          <span className="fab-badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>
    </>
  );
}
