/**
 * Small, shared style constants for this feature — not colours (those go
 * through `semantic()`/`dp-theme.ts`, see CLAUDE.md's dp-kit rules), just
 * plain layout numbers that multiple components need to agree on.
 */

/**
 * Standard border width for bordered pills/chips/tiles across the wizard
 * (KPI tiles, Copilot suggested-prompt chips, and any future screen that
 * needs the same treatment) — a deliberate, disclosed bump past the
 * reference's own literal 1px, which reads as too thin to register as a
 * visible border at these components' actual rendered sizes. Kept as one
 * named constant so every consumer moves together instead of each
 * carrying its own local "1.5" magic number.
 */
export const BORDERED_CHIP_WIDTH = 1.5;
