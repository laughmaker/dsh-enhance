/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`/* A running session's marker is the host's StateDot in its "ongoing" form: an
   inline SVG holding two circles — a faint track and a dashed arc that spins
   and lengthens. Both circles stroke with currentColor, and the host paints
   that token as label-tertiary, a grey, so a live session reads exactly as
   muted as an idle one.

   Because the colour arrives through currentColor, one declaration recolours
   the whole ring: the color property on the svg root. The spectrum then comes
   from a hue-rotate on that same root, which walks both circles together, so
   the track stays a dim version of the arc instead of drifting into a second
   hue.

   Nothing here touches the dash or the spin. Those carry the information
   (something is happening) and belong to the host; only the paint is ours.
   That is also why no stroke rule is written at all — the host's animation on
   the arc would be outranked by any !important on it, freezing the dashes.

   Scope is the sidebar's status slot. StateDots elsewhere (jobs, approval,
   workflow runs) keep the host's own treatment. */
[class*="sidebarCol"] svg[data-state="ongoing"][class*="spinner"] {
  color: #3b82f6;
  filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%));
  animation: dsh-enhance-spinner-spectrum 4s linear infinite;
}

/* Blue, violet, magenta, amber, blue: every stop stays legible against both
   the light and the dark sidebar, and the loop returns to its start hue so
   there is no jump at the seam. The glow rotates with the ring. */
@keyframes dsh-enhance-spinner-spectrum {
  0% { filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%)) hue-rotate(0deg); }
  25% { filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%)) hue-rotate(70deg); }
  50% { filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%)) hue-rotate(150deg); }
  75% { filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%)) hue-rotate(280deg); }
  to { filter: drop-shadow(0 0 2.5px rgb(96 165 250 / 55%)) hue-rotate(360deg); }
}

/* Motion is decoration here; the colour is the message. Reduced motion keeps
   the ring vivid and stops neither the host's spin nor its dash — only this
   colour cycle goes away, which is also what the host's own reduced-motion
   block asks of a status marker. */
@media (prefers-reduced-motion: reduce) {
  [class*="sidebarCol"] svg[data-state="ongoing"][class*="spinner"] {
    animation: none;
    color: #6366f1;
  }
}
`
