/** Global presentation owned by dsh-enhance: annotation popover and tray. */
export const css = String.raw`/* The passage being annotated, painted through the Custom Highlight API so the
   mark survives focus moving into the note field (a native selection would not).
   Same blue as the app's document selection, so it reads as the same gesture. */
::highlight(dsh-enhance-annotation) {
  /* Literal, not a token: a highlight pseudo-element does not inherit custom
     properties from the element it paints, so the document-selection token
     resolved to nothing and clicking an annotation showed no
     selection wash at all. Same blue the app uses for its own selection. */
  background-color: rgb(59 130 246 / 32%);
  color: inherit;
}

body[data-ds-dark-theme] ::highlight(dsh-enhance-annotation) {
  background-color: rgb(96 165 250 / 34%);
  color: inherit;
}

/* Passages that carry an annotation keep a persistent mark so the transcript
   shows what the next message will quote. It uses literal colours rather than
   a mix over theme tokens: a highlight pseudo-element does not inherit the
   custom properties of the element it paints, so a mixed colour resolved to
   nothing and the mark was invisible. Decoration properties are not honoured
   inside ::highlight either, so the mark is a plain wash. */
::highlight(dsh-enhance-annotation-mark) {
  /* Strong enough to spot while reading: the point of the mark is that the
     reader notices "this passage is annotated" without hovering anything. */
  background-color: rgb(247 173 49 / 46%);
  color: inherit;
}

body[data-ds-dark-theme] ::highlight(dsh-enhance-annotation-mark) {
  background-color: rgb(247 173 49 / 34%);
  color: inherit;
}

/* The inline badge sitting right after a marked passage.
   Only the glyph is painted — no chip fill, no halo — and it rides just above the
   line it marks, so the passage reads as marked rather than as a control. */
.dsh-enhance-badge {
  /* Full reset: a bare button element still paints the platform's focus ring and
     background once it is clicked, which showed up as a box behind the pin. */
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0 4px;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  box-shadow: none;
  color: rgb(247 173 49);
  line-height: 1;
  vertical-align: 8px;
  cursor: pointer;
  /* The glyph floats over the passage: a soft cast shadow puts it in front of the
     text instead of sitting flat in the line. On white paper the dark-theme cast
     read as a smudge under the disc, so the light theme gets the same lift at a
     third of the weight. */
  filter: drop-shadow(0 1px 2px rgb(15 17 21 / 22%));
  transition: transform 110ms ease, filter 110ms ease;
}

/* The badge is one numbered disc. Height drives the scale and the width follows
   the viewBox, so a two-digit pill stays the same height as a single digit. */
.dsh-enhance-badge svg {
  display: block;
  height: 22px;
  width: auto;
}

.dsh-enhance-badge:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 2px 5px rgb(15 17 21 / 32%));
}

body[data-ds-dark-theme] .dsh-enhance-badge {
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 42%));
}

body[data-ds-dark-theme] .dsh-enhance-badge:hover {
  filter: drop-shadow(0 3px 6px rgb(0 0 0 / 52%));
}

.dsh-enhance-badge:focus,
.dsh-enhance-badge:focus-visible,
.dsh-enhance-badge:active {
  outline: none;
  background: transparent;
  box-shadow: none;
  border: 0;
}

/* Annotation popover.
   One frame, two rows: the field the reader types into, then a quiet line that
   carries the quoted passage and the secondary action. No second border, no key
   legend, no nested boxes — the surface is a single floating panel. */
.dsh-enhance-popover {
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: calc(100vw - 24px);
  /* No inset of its own: the textarea sits on the frame's surface, flush with
     the top and both sides. The only breathing room is the field's own
     horizontal padding, so text never touches the rounded corners. */
  padding: 0;
  border-radius: 18px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  /* The app's real surface token, not a guessed name: --dsw-alias-bg-layer-1
     is #fff on the light theme and #232324 on the dark one, so one rule covers
     both. The light card stays nearly opaque — a translucent white over white
     text has no edge at all — while the dark card keeps its glass. */
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 96%, transparent);
  /* Hairline stroke + a low, soft cast: the theme's own elevation, which is far
     quieter than a black 40% shadow and is what makes a white card sit on a
     white page instead of dissolving into it. */
  box-shadow: var(--dsw-elevation-prominent, 0 3px 8px rgb(0 0 0 / 6%)), 0 12px 32px -14px rgb(15 17 21 / 20%);
  backdrop-filter: blur(24px) saturate(1.6);
  animation: dsh-enhance-pop-in 110ms cubic-bezier(.2, .8, .3, 1);
}

body[data-ds-dark-theme] .dsh-enhance-popover {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #1b1b1c) 70%, transparent);
  box-shadow: 0 20px 48px -16px rgb(0 0 0 / 62%), inset 0 0 0 0.5px rgb(255 255 255 / 7%);
}

@keyframes dsh-enhance-pop-in {
  from { opacity: 0; transform: translateY(-4px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-enhance-popover { animation: none; }
}

/* The field row carries no inset and no panel of its own: the textarea sits
   flush with the popover's own surface, so the words line up with the frame
   instead of floating in a lighter box inside it. */
.dsh-enhance-popover__field {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 10px 8px 6px 14px;
  border-radius: 0;
  background: transparent;
}

/* Height follows the text. The element is a textarea because the note is
   multi-line, but it must never grow a scrollbar: no max-height, no vertical
   overflow, and the rows are driven from JS on every input (see the seat), so
   the panel grows with what is typed rather than clipping it. */
.dsh-enhance-popover__input {
  flex: 1;
  min-width: 0;
  min-height: 24px;
  max-height: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: none;
  overflow-y: hidden;
}

.dsh-enhance-popover__input::placeholder {
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
}

.dsh-enhance-popover__input:focus {
  outline: none;
}

.dsh-enhance-popover__confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary);
  /* The token that actually flips with the theme: white on light, #0f1115 on
     dark. --dsw-alias-bg-l1 does not exist, so the glyph fell back to a
     literal and only looked right by luck in one theme. */
  color: var(--dsw-alias-label-primary-foreground);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
}

/* Nothing to confirm yet: a hairline ring with a muted check, not a filled disc
   faded to 22%. On a white card the faded fill read as a grey blob with an
   invisible glyph, which looks like a loading placeholder rather than a state. */
.dsh-enhance-popover__confirm:disabled {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  cursor: default;
}

.dsh-enhance-popover__confirm:hover:not(:disabled) {
  transform: scale(1.06);
}

.dsh-enhance-popover__confirm svg,
.dsh-enhance-popover__confirm svg path {
  color: inherit;
  stroke: currentColor;
}

/* Footer: the quoted passage on the left, the side-chat action on the right. */
/* The popover frame has no inset of its own (the field is flush with it), so
   the footer carries the frame's own horizontal and bottom spacing. */
.dsh-enhance-popover__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 14px 10px;
}

.dsh-enhance-popover__quote {
  min-width: 0;
  overflow: hidden;
  /* Secondary, not tertiary: the quote previews the passage under discussion, and
     at 11px on a white card the tertiary grey was too faint to read at a glance. */
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-enhance-popover__link {
  flex: none;
  padding: 2px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 15px;
  cursor: pointer;
}

.dsh-enhance-popover__link:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-popover__link:disabled {
  opacity: .5;
  cursor: default;
}

/* Annotation tray inside the composer card.
   The overlay anchor is a zero-height box on the card's top edge, so the tray
   is absolutely positioned against it: the pill sits just above that edge and
   the expanded list grows upward over the transcript. Nothing here takes layout
   space from the input, which is what keeps the composer looking untouched. */
/* The pill sits inside the card's frame, on its top inset. The rule below gives
   the card the room it needs, so the draft starts under the pill instead of
   behind it — the input frame never grows an extra row of chrome. */
.dsh-enhance-tray {
  position: absolute;
  left: 14px;
  top: 7px;
  max-width: calc(100% - 28px);
  z-index: 3;
}

[data-composer-card]:has(.dsh-enhance-tray) {
  padding-top: 40px !important;
}

.dsh-enhance-tray__pill {
  display: inline-flex;
  align-items: center;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
  /* The pill sits on the composer card, so it takes the raised layer rather than
     the page colour: white-on-white on the light theme had no edge but its
     hairline, and the card's own shadow is what does the lifting. */
  background: var(--dsw-alias-bg-layer-1, #fff);
  box-shadow: var(--dsw-elevation-panel, 0 2px 8px rgb(0 0 0 / 8%));
  overflow: hidden;
}

body[data-ds-dark-theme] .dsh-enhance-tray__pill {
  /* One step above the composer's own layer, so the pill still reads as raised
     when both are dark. */
  background: var(--dsw-alias-bg-layer-2, #2c2c2e);
  box-shadow: 0 2px 8px rgb(0 0 0 / 28%);
}

.dsh-enhance-tray__divider {
  width: 1px;
  height: 14px;
  background: var(--dsw-alias-border-l3);
}

/* Clears every annotation at once; sized like the pill's own chrome. */
.dsh-enhance-tray__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0 3px 0 1px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  cursor: pointer;
}

.dsh-enhance-tray__clear:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-tray__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 9px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11.5px;
  line-height: 16px;
  cursor: pointer;
}

.dsh-enhance-tray__chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-tray__glyph {
  display: inline-flex;
  align-items: center;
}

/* The list is portalled to <body> and fixed against the pill: the composer card
   and the right Sidebar both clip overflow, which hid it entirely in a sidebar
   tab. z-index keeps it above the composer and its own overlay anchor. */
.dsh-enhance-tray__list {
  z-index: 61;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 260px;
  max-width: min(380px, calc(100vw - 16px));
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 14px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 97%, transparent);
  backdrop-filter: blur(20px) saturate(1.4);
  box-shadow: var(--dsw-elevation-prominent, 0 3px 8px rgb(0 0 0 / 6%)), 0 18px 44px -18px rgb(15 17 21 / 24%);
  max-height: 260px;
  overflow-y: auto;
}

body[data-ds-dark-theme] .dsh-enhance-tray__list {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #2c2c2e) 94%, transparent);
  box-shadow: 0 16px 40px -12px rgb(0 0 0 / 58%);
}

/* One row: the passage opens the reveal, the trailing icons edit and remove. */
/* The row is the whole width; its actions float over the right end on hover, so
   the text keeps the full line until the reader actually points at it. */
.dsh-enhance-tray__item {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 9px;
}

.dsh-enhance-tray__item:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
}

.dsh-enhance-tray__row {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  /* Full width: the text runs to the row's right edge and is never shortened to
     make room for the hover actions, which overlay it instead. */
  padding: 6px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.dsh-enhance-tray__row:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-primary);
}

.dsh-enhance-tray__index {
  flex: none;
  width: 14px;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 10.5px;
  line-height: 18px;
  text-align: right;
}

.dsh-enhance-tray__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.dsh-enhance-tray__note {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 17px;
  overflow-wrap: anywhere;
}

.dsh-enhance-tray__actions {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  /* Capsule, matching the shape language of the rest of the composer chrome. */
  border-radius: 999px;
  /* A solid pill, not a gradient: fading over text looked like a smudge, and the
     icons must stay readable on top of the note they cover. */
  background: var(--dsw-alias-bg-layer-1, #fff);
  box-shadow:
    0 0 0 0.5px var(--dsw-alias-border-l3),
    0 2px 8px rgb(15 17 21 / 18%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 110ms ease;
}

body[data-ds-dark-theme] .dsh-enhance-tray__actions {
  background: var(--dsw-alias-bg-layer-2, #2c2c2e);
  box-shadow:
    0 0 0 0.5px var(--dsw-alias-border-l3),
    0 2px 8px rgb(0 0 0 / 40%);
}

.dsh-enhance-tray__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

/* Only the row under the pointer (or holding keyboard focus) reveals its
   actions; every other row stays a plain reveal target. */
.dsh-enhance-tray__item:hover > .dsh-enhance-tray__actions,
.dsh-enhance-tray__item:focus-within > .dsh-enhance-tray__actions {
  opacity: 1;
  pointer-events: auto;
}

.dsh-enhance-tray__icon:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
}

.dsh-enhance-tray__icon:hover {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-tray__passage {
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Editing panel: a small floating card. The quoted passage is the header and the
   drag handle, the field is the body, and a single check publishes the note. */
.dsh-enhance-edit {
  position: fixed;
  z-index: 63;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: calc(100vw - 24px);
  gap: 2px;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 14px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 96%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  box-shadow: var(--dsw-elevation-prominent, 0 3px 8px rgb(0 0 0 / 6%)), 0 18px 44px -16px rgb(15 17 21 / 24%);
  animation: dsh-enhance-pop-in 100ms cubic-bezier(.2, .8, .3, 1);
}

body[data-ds-dark-theme] .dsh-enhance-edit {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #1b1b1c) 92%, transparent);
  box-shadow: 0 20px 48px -16px rgb(0 0 0 / 62%), inset 0 0 0 0.5px rgb(255 255 255 / 7%);
}

/* Anchored variant: coordinates come from the badge, so the centring transform
   must not apply. */
.dsh-enhance-edit--anchored {
  transform: none;
}

/* The header is text, not a bar: it names the passage and doubles as the drag
   surface, so no grip row is spent on it. */
.dsh-enhance-edit__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  /* Carries the dialog's own top inset now that the frame has no padding. */
  padding: 10px 14px 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.dsh-enhance-edit__head:active {
  cursor: grabbing;
}

.dsh-enhance-edit__label {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 11px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Removal action on the editor header. Quiet by default — it sits beside the
   quoted passage, which is the header's real job — and takes the danger colour
   only on hover, so it never competes with the confirm check. */
.dsh-enhance-edit__delete {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  cursor: pointer;
  opacity: 0.7;
  transition: background-color 110ms ease, color 110ms ease, opacity 110ms ease;
}

.dsh-enhance-edit__delete:hover {
  opacity: 1;
  color: #e5484d;
  background: rgb(229 72 77 / 12%);
}

.dsh-enhance-edit__delete:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4d6bfe);
  outline-offset: 1px;
}

/* The field and its one action share a row: the check sits at the end of the text
   it publishes rather than in a footer of its own. */
.dsh-enhance-edit__body {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  /* Matches the header's inset so the note and the quoted passage line up. */
  padding: 0 8px 8px 12px;
}

.dsh-enhance-edit__field {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  min-height: 66px;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: none;
}

.dsh-enhance-edit__field:focus {
  outline: none;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}

.dsh-enhance-edit__confirm {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary-foreground);
  cursor: pointer;
  transition: opacity 110ms ease, transform 110ms ease;
}

.dsh-enhance-edit__confirm:hover {
  transform: scale(1.06);
}

.dsh-enhance-edit__confirm:focus-visible {
  outline: 2px solid var(--dsw-alias-label-primary);
  outline-offset: 2px;
}

.dsh-enhance-tray__passage {
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Editing panel: a small floating card, not a modal. The header is the drag
   handle, the field is the only body, and the actions sit in one compact row. */
.dsh-enhance-edit {
  position: fixed;
  z-index: 63;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 380px;
  max-width: calc(100vw - 24px);
  padding: 8px;
  gap: 6px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 14px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 96%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  box-shadow: var(--dsw-elevation-prominent, 0 3px 8px rgb(0 0 0 / 6%)), 0 20px 48px -16px rgb(15 17 21 / 24%);
  animation: dsh-enhance-pop-in 100ms cubic-bezier(.2, .8, .3, 1);
}

body[data-ds-dark-theme] .dsh-enhance-edit {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #1b1b1c) 92%, transparent);
  box-shadow: 0 22px 52px -16px rgb(0 0 0 / 62%), inset 0 0 0 0.5px rgb(255 255 255 / 7%);
}

/* Anchored variant: coordinates come from the badge, so the centring transform
   must not apply. */
.dsh-enhance-edit--anchored {
  transform: none;
}

/* Header doubles as a drag handle. */
.dsh-enhance-edit__head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  /* Sits on the dialog's own edge: a small inset on every side is enough to
     keep the text off the rounded corner, no wider. Both the header and the
     field share the same left inset so the quote and the note start on one
     line. */
  padding: 8px 8px 4px 12px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.dsh-enhance-edit__head:active {
  cursor: grabbing;
}

.dsh-enhance-edit__grip {
  flex: none;
  width: 14px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
}

.dsh-enhance-edit__label {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 11px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-enhance-edit__field {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: 72px;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: vertical;
}

.dsh-enhance-edit__field:focus {
  outline: none;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}

.dsh-enhance-edit__row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 0 2px 2px;
}

.dsh-enhance-edit__ghost,
.dsh-enhance-edit__primary {
  padding: 6px 14px;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.dsh-enhance-edit__ghost {
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}

.dsh-enhance-edit__ghost:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-edit__primary {
  border: 0;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary-foreground);
  font-weight: 600;
}

.dsh-enhance-edit__primary:hover {
  opacity: .88;
}

.dsh-enhance-tray__passage {
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Editing dialog opened from a transcript badge: it hangs under that badge
   instead of jumping to the middle of the window, so the note the reader clicked
   stays in view while they rewrite it. */
.dsh-enhance-edit {
  position: fixed;
  z-index: 63;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 420px;
  max-width: calc(100vw - 32px);
  /* Flush like the selection popover: the field and the header sit on the
     dialog's own surface instead of inside a second inset frame. */
  padding: 0;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 16px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #fff) 96%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  box-shadow: var(--dsw-elevation-prominent, 0 3px 8px rgb(0 0 0 / 6%)), 0 24px 64px -18px rgb(15 17 21 / 26%);
}

body[data-ds-dark-theme] .dsh-enhance-edit {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #2c2c2e) 92%, transparent);
  box-shadow: 0 24px 64px -16px rgb(0 0 0 / 62%), inset 0 0 0 0.5px rgb(255 255 255 / 7%);
}

/* Anchored variant: coordinates come from the badge, so the centring transform
   must not apply. */
.dsh-enhance-edit--anchored {
  transform: none;
  width: 360px;
}

.dsh-enhance-edit__field {
  /* border-box: a full-width field plus its padding and hairline overflowed the
     dialog by exactly those pixels. */
  box-sizing: border-box;
  display: block;
  width: 100%;
  /* Height follows the text, never a scrollbar: no max-height, no vertical
     overflow, sized from scrollHeight on every change (see the editor). */
  min-height: 24px;
  max-height: none;
  /* No horizontal inset of its own: the body row already carries the dialog's
     left edge, and doubling it pushed the note 12px right of the quote. */
  padding: 4px 0 8px;
  max-width: 100%;
  border: 0;
  border-radius: 0;
  /* No frame of its own: the dialog is the surface, so the words sit directly
     on it. */
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: none;
  overflow-y: hidden;
}

.dsh-enhance-edit__field:focus {
  outline: none;
  background: transparent;
}

.dsh-enhance-edit__row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.dsh-enhance-edit__ghost,
.dsh-enhance-edit__primary {
  padding: 6px 14px;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.dsh-enhance-edit__ghost {
  border: 0.5px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}

.dsh-enhance-edit__ghost:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-enhance-edit__primary {
  border: 0;
  /* The app's own inverted pair: a primary-label fill with its matching
     foreground token. Picking a background token by name (bg-l1) read as "light"
     but resolves to the page colour in dark mode, which made the label vanish. */
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary-foreground);
  font-weight: 600;
}

.dsh-enhance-edit__primary:hover {
  opacity: .88;
}
`
