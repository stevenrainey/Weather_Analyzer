# Weather_Analyzer

Analyzes weather patterns to make sure you wear the right outfit!

A simple, dependency-free weather website. Search for any city (or use your
location) to see current conditions, a 5-day outlook, and outfit suggestions
tailored to the temperature, rain, wind, and UV.

## Run it

It's a static site — no build step or API key needed. Either:

- **Open directly:** double-click `index.html`, or
- **Serve locally** (recommended, so geolocation works):

  ```sh
  python3 -m http.server 8000
  ```

  then visit <http://localhost:8000>.

## How it works

- **Geocoding + forecast:** the free [Open-Meteo](https://open-meteo.com) API
  (no key required).
- `index.html` — markup, `style.css` — styling, `app.js` — fetch + outfit logic.

The outfit recommendation in `analyzeOutfit()` keys off the *apparent*
temperature plus rain chance, wind speed, and UV index.
