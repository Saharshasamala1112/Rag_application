/**
 * jsdom does not implement `window.matchMedia`, so the shell's breakpoint
 * logic (and the theme store's OS preference) needs a controllable stand-in.
 *
 * Use `setViewportWidth` / `setSystemPrefersDark` from a test to change what
 * the mock reports; every live `MediaQueryList` is notified afterwards.
 */

type ChangeListener = (event: { matches: boolean; media: string }) => void

const MIN_WIDTH_QUERY = /min-width:\s*(\d+(?:\.\d+)?)px/
const MAX_WIDTH_QUERY = /max-width:\s*(\d+(?:\.\d+)?)px/

let viewportWidth = 1024
let systemPrefersDark = false

const instances = new Set<MockMediaQueryList>()

function evaluateQuery(media: string): boolean {
  const minWidth = MIN_WIDTH_QUERY.exec(media)
  if (minWidth) return viewportWidth >= Number(minWidth[1])

  const maxWidth = MAX_WIDTH_QUERY.exec(media)
  if (maxWidth) return viewportWidth <= Number(maxWidth[1])

  if (media.includes('prefers-color-scheme: dark')) return systemPrefersDark
  if (media.includes('prefers-color-scheme: light')) return !systemPrefersDark
  return false
}

class MockMediaQueryList {
  readonly media: string
  readonly onchange = null
  readonly #listeners = new Set<ChangeListener>()

  constructor(media: string) {
    this.media = media
    instances.add(this)
  }

  get matches(): boolean {
    return evaluateQuery(this.media)
  }

  addEventListener(type: string, listener: ChangeListener): void {
    if (type === 'change') this.#listeners.add(listener)
  }

  removeEventListener(type: string, listener: ChangeListener): void {
    if (type === 'change') this.#listeners.delete(listener)
  }

  addListener(listener: ChangeListener): void {
    this.#listeners.add(listener)
  }

  removeListener(listener: ChangeListener): void {
    this.#listeners.delete(listener)
  }

  dispatchEvent(): boolean {
    const event = { matches: this.matches, media: this.media }
    for (const listener of this.#listeners) listener(event)
    return true
  }
}

function notifyAll(): void {
  for (const instance of instances) instance.dispatchEvent()
}

window.matchMedia = ((media: string) => new MockMediaQueryList(media)) as unknown as typeof window.matchMedia

/** Sets the simulated viewport width and notifies subscribers (via `change`). */
export function setViewportWidth(width: number): void {
  viewportWidth = width
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
  notifyAll()
}

/** Sets what `(prefers-color-scheme: dark)` reports and notifies subscribers. */
export function setSystemPrefersDark(value: boolean): void {
  systemPrefersDark = value
  notifyAll()
}

export function getViewportWidth(): number {
  return viewportWidth
}
