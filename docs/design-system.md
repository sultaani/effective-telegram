# KCOE design system

Two surfaces share one codebase and one set of components. Tokens live in `src/styles/tokens.css`; the `data-surface="public"` or `data-surface="portal"` attribute on the page wrapper switches fonts, accent, radii and shadows. Light theme only.

Sources: `design-input/website-design.md` (website) and `design-input/portals-ui-design.md` (portals, recoloured as agreed).

## Website (`src/app/public.css`)
| Token | Value | Use |
|---|---|---|
| `--green` | #166534 | Primary: buttons, active nav, kickers, highlights |
| `--blue` | #1d4ed8 | Secondary: links, info |
| `--yellow` | #eab308 | Tertiary: notice chip, hero card top rule, date boxes, testimonial rule. Fills and borders only; text on yellow is `#111827` |
| `--green-tint` | #f3f7f4 | Muted section backgrounds |
| `--error` | #dc2626 | Errors only |
Type: Figtree (a free stand-in for the licensed UTSans). Light (300) display headings, 400 body, 700 hero. Spacing scale 6/14/22/30/60. Pill buttons (46px high), 8px cards, 1px borders, no gradients, no shadows. The navbar follows the UNITBV inspiration: slim white bar, small text items with chevrons, search icon, one pill button.

## Portals (`src/app/portal.css`)
| Token | Value | Use |
|---|---|---|
| `--navy` | #12284c | Primary: header, buttons, active nav, links |
| forest green | #166534 | Secondary: success, second stat accent |
| `--gold` | #eab308 | Accent: header rule, key-dates rule, third stat accent; text uses `--gold-ink` #a16207 |
| `--surface-base` | #f8fafc | Page background |
Type: Vollkorn (headings), DM Sans (body), Source Code Pro (course codes, references). 6px radius, 42px buttons, 24px card padding, `shadow-md` cards, sticky table headers with alternating rows, collapsible sidebar groups, status chips (text + colour), key dates on every dashboard, confirmation on destructive actions, print layouts for results, receipts and timetables.

## Rules
- Colour is never the only signal: statuses and grades carry text (`Paid`, `A · Excellent`, `Fail`).
- Body text pairs meet WCAG AA (4.5:1); see the contrast table in the project README.
- Hover/focus: visible 3px focus ring on every control; `prefers-reduced-motion` respected.
- Images: the crest is `public/images/logo*.png` and the favicon set in `src/app/` (`icon.png`, `apple-icon.png`, `favicon.ico`); the hero and Provost photos are `public/images/hero.jpg` and `provost.webp`.
