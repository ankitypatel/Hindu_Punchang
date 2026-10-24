/*
 * Panchang calculations (Drik method, Lahiri ayanamsa).
 * A Panchang day runs from local sunrise to the next sunrise; every element is
 * reported as a sequence of { index, end } covering that span.
 */
(function (root) {
  'use strict';

  const A = root.Astro || require('./astro.js');
  const { norm360 } = A;
  const HOUR = 3600e3;
  const DAY = 86400e3;

  // [English, Hindi]
  const NAMES = {
    tithi: [
      ['Pratipada', 'प्रतिपदा'], ['Dwitiya', 'द्वितीया'], ['Tritiya', 'तृतीया'],
      ['Chaturthi', 'चतुर्थी'], ['Panchami', 'पंचमी'], ['Shashthi', 'षष्ठी'],
      ['Saptami', 'सप्तमी'], ['Ashtami', 'अष्टमी'], ['Navami', 'नवमी'],
      ['Dashami', 'दशमी'], ['Ekadashi', 'एकादशी'], ['Dwadashi', 'द्वादशी'],
      ['Trayodashi', 'त्रयोदशी'], ['Chaturdashi', 'चतुर्दशी'],
    ],
    purnima: ['Purnima', 'पूर्णिमा'],
    amavasya: ['Amavasya', 'अमावस्या'],
    paksha: [['Shukla Paksha', 'शुक्ल पक्ष'], ['Krishna Paksha', 'कृष्ण पक्ष']],
    nakshatra: [
      ['Ashwini', 'अश्विनी'], ['Bharani', 'भरणी'], ['Krittika', 'कृत्तिका'],
      ['Rohini', 'रोहिणी'], ['Mrigashira', 'मृगशिरा'], ['Ardra', 'आर्द्रा'],
      ['Punarvasu', 'पुनर्वसु'], ['Pushya', 'पुष्य'], ['Ashlesha', 'आश्लेषा'],
      ['Magha', 'मघा'], ['Purva Phalguni', 'पूर्वा फाल्गुनी'], ['Uttara Phalguni', 'उत्तरा फाल्गुनी'],
      ['Hasta', 'हस्त'], ['Chitra', 'चित्रा'], ['Swati', 'स्वाति'],
      ['Vishakha', 'विशाखा'], ['Anuradha', 'अनुराधा'], ['Jyeshtha', 'ज्येष्ठा'],
      ['Mula', 'मूल'], ['Purva Ashadha', 'पूर्वाषाढ़ा'], ['Uttara Ashadha', 'उत्तराषाढ़ा'],
      ['Shravana', 'श्रवण'], ['Dhanishta', 'धनिष्ठा'], ['Shatabhisha', 'शतभिषा'],
      ['Purva Bhadrapada', 'पूर्वा भाद्रपद'], ['Uttara Bhadrapada', 'उत्तरा भाद्रपद'], ['Revati', 'रेवती'],
    ],
    yoga: [
      ['Vishkambha', 'विष्कम्भ'], ['Priti', 'प्रीति'], ['Ayushman', 'आयुष्मान'],
      ['Saubhagya', 'सौभाग्य'], ['Shobhana', 'शोभन'], ['Atiganda', 'अतिगण्ड'],
      ['Sukarma', 'सुकर्मा'], ['Dhriti', 'धृति'], ['Shula', 'शूल'],
      ['Ganda', 'गण्ड'], ['Vriddhi', 'वृद्धि'], ['Dhruva', 'ध्रुव'],
      ['Vyaghata', 'व्याघात'], ['Harshana', 'हर्षण'], ['Vajra', 'वज्र'],
      ['Siddhi', 'सिद्धि'], ['Vyatipata', 'व्यतीपात'], ['Variyan', 'वरीयान'],
      ['Parigha', 'परिघ'], ['Shiva', 'शिव'], ['Siddha', 'सिद्ध'],
      ['Sadhya', 'साध्य'], ['Shubha', 'शुभ'], ['Shukla', 'शुक्ल'],
      ['Brahma', 'ब्रह्म'], ['Indra', 'इन्द्र'], ['Vaidhriti', 'वैधृति'],
    ],
    karanaMovable: [
      ['Bava', 'बव'], ['Balava', 'बालव'], ['Kaulava', 'कौलव'], ['Taitila', 'तैतिल'],
      ['Gara', 'गर'], ['Vanija', 'वणिज'], ['Vishti (Bhadra)', 'विष्टि (भद्रा)'],
    ],
    karanaFixed: {
      0: ['Kimstughna', 'किंस्तुघ्न'],
      57: ['Shakuni', 'शकुनि'],
      58: ['Chatushpada', 'चतुष्पाद'],
      59: ['Naga', 'नाग'],
    },
    rashi: [
      ['Mesha', 'मेष'], ['Vrishabha', 'वृषभ'], ['Mithuna', 'मिथुन'], ['Karka', 'कर्क'],
      ['Simha', 'सिंह'], ['Kanya', 'कन्या'], ['Tula', 'तुला'], ['Vrishchika', 'वृश्चिक'],
      ['Dhanu', 'धनु'], ['Makara', 'मकर'], ['Kumbha', 'कुम्भ'], ['Meena', 'मीन'],
    ],
    vara: [
      ['Ravivara', 'रविवार'], ['Somavara', 'सोमवार'], ['Mangalavara', 'मंगलवार'],
      ['Budhavara', 'बुधवार'], ['Guruvara', 'गुरुवार'], ['Shukravara', 'शुक्रवार'],
      ['Shanivara', 'शनिवार'],
    ],
    masa: [
      ['Chaitra', 'चैत्र'], ['Vaishakha', 'वैशाख'], ['Jyeshtha', 'ज्येष्ठ'], ['Ashadha', 'आषाढ़'],
      ['Shravana', 'श्रावण'], ['Bhadrapada', 'भाद्रपद'], ['Ashwin', 'आश्विन'], ['Kartika', 'कार्तिक'],
      ['Margashirsha', 'मार्गशीर्ष'], ['Pausha', 'पौष'], ['Magha', 'माघ'], ['Phalguna', 'फाल्गुन'],
    ],
    ritu: [
      ['Vasanta', 'वसन्त'], ['Grishma', 'ग्रीष्म'], ['Varsha', 'वर्षा'],
      ['Sharad', 'शरद'], ['Hemanta', 'हेमन्त'], ['Shishira', 'शिशिर'],
    ],
    ayana: { uttara: ['Uttarayana', 'उत्तरायण'], dakshina: ['Dakshinayana', 'दक्षिणायन'] },
    choghadiya: [
      ['Udveg', 'उद्वेग', 'bad'], ['Chal', 'चल', 'neutral'], ['Labh', 'लाभ', 'good'],
      ['Amrit', 'अमृत', 'good'], ['Kaal', 'काल', 'bad'], ['Shubh', 'शुभ', 'good'],
      ['Rog', 'रोग', 'bad'],
    ],
    samvatsara: [
      'Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati', 'Angirasa', 'Shrimukha', 'Bhava',
      'Yuva', 'Dhatri', 'Ishvara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha', 'Chitrabhanu',
      'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikriti',
      'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi',
      'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu',
      'Parabhava', 'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi',
      'Pramadi', 'Ananda', 'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudra',
      'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya',
    ],
  };

  function tithiName(i) {
    if (i === 14) return NAMES.purnima;
    if (i === 29) return NAMES.amavasya;
    return NAMES.tithi[i % 15];
  }

  function karanaName(i) {
    return NAMES.karanaFixed[i] || NAMES.karanaMovable[(i - 1) % 7];
  }

  // Each element is an angle divided into equal spans.
  const ELEMENTS = {
    tithi: { span: 12, angle: (L) => norm360(L.moon - L.sun) },
    karana: { span: 6, angle: (L) => norm360(L.moon - L.sun) },
    nakshatra: { span: 360 / 27, angle: (L) => L.moonSid },
    yoga: { span: 360 / 27, angle: (L) => norm360(L.sunSid + L.moonSid) },
    moonRashi: { span: 30, angle: (L) => L.moonSid },
    sunRashi: { span: 30, angle: (L) => L.sunSid },
  };

  function angleOf(kind, ms) {
    return ELEMENTS[kind].angle(A.longitudes(ms));
  }

  // The division in effect at `ms` and the instant it ends.
  function currentDivision(kind, ms) {
    const { span } = ELEMENTS[kind];
    const index = Math.floor(angleOf(kind, ms) / span);
    const target = ((index + 1) * span) % 360;
    const diff = (t) => {
      const d = norm360(angleOf(kind, t) - target);
      return d > 180 ? d - 360 : d;
    };
    // The Sun needs ~31 days per sign; everything else ends within ~1.2 days.
    const step = kind === 'sunRashi' ? DAY : 2 * HOUR;
    let lo = ms, hi = ms + step;
    while (diff(hi) < 0) {
      lo = hi;
      hi += step;
      if (hi - ms > 40 * DAY) return { index, end: null };
    }
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (diff(mid) < 0) lo = mid; else hi = mid;
    }
    return { index, end: hi };
  }

  // All divisions of `kind` that are in effect between `from` and `to`.
  function sequence(kind, from, to) {
    const out = [];
    let t = from;
    while (t < to && out.length < 6) {
      const d = currentDivision(kind, t);
      out.push(d);
      if (d.end == null) break;
      t = d.end + 1000;
    }
    return out;
  }

  // Signed elongation Moon − Sun in (−180, 180].
  function elongation(ms) {
    const L = A.longitudes(ms);
    const e = norm360(L.moon - L.sun);
    return e > 180 ? e - 360 : e;
  }

  // New moon nearest to `guess` (Newton iteration on the elongation).
  function newMoonNear(guess) {
    let t = guess;
    for (let i = 0; i < 10; i++) t -= (elongation(t) / 12.19) * DAY;
    return t;
  }

  function previousNewMoon(ms) {
    const e = norm360(elongation(ms));
    return newMoonNear(ms - (e / 12.19) * DAY);
  }

  // ---------- Time-zone helpers ----------

  const formatters = {};
  function formatter(tz) {
    return formatters[tz] || (formatters[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
  }

  function tzOffset(tz, ms) {
    const p = {};
    for (const part of formatter(tz).formatToParts(new Date(ms))) p[part.type] = +part.value;
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  }

  // UTC instant of a wall-clock time in `tz`.
  function zonedToUtc(tz, y, m, d, h = 0, min = 0) {
    const guess = Date.UTC(y, m, d, h, min);
    const first = guess - tzOffset(tz, guess);
    return guess - tzOffset(tz, first);
  }

  // Wall-clock date in `tz` of an instant: { year, month, day }.
  function zonedDate(tz, ms) {
    const local = new Date(ms + tzOffset(tz, ms));
    return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate() };
  }

  // ---------- Day-level calculations ----------

  const RAHU = [8, 2, 7, 5, 6, 4, 3];
  const YAMAGANDA = [5, 4, 3, 2, 1, 7, 6];
  const GULIKA = [7, 6, 5, 4, 3, 2, 1];

  function choghadiya(start, end, firstIndex, step) {
    const part = (end - start) / 8;
    return Array.from({ length: 8 }, (_, i) => {
      const idx = (((firstIndex + i * step) % 7) + 7) % 7;
      const [en, hi, quality] = NAMES.choghadiya[idx];
      return { name: [en, hi], quality, start: start + i * part, end: start + (i + 1) * part };
    });
  }

  // Major festivals keyed by "amantaMonth-tithiIndex" (tithi prevailing at sunrise).
  const FESTIVALS = {
    '0-0': 'Chaitra Navratri begins · Gudi Padwa · Ugadi',
    '0-8': 'Rama Navami',
    '0-14': 'Hanuman Jayanti',
    '1-2': 'Akshaya Tritiya',
    '3-10': 'Devshayani Ekadashi',
    '3-14': 'Guru Purnima',
    '4-4': 'Nag Panchami',
    '4-14': 'Raksha Bandhan',
    '4-22': 'Krishna Janmashtami',
    '5-3': 'Ganesh Chaturthi',
    '6-0': 'Sharad Navratri begins',
    '6-9': 'Vijayadashami (Dussehra)',
    '6-14': 'Sharad Purnima',
    '6-18': 'Karwa Chauth',
    '6-27': 'Dhanteras',
    '6-28': 'Narak Chaturdashi',
    '6-29': 'Diwali (Lakshmi Puja)',
    '7-0': 'Govardhan Puja · Gujarati New Year',
    '7-1': 'Bhai Dooj',
    '7-10': 'Prabodhini (Dev Uthani) Ekadashi',
    '7-14': 'Kartik Purnima · Dev Diwali',
    '10-4': 'Vasant Panchami',
    '10-28': 'Maha Shivaratri',
    '11-14': 'Holika Dahan',
  };

  function observances(tithiAtSunrise, tithiAtSunset, masa, sunRashiSeq) {
    const list = [];
    const paksha = tithiAtSunrise < 15 ? 'Shukla' : 'Krishna';
    const t = tithiAtSunrise;
    if (!masa.adhika && FESTIVALS[`${masa.amanta}-${t}`]) list.push(FESTIVALS[`${masa.amanta}-${t}`]);
    if (t === 10 || t === 25) list.push(`${paksha} Ekadashi`);
    if (t === 14) list.push('Purnima');
    if (t === 29) list.push('Amavasya');
    if (t === 3) list.push('Vinayaka Chaturthi');
    if (t === 18) list.push('Sankashti Chaturthi');
    if (t === 28) list.push('Masik Shivaratri');
    if (tithiAtSunset === 12 || tithiAtSunset === 27) list.push('Pradosh Vrat');
    if (sunRashiSeq.length > 1) list.push(`${NAMES.rashi[sunRashiSeq[1].index][0]} Sankranti`);
    return [...new Set(list)];
  }

  function computePanchang({ year, month, day, lat, lon, tz }) {
    const dayStart = zonedToUtc(tz, year, month, day);
    const next = new Date(Date.UTC(year, month, day + 1));
    const dayEnd = zonedToUtc(tz, next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());
    const warnings = [];

    let sunrise = A.firstRise('sun', dayStart, dayEnd, lat, lon);
    if (sunrise == null) {
      warnings.push('The Sun does not rise on this date here; 06:00 local time is used as sunrise.');
      sunrise = zonedToUtc(tz, year, month, day, 6);
    }
    let sunset = A.firstSet('sun', sunrise, sunrise + DAY, lat, lon);
    if (sunset == null) {
      warnings.push('The Sun does not set on this date here; 18:00 local time is used as sunset.');
      sunset = zonedToUtc(tz, year, month, day, 18);
    }
    const nextSunrise = A.firstRise('sun', sunset, sunset + DAY, lat, lon) ?? sunrise + DAY;
    const prevSunset = A.lastSet('sun', sunrise - DAY, sunrise, lat, lon) ?? sunset - DAY;

    const moonrise = A.firstRise('moon', dayStart, dayEnd, lat, lon);
    const moonset = A.firstSet('moon', dayStart, dayEnd, lat, lon);

    const L = A.longitudes(sunrise);
    const limbs = {};
    for (const kind of ['tithi', 'karana', 'nakshatra', 'yoga', 'moonRashi']) {
      limbs[kind] = sequence(kind, sunrise, nextSunrise);
    }
    const sunRashi = sequence('sunRashi', sunrise, nextSunrise);
    const pada = Math.floor(L.moonSid / (360 / 108)) % 4 + 1;
    const tithiIndex = limbs.tithi[0].index;
    const tithiAtSunset = currentDivision('tithi', sunset).index;

    // Lunar month (Amanta): named from the Sun's sign at the preceding new moon.
    const prevNM = previousNewMoon(sunrise);
    const nextNM = newMoonNear(prevNM + 29.53 * DAY);
    const signAtPrev = Math.floor(A.longitudes(prevNM).sunSid / 30);
    const signAtNext = Math.floor(A.longitudes(nextNM).sunSid / 30);
    const amanta = (signAtPrev + 1) % 12;
    const masa = {
      amanta,
      purnimanta: tithiIndex >= 15 ? (amanta + 1) % 12 : amanta,
      adhika: signAtPrev === signAtNext,
    };

    // Years. Chaitradi years turn at Chaitra Shukla Pratipada, Kartikadi at Kartika Shukla Pratipada.
    const chaitraPassed = !(month < 6 && amanta >= 8);
    const kartikaPassed = month >= 9 && amanta >= 7;
    const shaka = year - (chaitraPassed ? 78 : 79);

    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    const dayLen = sunset - sunrise;
    const nightLen = sunrise - prevSunset;
    const eighth = (n) => ({ start: sunrise + ((n - 1) * dayLen) / 8, end: sunrise + (n * dayLen) / 8 });
    const dayMuhurta = dayLen / 15;
    const nightMuhurta = nightLen / 15;
    const dayStartIdx = (weekday * 3) % 7;

    const elong = norm360(L.moon - L.sun);

    return {
      input: { year, month, day, lat, lon, tz },
      warnings,
      weekday,
      vara: NAMES.vara[weekday],
      sun: { rise: sunrise, set: sunset, nextRise: nextSunrise },
      moon: {
        rise: moonrise,
        set: moonset,
        elongation: elong,
        illumination: (1 - Math.cos((elong * Math.PI) / 180)) / 2,
      },
      tithi: limbs.tithi.map((x) => ({ ...x, name: tithiName(x.index), paksha: NAMES.paksha[x.index < 15 ? 0 : 1] })),
      karana: limbs.karana.map((x) => ({ ...x, name: karanaName(x.index) })),
      nakshatra: limbs.nakshatra.map((x) => ({ ...x, name: NAMES.nakshatra[x.index] })),
      nakshatraPada: pada,
      yoga: limbs.yoga.map((x) => ({ ...x, name: NAMES.yoga[x.index] })),
      moonRashi: limbs.moonRashi.map((x) => ({ ...x, name: NAMES.rashi[x.index] })),
      sunRashi: sunRashi.map((x) => ({ ...x, name: NAMES.rashi[x.index] })),
      paksha: NAMES.paksha[tithiIndex < 15 ? 0 : 1],
      masa: {
        ...masa,
        amantaName: NAMES.masa[masa.amanta],
        purnimantaName: NAMES.masa[masa.purnimanta],
      },
      ritu: NAMES.ritu[Math.floor(amanta / 2)],
      ayana: L.sun >= 270 || L.sun < 90 ? NAMES.ayana.uttara : NAMES.ayana.dakshina,
      years: {
        vikramChaitradi: year + (chaitraPassed ? 57 : 56),
        vikramKartikadi: year + (kartikaPassed ? 57 : 56),
        shaka,
        samvatsara: NAMES.samvatsara[(shaka + 11) % 60],
      },
      ayanamsa: L.ayanamsa,
      timings: {
        rahuKaal: eighth(RAHU[weekday]),
        yamaganda: eighth(YAMAGANDA[weekday]),
        gulika: eighth(GULIKA[weekday]),
        abhijit: { start: sunrise + 7 * dayMuhurta, end: sunrise + 8 * dayMuhurta },
        brahma: { start: sunrise - 2 * nightMuhurta, end: sunrise - nightMuhurta },
      },
      choghadiya: {
        day: choghadiya(sunrise, sunset, dayStartIdx, 1),
        night: choghadiya(sunset, nextSunrise, (dayStartIdx + 5) % 7, -2),
      },
      observances: observances(tithiIndex, tithiAtSunset, masa, sunRashi),
    };
  }

  const Panchang = { NAMES, computePanchang, zonedToUtc, zonedDate, tzOffset, previousNewMoon };

  if (typeof module !== 'undefined' && module.exports) module.exports = Panchang;
  else root.Panchang = Panchang;
})(typeof window !== 'undefined' ? window : globalThis);
