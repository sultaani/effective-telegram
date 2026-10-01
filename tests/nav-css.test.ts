import { describe, expect, it } from "vitest";
import fs from "node:fs";

// Regression: dropdown panels are rendered in the page (for crawlers and no-JS) with the `hidden` attribute.
// An author rule such as `.mn-panel { display: flex }` beats the browser's built-in [hidden] rule, which made every
// dropdown open at once. A more specific `.mn-panel[hidden] { display: none }` rule must exist.
describe("main navigation styles", () => {
  const css = fs.readFileSync("src/app/public.css", "utf8");
  it("overrides display:flex for closed panels", () => {
    expect(css).toMatch(/\.mn-panel\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.mn-panel\[hidden\]\s*\{\s*display:\s*none/);
  });
  it("never applies a display rule to the panel that could reopen it on mobile", () => {
    const mobile = css.slice(css.indexOf("@media (max-width: 1000px)"));
    const panelRule = /\.mn-panel\s*\{([^}]*)\}/.exec(mobile)?.[1] ?? "";
    expect(panelRule).not.toMatch(/display:\s*(block|flex)/);
  });
});
