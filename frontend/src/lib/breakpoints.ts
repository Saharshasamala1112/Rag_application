/**
 * Layout breakpoints for the application shell.
 *
 * These mirror the Tailwind defaults (`md` = 768px, `lg` = 1024px) so that the
 * JavaScript layout decisions and the CSS utilities always agree:
 *
 * - < 768px (base): phone. Sidebar is a drawer, context panel is a sheet.
 * - 768px - 1023px (`md`, below `lg`): tablet. Same overlay layout as phones.
 * - >= 1024px (`lg`): desktop. Persistent collapsible sidebar + inline panel.
 */
const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const

export const MEDIA_QUERIES = {
  tablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
} as const
