import type { TestStatus } from "../../types";

/**
 * Returns the allowed next statuses for a given TestStatus.
 *
 * Transitions (Requirements 8.1):
 *   draft      → scheduled | active | archived
 *   scheduled  → draft | active | archived
 *   active     → completed
 *   completed  → archived
 *   archived   → (none)
 */
export function nextStatuses(status: TestStatus): TestStatus[] {
  switch (status) {
    case "draft":
      return ["scheduled", "active", "archived"];
    case "scheduled":
      return ["draft", "active", "archived"];
    case "active":
      return ["completed"];
    case "completed":
      return ["archived"];
    case "archived":
      return [];
  }
}
