"use client";

import React from "react";

interface FixedActionBarProps {
  children: React.ReactNode;
  className?: string;
}

const FIXED_ACTION_BAR_ID = "fixed-action-bar-style";

export function FixedActionBar({ children, className }: FixedActionBarProps) {
  return (
    <>
      <style>{`
        .fixed-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          min-height: 64px;
          background: var(--color-bg-secondary, #1a1a2e);
          border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 16px;
          padding-bottom: env(safe-area-inset-bottom);
          box-sizing: border-box;
        }

        .fixed-action-bar > * {
          min-height: 44px;
          min-width: 44px;
        }

        @media (min-width: 768px) {
          .fixed-action-bar {
            position: static;
            z-index: auto;
          }
        }
      `}</style>
      <div className={`fixed-action-bar${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    </>
  );
}
