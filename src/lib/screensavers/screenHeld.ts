// Whether the screen saver or lock screen is up on the public site. Window-level key listeners that were registered
// before the lock (the tour's end card, the tour's input watcher) read this and stand aside, so a key meant for the
// lock screen (Esc, typing the password) never closes or stops something behind it.

let held = false;

export function isScreenHeld(): boolean {
  return held;
}

/** Set by useScreensaver as it moves between phases (Previews in the editor never hold the screen). */
export function setScreenHeld(value: boolean): void {
  held = value;
}
