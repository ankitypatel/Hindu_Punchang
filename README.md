# Hindu Panchang

A daily Hindu Panchang (पंचांग) web app for your current location. It runs entirely in the browser with no dependencies or build step.

## Features

- **Pancha-anga** – Tithi, Nakshatra (with pada), Yoga, Karana and Vara, with end times and the next element before the following sunrise
- **Sun & Moon** – sunrise, sunset, moonrise, moonset, moon phase, Chandra and Surya Rashi
- **Muhurta** – Brahma Muhurta, Abhijit, Rahu Kaal, Yamaganda, Gulika Kaal
- **Choghadiya** – day and night, with the current period highlighted
- **Calendar** – Amanta and Purnimanta month (including Adhika Masa), Paksha, Ritu, Ayana, Vikram Samvat (Chaitradi and Kartikadi/Gujarati), Shaka Samvat, Samvatsara
- **Observances** – Ekadashi, Purnima, Amavasya, Pradosh, Chaturthi, Sankranti and major festivals
- Light and dark themes, phone-friendly layout

## Run it

Browsers only share location with pages served over `https` or `localhost`, so start a local server in this folder:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

**Location and VPNs:** the app uses the browser's [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) (`navigator.geolocation`). The browser decides how to find you: GPS on phones, nearby Wi‑Fi networks on laptops, and, when neither is available, your IP address. A VPN changes that last one. If the reported accuracy is worse than 5 km, the app warns you. You can always use the 📍 button to search for a city. City search and the place name for your coordinates are the only network calls. All calculations happen on your device.

## How it calculates

- Sun and Moon positions: Jean Meeus, *Astronomical Algorithms* (ch. 22, 25, 47)
- Sidereal zodiac: Lahiri (Chitrapaksha) ayanamsa
- Drik method: the day runs from sunrise to sunrise; sunrise and sunset use the Sun's upper limb with standard refraction
- Times agree with published Drik panchangs to within about a minute

Festival dates follow the tithi at sunrise. Some festivals use other rules (for example, Diwali uses the Amavasya at Pradosh time), so regional calendars may list them on an adjacent day.

## Files

| File | Purpose |
| --- | --- |
| `js/astro.js` | Sun/Moon positions, rise/set, ayanamsa |
| `js/panchang.js` | Panchang elements, muhurtas, months, years, festivals |
| `js/app.js` | Location, date navigation, rendering |
| `index.html`, `styles.css` | Page and styling |
