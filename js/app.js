(function () {
  'use strict';

  const P = window.Panchang;
  const $ = (sel) => document.querySelector(sel);
  const STORAGE_KEY = 'panchang.location';
  const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const state = { loc: null, date: null };

  // ---------- Storage (optional; app works without it) ----------

  function loadLocation() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveLocation(loc) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      /* private mode or storage disabled */
    }
  }

  // ---------- Formatting ----------

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function dateKey(d) {
    return `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  }

  function fmtTime(ms) {
    if (ms == null) return '—';
    const tz = state.loc.tz;
    const time = new Intl.DateTimeFormat('en-IN', {
      timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(ms));
    const d = P.zonedDate(tz, ms);
    if (dateKey(d) === dateKey(state.date)) return time;
    const day = new Intl.DateTimeFormat('en-IN', { timeZone: tz, day: 'numeric', month: 'short' }).format(new Date(ms));
    return `${time}, ${day}`;
  }

  const fmtRange = (r) => `${fmtTime(r.start)} – ${fmtTime(r.end)}`;
  const nameHtml = ([en, hi]) => `${esc(en)}<span class="hi">${esc(hi)}</span>`;

  function todayIn(tz) {
    return P.zonedDate(tz, Date.now());
  }

  // ---------- Moon phase drawing ----------

  function moonSvg(elongation) {
    const r = 44, cx = 48, cy = 48;
    const rad = (elongation * Math.PI) / 180;
    const waxing = elongation < 180;
    const crescent = Math.cos(rad) > 0;
    const rx = Math.abs(Math.cos(rad)) * r;
    const outerSweep = waxing ? 1 : 0;
    const innerSweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    const lit = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;
    return `<svg class="hero-moon" viewBox="0 0 96 96" role="img" aria-label="Moon phase">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--moon-dark)"/>
      <path d="${lit}" fill="var(--moon-lit)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    </svg>`;
  }

  // ---------- Rendering ----------

  function limbHtml(label, items, extra = '') {
    const rows = items.map((x, i) => `
      <li>
        <span class="limb-name">${i > 0 ? 'then ' : ''}${nameHtml(x.name)}</span>
        <span class="limb-end">${x.end && x.end < state.result.sun.nextRise ? `until ${fmtTime(x.end)}` : 'full day'}</span>
      </li>`).join('');
    return `<div class="limb">
      <div class="limb-head"><span>${esc(label)}</span><span>${esc(extra)}</span></div>
      <ul class="limb-seq">${rows}</ul>
    </div>`;
  }

  function choghadiyaHtml(title, list) {
    const now = Date.now();
    const rows = list.map((c) => {
      const isNow = now >= c.start && now < c.end;
      return `<li class="${c.quality}${isNow ? ' now' : ''}">
        <span class="chog-name">${esc(c.name[0])} <span class="hi">${esc(c.name[1])}</span></span>
        <span class="chog-time">${fmtRange(c)}</span>
      </li>`;
    }).join('');
    return `<div><div class="chog-title">${title}</div><ul class="chog">${rows}</ul></div>`;
  }

  function render() {
    const { loc, date } = state;
    if (!loc) return;
    $('#locName').textContent = loc.name || `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`;
    $('#dateInput').value = dateKey(date);

    const r = P.computePanchang({ ...date, lat: loc.lat, lon: loc.lon, tz: loc.tz });
    state.result = r;

    const gregorian = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(date.year, date.month, date.day)));
    const t0 = r.tithi[0];
    const adhika = r.masa.adhika ? 'Adhika ' : '';
    const badges = r.observances.map((o) => `<span class="badge">${esc(o)}</span>`).join('');
    const illum = Math.round(r.moon.illumination * 100);
    const T = r.timings;

    $('#content').innerHTML = `
      ${r.warnings.map((w) => `<div class="status">${esc(w)}</div>`).join('')}
      <div class="grid">
        <section class="card hero span-all">
          ${moonSvg(r.moon.elongation)}
          <div class="hero-body">
            <p class="hero-date">${esc(gregorian)} · ${esc(r.vara[0])} (${esc(r.vara[1])})</p>
            <p class="hero-tithi">${esc(t0.paksha[0].split(' ')[0])} ${esc(t0.name[0])}
              <span class="hi">${esc(t0.paksha[1])} ${esc(t0.name[1])}</span></p>
            <p class="hero-meta">${adhika}${esc(r.masa.amantaName[0])} (Amanta) · ${adhika}${esc(r.masa.purnimantaName[0])} (Purnimanta) ·
              Vikram Samvat ${r.years.vikramChaitradi} · Moon ${illum}% lit</p>
            ${badges ? `<div class="badges">${badges}</div>` : ''}
          </div>
        </section>

        <section class="card">
          <h2>Sun &amp; Moon</h2>
          <div class="sunmoon">
            <div class="sm-item"><div class="sm-label">🌅 Sunrise</div><div class="sm-value">${fmtTime(r.sun.rise)}</div></div>
            <div class="sm-item"><div class="sm-label">🌇 Sunset</div><div class="sm-value">${fmtTime(r.sun.set)}</div></div>
            <div class="sm-item"><div class="sm-label">🌙 Moonrise</div><div class="sm-value">${r.moon.rise ? fmtTime(r.moon.rise) : 'None today'}</div></div>
            <div class="sm-item"><div class="sm-label">🌑 Moonset</div><div class="sm-value">${r.moon.set ? fmtTime(r.moon.set) : 'None today'}</div></div>
          </div>
          <dl class="kv" style="margin-top:14px">
            <dt>Moon sign (Chandra Rashi)</dt><dd>${r.moonRashi.map((x) => esc(x.name[0])).join(' → ')}</dd>
            <dt>Sun sign (Surya Rashi)</dt><dd>${r.sunRashi.map((x) => esc(x.name[0])).join(' → ')}</dd>
          </dl>
        </section>

        <section class="card">
          <h2>Panchang · पंचांग</h2>
          ${limbHtml('Tithi', r.tithi.map((x) => ({ ...x, name: [`${x.paksha[0].split(' ')[0]} ${x.name[0]}`, x.name[1]] })))}
          ${limbHtml('Nakshatra', r.nakshatra, `Pada ${r.nakshatraPada} at sunrise`)}
          ${limbHtml('Yoga', r.yoga)}
          ${limbHtml('Karana', r.karana)}
          <div class="limb">
            <div class="limb-head"><span>Vara</span></div>
            <ul class="limb-seq"><li><span class="limb-name">${nameHtml(r.vara)}</span></li></ul>
          </div>
        </section>

        <section class="card">
          <h2>Muhurta</h2>
          <div class="timing-group">
            <div class="timing-title"><span class="dot good"></span>Auspicious</div>
            <dl class="kv">
              <dt>Brahma Muhurta</dt><dd>${fmtRange(T.brahma)}</dd>
              <dt>Abhijit Muhurta${r.weekday === 3 ? ' <small>(avoided on Wednesday)</small>' : ''}</dt><dd>${fmtRange(T.abhijit)}</dd>
            </dl>
          </div>
          <div class="timing-group">
            <div class="timing-title"><span class="dot bad"></span>Inauspicious</div>
            <dl class="kv">
              <dt>Rahu Kaal</dt><dd>${fmtRange(T.rahuKaal)}</dd>
              <dt>Yamaganda</dt><dd>${fmtRange(T.yamaganda)}</dd>
              <dt>Gulika Kaal</dt><dd>${fmtRange(T.gulika)}</dd>
            </dl>
          </div>
        </section>

        <section class="card">
          <h2>Calendar</h2>
          <dl class="kv">
            <dt>Paksha</dt><dd>${nameHtml(r.paksha)}</dd>
            <dt>Month (Amanta)</dt><dd>${adhika}${esc(r.masa.amantaName[0])} ${esc(r.masa.amantaName[1])}</dd>
            <dt>Month (Purnimanta)</dt><dd>${adhika}${esc(r.masa.purnimantaName[0])} ${esc(r.masa.purnimantaName[1])}</dd>
            <dt>Ritu</dt><dd>${esc(r.ritu[0])} ${esc(r.ritu[1])}</dd>
            <dt>Ayana</dt><dd>${esc(r.ayana[0])}</dd>
            <dt>Vikram Samvat (Chaitradi)</dt><dd>${r.years.vikramChaitradi}</dd>
            <dt>Vikram Samvat (Kartikadi / Gujarati)</dt><dd>${r.years.vikramKartikadi}</dd>
            <dt>Shaka Samvat</dt><dd>${r.years.shaka}</dd>
            <dt>Samvatsara</dt><dd>${esc(r.years.samvatsara)}</dd>
            <dt>Ayanamsa (Lahiri)</dt><dd>${r.ayanamsa.toFixed(4)}°</dd>
          </dl>
        </section>

        <section class="card span-all">
          <h2>Choghadiya · चौघड़िया</h2>
          <div class="chog-wrap">
            ${choghadiyaHtml('☀️ Day', r.choghadiya.day)}
            ${choghadiyaHtml('🌙 Night', r.choghadiya.night)}
          </div>
        </section>
      </div>`;
  }

  function setStatus(msg) {
    $('#status').textContent = msg || '';
  }

  // ---------- Location ----------

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      const place = j.city || j.locality || j.principalSubdivision;
      return [place, j.countryCode].filter(Boolean).join(', ') || null;
    } catch {
      return null;
    }
  }

  function setLocation(loc) {
    const tzChanged = !state.loc || state.loc.tz !== loc.tz;
    state.loc = loc;
    if (!state.date || tzChanged) state.date = todayIn(loc.tz);
    saveLocation(loc);
    render();
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setStatus('This browser cannot share your location. Tap the location button to search for a city.');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('Location needs https or http://localhost. Run a local server (see README) or search for a city.');
      return;
    }
    setStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        // Without GPS or Wi-Fi the browser may fall back to an IP-based guess (wrong under a VPN).
        setStatus(accuracy > 5000
          ? `Your browser could only estimate your location roughly (±${Math.round(accuracy / 1000)} km), possibly from your IP address. If you use a VPN or this looks wrong, tap the location button and search for your city.`
          : '');
        setLocation({ lat, lon, tz: DEVICE_TZ, name: state.loc?.source === 'gps' ? state.loc.name : null, source: 'gps' });
        const name = await reverseGeocode(lat, lon);
        if (name) setLocation({ ...state.loc, name });
      },
      (err) => {
        const why = err.code === err.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not get your location.';
        setStatus(`${why} Tap the location button to search for a city.`);
        if (!state.loc) $('#locName').textContent = 'Choose location';
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }

  let searchTimer = null;
  let searchSeq = 0;

  async function searchCities(query) {
    const list = $('#cityResults');
    if (query.trim().length < 2) {
      list.innerHTML = '';
      return;
    }
    const seq = ++searchSeq;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
      const res = await fetch(url);
      const j = await res.json();
      if (seq !== searchSeq) return;
      const results = j.results || [];
      list.innerHTML = results.length
        ? results.map((c, i) => `<li><button type="button" data-i="${i}">${esc(c.name)}
            <small>${esc([c.admin1, c.country].filter(Boolean).join(', '))} · ${esc(c.timezone || '')}</small></button></li>`).join('')
        : '<li class="hint">No matches.</li>';
      list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const c = results[+b.dataset.i];
        setStatus('');
        setLocation({
          lat: c.latitude, lon: c.longitude, tz: c.timezone || DEVICE_TZ,
          name: [c.name, c.country_code].filter(Boolean).join(', '), source: 'search',
        });
        $('#locDialog').close();
      }));
    } catch {
      if (seq === searchSeq) list.innerHTML = '<li class="hint">City search needs an internet connection.</li>';
    }
  }

  // ---------- Date navigation ----------

  function shiftDate(days) {
    const d = new Date(Date.UTC(state.date.year, state.date.month, state.date.day + days));
    state.date = { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
    render();
  }

  function init() {
    $('#prevDay').addEventListener('click', () => state.loc && shiftDate(-1));
    $('#nextDay').addEventListener('click', () => state.loc && shiftDate(1));
    $('#todayBtn').addEventListener('click', () => {
      if (!state.loc) return;
      state.date = todayIn(state.loc.tz);
      render();
    });
    $('#dateInput').addEventListener('change', (e) => {
      const [y, m, d] = e.target.value.split('-').map(Number);
      if (!y || !state.loc) return;
      state.date = { year: y, month: m - 1, day: d };
      render();
    });

    $('#locBtn').addEventListener('click', () => {
      $('#locDialog').showModal();
      $('#citySearch').focus();
    });
    $('#gpsBtn').addEventListener('click', () => {
      $('#locDialog').close();
      locate();
    });
    $('#citySearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchCities(e.target.value), 300);
    });

    // Refresh the "now" highlight in Choghadiya every minute.
    setInterval(() => state.loc && render(), 60 * 1000);

    // A location in the URL (?lat=..&lon=..&tz=..&name=..) takes priority, e.g. for shared links.
    const q = new URLSearchParams(location.search);
    const lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      state.loc = { lat, lon, tz: q.get('tz') || DEVICE_TZ, name: q.get('name'), source: 'url' };
      state.date = todayIn(state.loc.tz);
      const date = q.get('date');
      if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
        const [y, m, d] = date.split('-').map(Number);
        state.date = { year: y, month: m - 1, day: d };
      }
      render();
      return;
    }

    const saved = loadLocation();
    if (saved) setLocation(saved);
    if (!saved || saved.source === 'gps') locate();
  }

  init();
})();
