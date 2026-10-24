/*
 * Astronomical core for the Panchang.
 * Sun and Moon positions follow Jean Meeus, "Astronomical Algorithms" (2nd ed.),
 * chapters 22 (nutation), 25 (Sun) and 47 (Moon). Accuracy is roughly 0.01° for
 * the Sun and ~10" for the Moon, which puts Panchang end-times within a minute.
 * All times are Unix milliseconds (UTC).
 */
(function (root) {
  'use strict';

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const sin = (d) => Math.sin(d * D2R);
  const cos = (d) => Math.cos(d * D2R);
  const norm360 = (x) => ((x % 360) + 360) % 360;

  function julianDay(ms) {
    return ms / 86400000 + 2440587.5;
  }

  // ΔT = TT − UT in seconds (Espenak & Meeus polynomial fits).
  function deltaT(year) {
    if (year >= 2005 && year < 2050) {
      const t = year - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    if (year >= 1950 && year < 2005) {
      const t = year - 1950;
      return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
    }
    const u = (year - 1820) / 100;
    if (year >= 2050 && year < 2150) return -20 + 32 * u * u - 0.5628 * (2150 - year);
    return -20 + 32 * u * u;
  }

  // Julian centuries of Terrestrial Time since J2000.0.
  function centuriesTT(ms) {
    const jd = julianDay(ms);
    const year = 2000 + (jd - 2451545) / 365.25;
    return (jd + deltaT(year) / 86400 - 2451545) / 36525;
  }

  function nutation(T) {
    const om = 125.04452 - 1934.136261 * T;
    const L = 280.4665 + 36000.7698 * T;
    const Lm = 218.3165 + 481267.8813 * T;
    const dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * om)) / 3600;
    const deps = (9.2 * cos(om) + 0.57 * cos(2 * L) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * om)) / 3600;
    const eps0 = 23.439291111 - 0.013004167 * T - 1.639e-7 * T * T + 5.036e-7 * T * T * T;
    return { dpsi, eps: eps0 + deps };
  }

  // Geocentric ecliptic longitude of the Sun (mean equinox of date, aberration applied, no nutation).
  function sunPosition(T) {
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
      (0.019993 - 0.000101 * T) * sin(2 * M) +
      0.000289 * sin(3 * M);
    return { lon: norm360(L0 + C - 0.00569), lat: 0 };
  }

  // Meeus table 47.A: [D, M, M', F, Σl coefficient, Σr coefficient]
  const MOON_LR = [
    [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884],
    [0, 1, 2, 0, -2120, 5751], [0, 2, 0, 0, -2069, 0],
    [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958],
    [0, 0, 2, 2, -1110, 0], [3, 0, -1, 0, -892, 3258],
    [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
    [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354],
    [2, 1, -2, 0, 691, 0], [2, -1, 0, -2, 596, 0],
    [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739],
    [2, 1, 0, -2, -399, 0], [0, 0, 2, -2, -381, -4421],
    [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0],
    [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0],
    [0, 2, 1, 0, -323, 1165], [1, 1, -1, 0, 299, 0],
    [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752],
  ];

  // Meeus table 47.B: [D, M, M', F, Σb coefficient]
  const MOON_B = [
    [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794], [0, 0, 0, 3, -1749],
    [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335],
    [0, 0, 3, 1, 1107], [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777], [4, 0, -2, 1, 671], [2, 0, 0, -3, 607],
    [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421],
    [2, 1, -1, 1, -366], [2, 1, 0, 1, -351], [4, 0, 0, 1, 331],
    [2, -1, 1, 1, 315], [2, -2, 0, -1, 302], [0, 0, 1, 3, -283],
    [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
    [0, 1, -2, -1, -220], [2, 1, -1, -1, -220], [1, 0, 1, 1, -185],
    [2, -1, -2, -1, 181], [0, 1, 2, 1, -177], [4, 0, -2, -1, 176],
    [4, -1, -1, -1, 166], [1, 0, 1, -1, -164], [4, 0, 1, -1, 132],
    [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107],
  ];

  // Geocentric ecliptic position of the Moon (mean equinox of date, no nutation). dist in km.
  function moonPosition(T) {
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
    const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
    const A1 = 119.75 + 131.849 * T;
    const A2 = 53.09 + 479264.29 * T;
    const A3 = 313.45 + 481266.484 * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const ecc = (m) => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);

    let sl = 0, sr = 0, sb = 0;
    for (const [d, m, mp, f, l, r] of MOON_LR) {
      const arg = norm360(d * D + m * M + mp * Mp + f * F);
      const e = ecc(m);
      sl += l * e * sin(arg);
      sr += r * e * cos(arg);
    }
    for (const [d, m, mp, f, b] of MOON_B) {
      sb += b * ecc(m) * sin(norm360(d * D + m * M + mp * Mp + f * F));
    }
    sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) +
      127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);

    return { lon: norm360(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
  }

  // Lahiri (Chitrapaksha) ayanamsa: 23°51'25.5" at J2000 plus general precession.
  function ayanamsa(T) {
    return 23.857092 + (5029.0966 * T + 1.11113 * T * T) / 3600;
  }

  // Tropical and sidereal longitudes of Sun and Moon at a given instant.
  function longitudes(ms) {
    const T = centuriesTT(ms);
    const sun = sunPosition(T).lon;
    const moon = moonPosition(T).lon;
    const ay = ayanamsa(T);
    return { sun, moon, ayanamsa: ay, sunSid: norm360(sun - ay), moonSid: norm360(moon - ay) };
  }

  function toEquatorial(lon, lat, eps) {
    const ra = Math.atan2(sin(lon) * cos(eps) - Math.tan(lat * D2R) * sin(eps), cos(lon)) * R2D;
    const dec = Math.asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)) * R2D;
    return { ra: norm360(ra), dec };
  }

  /*
   * Altitude of the body's centre minus the standard altitude of its rise/set
   * (upper limb on the horizon, with refraction). Positive means "above the horizon".
   */
  function altitudeAboveHorizon(body, ms, lat, lon) {
    const T = centuriesTT(ms);
    const nut = nutation(T);
    let pos, h0;
    if (body === 'sun') {
      pos = sunPosition(T);
      h0 = -0.8333;
    } else {
      pos = moonPosition(T);
      const parallax = Math.asin(6378.14 / pos.dist) * R2D;
      h0 = 0.7275 * parallax - 0.5667;
    }
    const eq = toEquatorial(pos.lon + nut.dpsi, pos.lat, nut.eps);
    const gmst = 280.46061837 + 360.98564736629 * (julianDay(ms) - 2451545) + nut.dpsi * cos(nut.eps);
    const H = gmst + lon - eq.ra;
    const alt = Math.asin(sin(lat) * sin(eq.dec) + cos(lat) * cos(eq.dec) * cos(H)) * R2D;
    return alt - h0;
  }

  // All horizon crossings of a body in [from, to). Returns [{ time, rising }].
  function horizonCrossings(body, from, to, lat, lon) {
    const step = 10 * 60000;
    const f = (t) => altitudeAboveHorizon(body, t, lat, lon);
    const events = [];
    let t0 = from, f0 = f(t0);
    while (t0 < to) {
      const t1 = t0 + step, f1 = f(t1);
      if (f0 < 0 !== f1 < 0) {
        let lo = t0, hi = t1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (f(mid) < 0 === f0 < 0) lo = mid; else hi = mid;
        }
        const time = (lo + hi) / 2;
        if (time >= from && time < to) events.push({ time, rising: f0 < 0 });
      }
      t0 = t1;
      f0 = f1;
    }
    return events;
  }

  function firstRise(body, from, to, lat, lon) {
    const e = horizonCrossings(body, from, to, lat, lon).find((x) => x.rising);
    return e ? e.time : null;
  }

  function firstSet(body, from, to, lat, lon) {
    const e = horizonCrossings(body, from, to, lat, lon).find((x) => !x.rising);
    return e ? e.time : null;
  }

  function lastSet(body, from, to, lat, lon) {
    const sets = horizonCrossings(body, from, to, lat, lon).filter((x) => !x.rising);
    return sets.length ? sets[sets.length - 1].time : null;
  }

  const Astro = {
    norm360, julianDay, centuriesTT, sunPosition, moonPosition, ayanamsa, longitudes,
    altitudeAboveHorizon, horizonCrossings, firstRise, firstSet, lastSet,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Astro;
  else root.Astro = Astro;
})(typeof window !== 'undefined' ? window : globalThis);
