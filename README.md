# Black Pearl Capital — Website

A complete institutional redesign for **Black Pearl Capital**, a global multi-family
office and co-investment platform. Hand-built, dependency-free, and ready to deploy on
GitHub Pages.

> Design language: obsidian + midnight-navy with restrained champagne-gold accents · a
> serif voice (Newsreader), grotesque clarity (Hanken Grotesk) and mono precision
> (IBM Plex Mono). The signature element is a hand-authored **dotted world map** with
> animated capital-flow arcs linking the firm's four offices.

## Structure

```
black-pearl-capital/
├── index.html                 Single-page site (semantic, SEO + JSON-LD)
├── .nojekyll                  Serve assets verbatim on GitHub Pages
├── README.md
├── assets/
│   ├── css/styles.css         Design tokens + all section styling
│   ├── js/main.js             Orchestration: nav, hero, map markers, init
│   └── img/favicon.svg        Pearl mark / favicon
└── components/
    ├── world-map.js           Dotted equirectangular map + arcs + hubs
    └── reveal.js              Scroll reveals + animated counters
```

## Sections

Hero (cinematic map) · Key figures · The Firm · Investment Philosophy · Investment Focus ·
Track Record · Portfolio Companies · Founders · Global Presence (interactive map) · Contact · Footer.

## Run locally

It is fully static. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push the contents of this folder to a repository.
2. Settings → Pages → Deploy from branch → `main` / root.
3. The included `.nojekyll` file ensures the `assets/` and `components/` folders are served as-is.

## Notes

- **No build step, no frameworks.** Google Fonts load via CDN; everything else is local.
- **Accessibility:** semantic landmarks, keyboard-operable map markers and office list,
  visible focus states, and full `prefers-reduced-motion` support.
- **Founder portraits** use designed monogram plates. To use photography instead, drop an
  `<img>` into each `.founder__portrait` (the existing markup will layer correctly).
- Content reflects the firm's public information. Figures and copy are presented for
  presentation purposes and are not investment advice.
