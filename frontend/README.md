# Local-first RAG frontend

This Vite + React + TypeScript frontend powers the document upload and question-answer experience for the local-first RAG workflow.

## Scripts

- npm run dev
- npm run build
- npm run lint
- npm run typecheck
- npm run knip (dead-code check)
- npm run format:check
- npm run test
- npm run generate:api-types

## Responsive layout

The shell switches layout at the `lg` breakpoint. The widths live in one place,
`src/lib/breakpoints.ts`, and `src/lib/useMediaQuery.ts` subscribes to them so
the markup and the Tailwind classes always agree.

| Width                               | Sidebar                                                  | Context panel (RAG trace)              |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| < 768px (phone)                     | Drawer with backdrop, opened from the header menu button | Right-hand sheet with backdrop         |
| 768px – 1023px (tablet, below `lg`) | Same as phone                                            | Same as phone                          |
| ≥ 1024px (desktop, `lg`)            | Persistent, collapsible to a 56px icon rail              | Inline panel that pushes the chat area |

Verified at 360px, 768px and 1280px; the layout rules are covered by
`src/__tests__/responsive.shell.test.tsx`.

## Theme

`src/store/theme.store.ts` is the single source of truth for theme mode: the
toggle in the sidebar footer and the one in Settings read and write the same
store, so they can never disagree. The choice is persisted to
`localStorage` (`docuchat-theme`) and `'system'` follows the OS preference —
the inline script in `index.html` applies it before the first paint, and the
store keeps tracking OS changes while in `'system'` mode.
