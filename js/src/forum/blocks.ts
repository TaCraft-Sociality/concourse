/**
 * Where the right-hand blocks are on screen.
 *
 * 🚨 Registering is not placing. A forum with fof/forum-widgets-core (or
 * Bespoke) installed and no Concourse widget placed must still get Concourse's
 * own column; standing it down because a host COULD show a block would show
 * it nowhere. So each block counts its real mounts per host, and Concourse's
 * column draws a block only while no other host has it mounted.
 *
 * 🚨 A widget is not mounted once: Bespoke rebuilds its zones on every
 * redraw, a release followed at once by a claim. The answer is therefore
 * settled after the render pass, and a redraw is asked for only when it
 * actually changed — otherwise each half of a remount would ask for the
 * redraw that causes the next one, for ever.
 */

const counts: Record<string, Record<string, number>> = {};
const announced: Record<string, boolean> = {};
let settling = false;

function elsewhere(block: string): boolean {
  const hosts = counts[block] || {};
  return Object.keys(hosts).some((host) => host !== 'concourse' && hosts[host] > 0);
}

function settle() {
  if (settling) return;
  settling = true;

  window.setTimeout(() => {
    settling = false;
    let changed = false;

    for (const block of Object.keys(counts)) {
      const now = elsewhere(block);
      if (now !== !!announced[block]) {
        announced[block] = now;
        changed = true;
      }
    }

    if (changed) m.redraw();
  }, 0);
}

export function claim(block: string, host: string) {
  (counts[block] ||= {})[host] = (counts[block][host] || 0) + 1;
  if (host !== 'concourse') settle();
}

export function release(block: string, host: string) {
  (counts[block] ||= {})[host] = Math.max(0, (counts[block][host] || 0) - 1);
  if (host !== 'concourse') settle();
}

/** The settled answer, stable for the length of a render pass. */
export function placedElsewhere(block: string): boolean {
  return !!announced[block];
}
