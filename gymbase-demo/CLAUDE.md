# HyperFrames Composition Project

## Skills — invoke when needed

Skills encode framework-specific patterns. Load them explicitly when needed:

- `/hyperframes` — composition authoring, scenes, timeline
- `/hyperframes-cli` — CLI commands (lint, preview, render)
- `/gsap` — GSAP animations
- `/waapi` — Web Animations API

## Commands

```bash
npm run dev          # preview in browser (studio editor)
npm run check        # lint + validate + inspect
npm run render       # render to MP4
npx hyperframes docs <topic>
```

## Key Rules

1. Every timed element: `data-start`, `data-duration`, `data-track-index`
2. Visible timed elements: `class="clip"`
3. Timelines: `window.__timelines["id"] = gsap.timeline({ paused: true })`
4. Sub-compositions: `data-composition-src="compositions/file.html"`
5. No `Date.now()`, `Math.random()`, or network fetches
6. Run `npm run check` after every change
