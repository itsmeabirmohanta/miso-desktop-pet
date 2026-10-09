# MISO visual styling

The supplied MISO Brand & UI Guidelines are the visual source of truth. The existing screen structures, window placement, form sequences, logos, icons and mascot artwork remain unchanged.

`src/renderer/style.css` defines shared tokens used by the companion bubbles, calendar agenda, setup and settings. `src/renderer/setup.css` uses the same tokens.

| Token | Value | Role |
| --- | --- | --- |
| Charcoal | `#1E1E2E` | Primary text and focus outlines |
| Butter | `#FFC857` | Primary actions and active selections |
| Warm cream | `#FFF9EF` | Main canvas |
| Soft gray | `#A7A7B8` | Quiet accents and scrollbar handles |
| Mint | `#7ED389` | Connected indicators and meetings |
| Coral | `#FF7B78` | Destructive emphasis and important dates |

Pale supporting surfaces keep yellow selective. Muted text uses the darker `#646475` companion shade rather than soft gray, for readable small labels. Mint and coral labels use darker companion shades; labels remain visible alongside all semantic colours.

Locally bundled Baloo 2 supplies rounded headings and Inter supplies functional text. Typography never requires a network request. Font licenses are retained in `src/assets/fonts` and included in releases. System font fallbacks remain available.

The existing spacing, grids, control dimensions and popup positioning are retained. Controls share hover, keyboard focus, pressed and disabled states. Floating surfaces use soft charcoal shadows; backgrounds are flat rather than glossy. Reminder emphasis runs briefly, and the existing reduced-motion setting disables mascot animation.

Builds must include both font files and their licenses. Release audits allow only the named fonts and licenses, excluding authoring documentation from the installed app.
