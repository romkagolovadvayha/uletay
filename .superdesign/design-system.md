# Улетай Festival App — design system

## Product and users

Улетай is the official companion for a large Russian music festival. Users are
often outdoors, walking, holding a phone in one hand, under bright sun or at
night, with intermittent connectivity and very little attention to spare.
The UI must prioritize speed, confidence, large targets, glanceability, offline
tolerance, and clear recovery states.

Primary jobs:

1. Know what is happening now and what starts next.
2. Find a stage, service, food point, exit, medical point, or friend meeting zone.
3. Build a route from the user's current position, including inside-festival paths.
4. Listen to the festival radio and identify the current artist.
5. Save performances and receive reminders.

## Brand

Retain the current recognizable black and warm amber identity.

- Background: `#000000`.
- Main surfaces: `#1C1C1E`; raised/selected surfaces: `#2C2C2E`.
- Brand/CTA: `#FFC107` with black foreground.
- Main text: white; secondary `#AEAEB2`; muted `#636366`.
- Live/error: `#FF3B30`.
- Font: Montserrat only. Do not introduce another typeface.
- Titles are compact, uppercase, bold, and energetic. Body copy uses normal case
  for faster reading.
- Photography may be vivid, but controls always maintain strong contrast.

## Layout and responsiveness

- Phone: bottom tabs; content uses 16px gutters and one-column cards.
- Tablet: persistent left navigation; content width is constrained and centered
  unless the map needs full available space.
- Desktop web: persistent sidebar, maximum reading width 1120px, keyboard focus
  rings, hover states, semantic headings, and no phone-sized card floating in a
  huge empty canvas.
- Minimum touch target: 44x44; preferred primary control: 48–56px.
- Compact phone support starts at 320px. No horizontal page overflow.
- All screens account for top and bottom safe areas.

## Components

- Buttons: one amber primary action per decision area. Secondary actions use a
  bordered dark surface; tertiary actions are text buttons with a clear icon.
- Cards: 16–20px radius, 1px low-contrast border, consistent 16px internal padding.
- Sheets/popups: one shared bottom-sheet language with 20px top radius, handle,
  explicit close action when content is modal, and a desktop side panel/dialog
  adaptation rather than a full-width bottom sheet.
- Chips: 36–40px tall; selected state is amber with black text; horizontal
  overflow must visibly hint that more options exist.
- Status copy: say what happened and what to do next. Never expose raw technical
  errors to users.
- Loading: keep layout stable with skeleton/progress copy; do not leave a blank
  screen or indefinite spinner.

## Festival map

- Map remains the primary surface; controls must not cover essential map content.
- Phone hierarchy: search/discovery action, category chips, location state, map,
  then a compact bottom sheet for the selected place or route.
- Desktop/tablet hierarchy: full-height map plus a fixed 360–420px side panel for
  search, filters, selected POI, and route instructions.
- Provide search by stage/food/service name, category filters, "my location",
  "festival center", reset orientation/zoom, and a visible legend.
- Location permission is requested only after an explicit user action and explains
  the benefit before the system prompt.
- A route must show destination, total walk time, distance, route segments, clear
  cancel/close, and external navigation fallback.
- Offline/degraded state should preserve the static festival plan and POI list even
  when live map tiles or routing fail.
- Selected map entities and route colors must remain distinguishable without
  relying only on hue.

## Festival radio / playlist

- Treat it as live radio, not a finite track playlist. Primary copy should say
  "Фестивальное радио" and "Сейчас в эфире".
- Keep a persistent mini-player available outside the radio screen while audio is
  playing, with artist/title and play/pause.
- The main screen needs play/pause, buffering state, stream error recovery,
  current artist/track, "live" status, headliner link, and last update time.
- Do not show a fake seek bar or duration for a live stream.
- Explain background playback briefly once, not as repeated low-contrast helper
  text under the main control.
- Web should expose native audio semantics and keyboard-operable controls.
- Native playback metadata must stay in sync with lock-screen controls.

## Motion and feedback

- Press: 0.98 scale or subtle opacity; never both dramatically.
- Sheets: spring entrance; reduced-motion mode becomes a short fade/instant move.
- Haptics: native-only for successful route creation, saving favorites, and
  important toggles; not for every tap.
- Loading and route building should never block unrelated map interactions.

## Content voice

Russian, concise, active, friendly, concrete.

- Prefer: `Показать моё место`, `Маршрут готов`, `Повторить`, `Открыть в Яндекс Картах`.
- Avoid: `Нажмите, чтобы...`, vague `Ошибка`, raw exception strings, duplicate
  explanatory captions, and unexplained ellipses.
- Buttons use sentence case unless the established compact control is a short
  festival label.

Use ONLY the fonts, colors, spacing, and component styles defined here and in the
project theme. Do not introduce purple gradients, glassmorphism, serif fonts, or
new brand colors.

## CMS admin extension

The CMS is an operational desktop-first workspace for festival editors. It keeps
the same black, graphite, white, and amber identity, but favors clarity and
information density over the consumer app's promotional energy.

- Desktop shell: fixed 248px left sidebar, compact 72px top header, fluid content
  area with a 1280px maximum width. On narrow screens the sidebar becomes a
  drawer and the content remains a single readable column.
- Navigation: eight labeled destinations with simple line icons, a clearly
  selected amber state, logical grouping, and logout anchored at the bottom.
- Page header: title, one-line description, optional count/status, and the primary
  page action. Do not repeat the product title inside every content card.
- Forms: white or near-black text on graphite surfaces, persistent labels above
  controls, optional helper text below, 44px controls, visible keyboard focus,
  consistent validation, and a sticky action row for long edit forms.
- Content cards: 16px radius, 1px low-contrast border, 20–24px padding, explicit
  section title and description. Related fields are grouped; unrelated forms are
  never presented as identical anonymous panels.
- Tables: sticky header where useful, quiet row separators, 48–56px rows, compact
  status badges, descriptive empty states, and icon actions with accessible
  labels. Destructive actions require confirmation and never dominate a row.
- Image input: one reusable uploader with current preview, drag-and-drop target,
  file picker, preset/aspect-ratio hint, replace and remove actions, upload
  progress/error state, and no visible storage URL field. A current image is
  represented by its preview and filename/status, not a technical path.
- Feedback: successful saves use a dismissible green toast/banner; errors use a
  concise red alert with recovery guidance. Never expose encoded query strings or
  raw exception text.
- Typography: Montserrat remains the only brand font. Use 13–14px for dense table
  and helper copy, 14–16px for controls/body, 20–28px for page titles.
- Color constraints: background `#0B0B0C`, sidebar `#111113`, primary surface
  `#18181B`, raised surface `#202024`, border `#303036`, accent `#FFC107`, text
  `#FFFFFF`, secondary text `#A7A7B0`, success `#34C759`, danger `#FF453A`.
- Interaction: 150–200ms color/transform transitions, subtle hover lift only for
  clickable cards, no decorative animation, and full reduced-motion support.
