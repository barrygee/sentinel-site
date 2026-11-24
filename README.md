# Sentinel site

The landing page for [Sentinel](https://github.com/barrygee/Sentinel), served with GitHub Pages.

`index.html` is the whole page in one self-contained file: styles, scripts, the 3D globe, screenshots and fonts' fallbacks are all inside it, so GitHub Pages serves it as is.

## Edit the page

Edit the files in `src/`, then rebuild `index.html`:

```bash
python3 build.py
```

Commit both `src/` and the rebuilt `index.html`. Nothing needs installing beyond Python 3.

| File | Holds |
| --- | --- |
| `src/template.html` | The page: markup, styles and scripts |
| `src/globe.js` | The header globe (three.js), spliced into the template at build time |
| `src/logo.svg` | The Sentinel logo |
| `src/data/` | Screenshots (`imgs2.json`), map data, the ISS orbit and country names |
| `src/vendor/` | three.js and satellite.js |

### Text you'll change most

All in `src/template.html`:

- **Header points** (the black labels under SENTINEL, per section): `window.HERO_POINTS`.
- **Section points** (the black labels under each section title): `window.SECTION_POINTS`.
- **Globe traffic and speed**: `window.GLOBE_MAX_AIR`, `window.GLOBE_MAX_SEA`, `window.GLOBE_TIME_SCALE`.

## ISS orbit

`iss-tle.json` holds the ISS orbit (TLE) the header globe uses. The page reads it on load and every 30 minutes, so replacing the two TLE lines in that file moves the ISS without a rebuild. If the file can't be read, the page falls back to the copy built into `index.html`.

## GitHub Pages

**Settings › Pages › Build and deployment**: Source **Deploy from a branch**, branch **main**, folder **/ (root)**. The page is then at `https://barrygee.github.io/sentinel-site/`.

`.nojekyll` tells Pages to serve the files as they are.
