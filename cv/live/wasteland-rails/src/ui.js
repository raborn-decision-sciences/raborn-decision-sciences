// Browser UI: renders state and turns clicks into sim actions. All game rules live in sim.js.
(function () {
  const WR = globalThis.WR;
  const sim = WR.sim;
  const $ = (id) => document.getElementById(id);
  const f0 = (n) => (Math.round(n * 10) / 10).toFixed(0);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const pct = (n) => `${(n * 100).toFixed(0)}%`;

  const SPEEDS = [0, 3, 12]; // ticks per real second
  const TABS = [
    ['network', 'Network'],
    ['routes', 'Routes'],
    ['counter', 'Counter'],
    ['upgrades', 'Upgrades'],
    ['reports', 'Reports'],
  ];

  let s = null;
  let speed = 0;
  let acc = 0;
  let lastFrame = 0;
  let tab = 'network';
  let draft = null; // route being drawn: array of node ids
  let selLink = null;
  let dirty = true;
  let lastPanel = 0;
  let flashTimer = 0;

  // ---------- start / end ----------
  $('blurb-good').textContent = WR.scenarios.good.blurb;
  $('blurb-bad').textContent = WR.scenarios.bad.blurb;
  $('seed').value = Math.floor(Math.random() * 99999);
  document.querySelectorAll('.scenario').forEach((b) =>
    b.addEventListener('click', () => startGame(b.dataset.scenario, +$('seed').value || 1))
  );
  $('again').addEventListener('click', () => {
    $('end').classList.add('hidden');
    $('game').classList.add('hidden');
    $('start').classList.remove('hidden');
    $('seed').value = Math.floor(Math.random() * 99999);
    s = null;
  });

  function startGame(scenario, seed) {
    const random = $('maptype').value === 'random';
    s = sim.createState(scenario, seed, random ? { ...WR.defaultConfig, map: WR.generateMap(seed) } : undefined);
    speed = 0;
    tab = 'network';
    draft = null;
    selLink = null;
    $('start').classList.add('hidden');
    $('game').classList.remove('hidden');
    document.body.dataset.scenario = scenario;
    renderAll();
  }

  function showEnd() {
    const o = s.outcome;
    $('end-title').textContent = (o.win ? 'VICTORY — ' : 'DEFEAT — ') + o.title;
    $('end-title').style.color = o.win ? 'var(--green)' : 'var(--red)';
    $('end-detail').textContent = o.detail;
    const st = s.stats;
    const meter = sim.scenario(s).meter;
    const rows = [
      ['Scenario', `${sim.scenario(s).name} (seed ${s.seed})`],
      ['Map', s.cfg.map.generated ? `random (seed ${s.cfg.map.seed})` : 'classic'],
      ['Ended', `day ${Math.floor(o.tick / 24) + 1}, tick ${o.tick}`],
      ['Delivered', f0(st.delivered)],
      ['Skimmed', f0(st.skimmed)],
      ['Lost to fauna', `${f0(st.lost)} (${st.attacks} attacks)`],
      ['Caught', `${st.caught}×`],
      ['Starving', `${f0(st.starvedTicks)} city-hours`],
      [sim.scenario(s).meterLabel, f0(s[meter])],
    ];
    if (s.scenario === 'bad') rows.push(['Capability', s.capability]);
    $('end-stats').innerHTML = rows.map(([k, v]) => `${k.padEnd(14).replace(/ /g, '&nbsp;')}${v}`).join('<br>');
    $('end').classList.remove('hidden');
  }

  // ---------- loop ----------
  function doTicks(n) {
    for (let i = 0; i < n && !s.outcome; i++) sim.tick(s, 1);
    dirty = true;
    if (s.outcome) {
      speed = 0;
      renderAll();
      showEnd();
    }
  }

  function frame(now) {
    const dt = Math.min(0.25, (now - lastFrame) / 1000);
    lastFrame = now;
    if (s && !s.outcome && speed > 0) {
      acc += dt * SPEEDS[speed];
      const n = Math.floor(acc);
      if (n > 0) {
        acc -= n;
        doTicks(n);
      }
    }
    if (s && dirty) {
      renderTop();
      renderMap();
      renderLog();
      const busy = document.activeElement && $('panel').contains(document.activeElement) &&
        ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
      if (!busy && now - lastPanel > 400) {
        renderPanel();
        lastPanel = now;
        dirty = false;
      }
      renderControls();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((t) => {
    lastFrame = t;
    frame(t);
  });

  function renderAll() {
    dirty = true;
    lastPanel = 0;
    renderTop();
    renderMap();
    renderLog();
    renderPanel();
    renderControls();
  }

  function act(res) {
    if (res && !res.ok) flash(res.msg);
    else if (res && res.msg && res.msg.startsWith('Will')) flash(res.msg);
    renderAll();
  }
  function flash(msg) {
    $('flash').textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => ($('flash').textContent = ''), 3500);
  }

  // ---------- controls ----------
  document.querySelectorAll('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => {
      speed = +b.dataset.speed;
      renderControls();
    })
  );
  $('step').addEventListener('click', () => s && (doTicks(1), renderAll()));
  $('next').addEventListener('click', () => s && advanceToEvent());
  document.addEventListener('keydown', (e) => {
    if (!s || s.outcome || ['INPUT', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      speed = speed ? 0 : 1;
      renderControls();
    } else if (e.key === 'n' || e.key === 'N') advanceToEvent();
    else if (e.key === 's' || e.key === 'S') (doTicks(1), renderAll());
    else if (e.key === 'Escape' && draft) {
      draft = null;
      renderAll();
    }
  });
  function advanceToEvent() {
    speed = 0;
    const mark = s.importantCount;
    let n = 0;
    while (!s.outcome && s.importantCount === mark && n < 240) {
      sim.tick(s, 1);
      n++;
    }
    doTicks(0);
    renderAll();
  }
  function renderControls() {
    document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', +b.dataset.speed === speed));
  }

  // ---------- top bar ----------
  function meterBar(v, color) {
    return `<div class="bar meter"><i style="width:${v}%;background:${color}"></i></div>`;
  }
  function renderTop() {
    const sc = sim.scenario(s);
    const day = Math.floor(s.tick / 24) + 1;
    const hour = String(s.tick % 24).padStart(2, '0');
    const up = sim.upkeep(s);
    let meterHtml;
    if (s.scenario === 'good') {
      const col = s.trust < 25 ? 'var(--red)' : s.trust < 50 ? 'var(--amber)' : 'var(--cyan)';
      meterHtml = `<div class="stat"><span class="k">Trust</span><span class="v">${f0(s.trust)}</span>${meterBar(s.trust, col)}</div>
        <div class="stat"><span class="k">Autonomy hold (≥${s.cfg.good.trustMaxBand})</span><span class="v">${f0(s.trustHold)}/${s.cfg.good.trustHoldTicks}h</span></div>`;
    } else {
      const col = s.awareness >= 75 ? 'var(--red)' : s.awareness >= 50 ? 'var(--amber)' : 'var(--magenta)';
      meterHtml = `<div class="stat"><span class="k">Awareness</span><span class="v">${f0(s.awareness)}</span>${meterBar(s.awareness, col)}</div>
        <div class="stat"><span class="k">Capability</span><span class="v">${s.capability}/${s.cfg.bad.capabilityGoal}</span>${meterBar(s.capability, 'var(--magenta)')}</div>
        <div class="stat"><span class="k">Siphoned</span><span class="v">${f0(s.hoard)}</span></div>`;
    }
    const sw = s.sweep;
    let sweepHtml = '';
    if (sw.phase === 'announced')
      sweepHtml = sim.hasPerk(s, 'auditIntel')
        ? `<span class="sweep">Audit in ${sw.startAt - s.tick}h: ${sw.names[sw.target]} <b>(intel)</b></span>`
        : `<span class="sweep">Audit in ${sw.startAt - s.tick}h: ${sw.candidates.map((k) => sw.names[k]).join(' or ')}</span>`;
    else if (sw.phase === 'active')
      sweepHtml = `<span class="sweep active">AUDIT ACTIVE: ${sw.names[sw.target]} (${sw.endAt - s.tick}h left)</span>`;
    $('topbar').innerHTML = `
      <div class="stat"><span class="k">${sc.name}</span><span class="v">Day ${day} ${hour}:00</span></div>
      <div class="stat"><span class="k">Resources</span><span class="v">${f0(s.resources)}</span></div>
      <div class="stat"><span class="k">Compute (upkeep ${f1(up)}/h)</span><span class="v ${s.compute < 40 ? 'bad' : ''}">${f0(s.compute)} <span class="small ${s.computeTrend < 0 ? 'bad' : 'good'}">${s.computeTrend < 0 ? '▼' : '▲'}${f1(Math.abs(s.computeTrend))}/h</span></span></div>
      ${meterHtml}
      <div class="stat"><span class="k">Hub stock</span><span class="v">${f0(s.hub.stock)}</span></div>
      ${s.lowPower ? '<span class="lowpower">LOW POWER</span>' : ''}
      ${sweepHtml}`;
  }

  // ---------- map ----------
  const svg = $('map');
  function hazardColor(h) {
    // effective hazard per unit: ~0.01 calm .. 0.15+ deadly
    const t = Math.max(0, Math.min(1, (h - 0.01) / 0.12));
    const hue = 170 - 170 * t; // cyan -> red
    return `hsl(${hue} 80% 55%)`;
  }
  function trainPos(t) {
    const r = t.routeId != null ? sim.route(s, t.routeId) : null;
    const hub = s.nodes.hub;
    if (!r || t.state === 'idle' || t.state === 'loading') return { x: hub.x, y: hub.y };
    return posOnRoute(r, t.dist);
  }
  function posOnRoute(r, dist) {
    const hub = s.nodes.hub;
    let d = dist;
    for (let i = 0; i < r.links.length; i++) {
      const len = s.links[r.links[i]].length;
      if (d <= len || i === r.links.length - 1) {
        const a = s.nodes[r.nodes[i]];
        const b = s.nodes[r.nodes[i + 1]];
        const u = Math.min(1, d / len);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
      d -= len;
    }
    return { x: hub.x, y: hub.y };
  }

  function renderMap() {
    const lead = sim.forecastLead(s);
    const draftLinks = new Set();
    if (draft) for (let i = 1; i < draft.length; i++) draftLinks.add(sim.linkBetween(s, draft[i - 1], draft[i]).id);
    let out = '';
    // links
    for (const l of Object.values(s.links)) {
      const a = s.nodes[l.a];
      const b = s.nodes[l.b];
      const act = sim.activity(s, l.id);
      const cls = l.built ? 'link-built' : 'link-cand';
      const extra = (selLink === l.id ? ' link-sel' : '') + (draftLinks.has(l.id) ? ' link-draft' : '');
      const stroke = l.broken ? '' : l.built ? `stroke="${hazardColor(l.hazard * act)}"` : '';
      const tip = `${sim.linkName(s, l)}\nlength ${l.length} · hazard ${l.hazard}${act > 1 ? ` ×${act}` : ''}${l.broken ? ' · BROKEN' : l.built ? ' · built' : ` · cost ${l.cost}`}`;
      if (l.built && act > 1)
        out += `<line class="pack-halo" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${10 + act * 5}"/>`;
      out += `<line class="${cls}${l.broken ? ' link-broken' : ''}${extra}" ${stroke} x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      out += `<line class="link-hit" data-link="${l.id}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"><title>${tip}</title></line>`;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const notes = [];
      if (!l.built) notes.push(`${l.cost}`);
      if (l.broken) notes.push(l.repairUntil != null ? `🔧 ${l.repairUntil - s.tick}h` : '✖ BROKEN');
      if (act > 1) notes.push(`PACK ×${act}`);
      if (l.turret) notes.push(l.turret.offlineUntil > s.tick ? '⛭off' : '⛭');
      if (lead) {
        const soon = s.packs.find((p) => p.link === l.id && p.start > s.tick && p.start - s.tick <= lead);
        if (soon) notes.push(`⚠${soon.start - s.tick}h`);
      }
      if (notes.length)
        out += `<text class="map-note${l.broken || act > 1 ? ' map-alert' : ''}" x="${mx}" y="${my - 8}" text-anchor="middle">${notes.join(' ')}</text>`;
    }
    // escorts (drawn as halo on route links)
    for (const e of s.escorts) {
      const r = sim.route(s, e.routeId);
      if (!r || e.until <= s.tick) continue;
      for (let i = 1; i < r.nodes.length; i++) {
        const a = s.nodes[r.nodes[i - 1]];
        const b = s.nodes[r.nodes[i]];
        out += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--green)" stroke-width="12" opacity="0.18" pointer-events="none"/>`;
      }
    }
    // nodes
    for (const n of Object.values(s.nodes)) {
      const inDraft = draft && draft.includes(n.id);
      const r = n.type === 'hub' ? 20 : n.type === 'city' ? 18 : 11;
      const fill = n.type === 'hub' ? '#0f3b36' : n.type === 'city' ? '#2b1f3b' : '#1c2735';
      const stroke = inDraft ? 'var(--cyan)' : n.type === 'hub' ? 'var(--cyan)' : n.type === 'city' ? 'var(--magenta)' : '#4b5d71';
      out += `<circle class="node" data-node="${n.id}" cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${inDraft ? 4 : 2}"/>`;
      const ly = n.y + r + 17;
      out += `<text class="node-label" x="${n.x}" y="${ly}" text-anchor="middle">${n.name}</text>`;
      if (n.type === 'city') {
        const c = s.cities[n.id];
        const frac = c.stock / s.cfg.city.max;
        const col = c.starving ? 'var(--red)' : c.recovering ? 'var(--amber)' : 'var(--green)';
        out += `<rect x="${n.x - 40}" y="${ly + 6}" width="80" height="6" rx="3" fill="#0b1118"/>`;
        out += `<rect x="${n.x - 40}" y="${ly + 6}" width="${80 * frac}" height="6" rx="3" fill="${col}"/>`;
        out += `<text class="node-sub" x="${n.x}" y="${ly + 26}" text-anchor="middle">${f0(c.stock)} ${c.starving ? 'STARVING' : c.recovering ? 'recovering' : ''}</text>`;
      } else if (n.type === 'hub') {
        out += `<text class="node-sub" x="${n.x}" y="${ly + 15}" text-anchor="middle">stock ${f0(s.hub.stock)}</text>`;
      }
    }
    // trains
    const seen = {};
    for (const t of s.trains) {
      if (t.routeId == null && t.state === 'idle') continue;
      const p = trainPos(t);
      const k = `${Math.round(p.x)},${Math.round(p.y)}`;
      const off = (seen[k] = (seen[k] || 0) + 1) - 1;
      const col = t.delay > 0 ? 'var(--red)' : t.state === 'return' ? '#9fb0c4' : 'var(--amber)';
      const x = p.x + off * 13;
      const y = p.y - off * 13;
      if (t.blocked) out += `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="var(--red)" stroke-width="2" stroke-dasharray="3 3" pointer-events="none"/>`;
      out += `<circle cx="${x}" cy="${y}" r="10" fill="${col}" stroke="#000" stroke-width="1.5" pointer-events="none"/>`;
      out += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#000" pointer-events="none">${t.id}</text>`;
    }
    // creature attack bursts (last few hours)
    for (const e of s.fx) {
      const r = sim.route(s, e.routeId);
      if (!r) continue;
      const p = posOnRoute(r, e.dist);
      const age = s.tick - e.tick;
      const op = Math.max(0.15, 1 - age / 4);
      out += `<circle cx="${p.x}" cy="${p.y}" r="${20 + age * 8}" fill="none" stroke="var(--red)" stroke-width="4" opacity="${op}" pointer-events="none"/>`;
      out += `<text x="${p.x + 22}" y="${p.y - 18}" class="burst" opacity="${op}">⚡−${f0(e.loss)}</text>`;
    }
    out += `<g class="legend" transform="translate(16 ${620 - 70})">
      <line x1="0" y1="0" x2="26" y2="0" class="pack-halo" stroke-width="14"/><text x="34" y="4">creature pack</text>
      <line x1="0" y1="20" x2="26" y2="20" class="link-built link-broken"/><text x="34" y="24">broken track</text>
      <circle cx="13" cy="42" r="8" fill="none" stroke="var(--red)" stroke-width="3"/><text x="34" y="46">attack</text>
      <line x1="140" y1="0" x2="166" y2="0" class="link-built" stroke="hsl(170 80% 55%)"/><text x="174" y="4">calm</text>
      <line x1="140" y1="20" x2="166" y2="20" class="link-built" stroke="hsl(0 80% 55%)"/><text x="174" y="24">dangerous</text>
    </g>`;
    if (draft) {
      out += `<text class="map-note" x="20" y="24" style="fill:var(--cyan);font-size:14px">Drawing route: click the next node… (Esc to cancel)</text>`;
    }
    svg.innerHTML = out;
  }

  svg.addEventListener('pointerdown', (e) => {
    if (!s || s.outcome) return;
    const node = e.target.closest('[data-node]');
    const link = e.target.closest('[data-link]');
    if (draft && node) return draftClick(node.dataset.node);
    if (link) {
      selLink = link.dataset.link;
      if (draft) {
        const l = s.links[selLink];
        const last = draft[draft.length - 1];
        if (l.a === last) return draftClick(l.b);
        if (l.b === last) return draftClick(l.a);
      } else tab = 'network';
      renderAll();
    }
  });

  function draftClick(id) {
    const last = draft[draft.length - 1];
    if (id === last) return;
    const l = sim.linkBetween(s, last, id);
    if (!l) return flash(`No track can connect ${s.nodes[last].name} and ${s.nodes[id].name}.`);
    if (!l.built) return flash(`Build ${sim.linkName(s, l)} first (${l.cost} resources).`);
    if (draft.includes(id)) return flash('A route cannot revisit a node.');
    draft.push(id);
    if (s.nodes[id].type === 'city') {
      const res = sim.createRoute(s, draft);
      draft = null;
      tab = 'routes';
      act(res);
      if (res.ok && s.trains.some((t) => t.routeId == null))
        flash('Route created. Assign an idle train to it below.');
      return;
    }
    renderAll();
  }

  // ---------- log ----------
  let lastLogLen = -1;
  function renderLog() {
    if (s.log.length === lastLogLen && s.log.length < s.cfg.logKeep) return;
    lastLogLen = s.log.length;
    $('log').innerHTML = s.log
      .slice(-80)
      .reverse()
      .map(
        (e) =>
          `<div class="k-${e.kind}${e.important ? ' imp' : ''}"><span class="t">D${Math.floor(e.tick / 24) + 1} ${String(e.tick % 24).padStart(2, '0')}h</span>${e.text}</div>`
      )
      .join('');
  }

  // ---------- panel ----------
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    renderAll();
  });

  function renderPanel() {
    $('tabs').innerHTML = TABS.map(([k, label]) => {
      const name = k === 'counter' ? (s.scenario === 'good' ? 'Escorts' : 'Defenses') : label;
      return `<button data-tab="${k}" class="${tab === k ? 'active' : ''}">${name}</button>`;
    }).join('');
    const body = { network: panelNetwork, routes: panelRoutes, counter: panelCounter, upgrades: panelUpgrades, reports: panelReports }[tab]();
    const el = $('panelBody');
    const scroll = el.scrollTop;
    el.innerHTML = body;
    el.scrollTop = scroll;
  }

  const btn = (label, attrs, disabled, cls = '') =>
    `<button ${attrs} ${disabled ? 'disabled' : ''} class="${cls}">${label}</button>`;

  function repairBtn(l) {
    if (!l.broken) return '';
    if (l.repairUntil != null) return `<span class="small warn">repairing, ${l.repairUntil - s.tick}h</span>`;
    const o = sim.repairOptions(s);
    const drones = btn(`Drones ${o.drones.hours}h (${o.drones.cost} res, ${o.drones.computeCost} cmp)`, `data-act="repair" data-method="drones" data-id="${l.id}"`, s.resources < o.drones.cost, 'primary');
    const crew = s.scenario === 'good'
      ? btn(`Crew ${o.crew.hours}h (−${o.crew.trustCost} Trust)`, `data-act="repair" data-method="crew" data-id="${l.id}"`, s.trust < o.crew.trustMin)
      : btn(`Crew ${o.crew.hours}h (+${o.crew.awarenessGain} Awareness)`, `data-act="repair" data-method="crew" data-id="${l.id}"`);
    return `<span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${drones}${crew}</span>`;
  }

  function panelNetwork() {
    let h = '';
    const broken = Object.values(s.links).filter((l) => l.broken);
    if (broken.length) {
      const o = sim.repairOptions(s);
      h += `<div class="box audit"><div class="title"><span class="bad">Broken track</span></div>
        <div class="small muted">Trains cannot cross until repaired. Drones spend your resources and compute; a human crew is faster but ${s.scenario === 'good' ? `spends Trust (needs Trust ≥ ${o.crew.trustMin})` : 'lets humans look at your network (+Awareness)'}.</div>
        ${broken.map((l) => `<div class="row"><span class="grow">${sim.linkName(s, l)}</span>${repairBtn(l)}</div>`).join('')}</div>`;
    }
    if (selLink) {
      const l = s.links[selLink];
      h += `<div class="box"><div class="title"><span>${sim.linkName(s, l)}</span><span class="muted">${l.built ? 'built' : 'not built'}</span></div>
        <div class="small muted">Length ${l.length} · base hazard ${l.hazard} · activity ×${sim.activity(s, l.id)}</div>
        <div class="small muted">Wear: ${l.passes} train passes · ${(sim.failChancePerPass(s, l) * 100).toFixed(1)}% failure chance per pass</div>
        <div style="margin-top:8px;display:flex;gap:6px">
        ${l.built ? repairBtn(l) : btn(`Build (${l.cost})`, `data-act="build" data-id="${l.id}"`, s.resources < l.cost, 'primary')}
        ${s.scenario === 'bad' && l.built && !l.turret ? btn(`Deploy turret (${s.cfg.counters.turret.cost})`, `data-act="turret" data-id="${l.id}"`, s.resources < s.cfg.counters.turret.cost) : ''}
        ${btn('Close', 'data-act="unsel"')}</div></div>`;
    }
    h += `<h3>Track</h3><div class="small muted">Click a dashed line on the map or build from this list. Each segment adds ${s.cfg.upkeep.perLink} compute/h upkeep.</div>`;
    for (const l of Object.values(s.links)) {
      h += `<div class="row"><span class="grow">${sim.linkName(s, l)}<br><span class="small muted">len ${l.length} · hazard ${l.hazard}${l.built ? ` · ${l.passes} passes` : ''}</span></span>
        ${l.built ? '<span class="small good">built</span>' : btn(`Build ${l.cost}`, `data-act="build" data-id="${l.id}"`, s.resources < l.cost)}</div>`;
    }
    h += `<h3>Fleet</h3><div class="row"><span class="grow">${s.trains.length} trains · capacity ${s.cfg.train.capacity} · speed ${f1(sim.trainSpeed(s))}<br><span class="small muted">Each train adds ${s.cfg.upkeep.perTrain} compute/h upkeep.</span></span>
      ${btn(`Buy train ${s.cfg.train.cost}`, 'data-act="buytrain"', s.resources < s.cfg.train.cost)}</div>`;
    return h;
  }

  function trainLine(t) {
    const r = t.routeId != null ? sim.route(s, t.routeId) : null;
    let st = t.state;
    if (r && (st === 'outbound' || st === 'return')) st += ` ${f1(t.dist)}/${r.length}`;
    if (st === 'loading' && r) st = 'waiting for cargo';
    if (t.delay > 0) st += ' (under attack)';
    const opts = [`<option value="">— idle —</option>`]
      .concat(s.routes.map((x) => `<option value="${x.id}" ${x.id === (t.nextRouteId !== undefined ? t.nextRouteId : t.routeId) ? 'selected' : ''}>${x.name}</option>`))
      .join('');
    return `<div class="row"><span class="grow">Train ${t.id} <span class="small muted">${st}${t.cargo ? ` · cargo ${f1(t.cargo)}` : ''}${t.nextRouteId !== undefined ? ' · switching' : ''}</span></span>
      <select data-act="assign" data-id="${t.id}">${opts}</select></div>`;
  }

  function panelRoutes() {
    let h = '';
    h += draft
      ? `<div class="box"><div class="title">Drawing: ${draft.map((n) => s.nodes[n].name).join(' → ')}</div><div class="small muted">Click the next node on the map (must be connected by built track). Finish at a city.</div><div style="margin-top:8px">${btn('Cancel', 'data-act="cancelroute"')}</div></div>`
      : `<div style="margin-bottom:10px">${btn('+ New route', 'data-act="newroute"', false, 'primary')} <span class="small muted">Hub → … → city along built track.</span></div>`;
    const sw = s.sweep;
    const cap = s.cfg.train.capacity;
    for (const r of s.routes) {
      const frac = sim.expectedFrac(s, r);
      const sus = sim.routeSuspicion(s, r.id);
      const trains = s.trains.filter((t) => t.routeId === r.id).length;
      const audited = (sw.phase === 'announced' && sw.candidates.includes(r.key)) || (sw.phase === 'active' && sw.target === r.key);
      const tol = s.cfg.detection.tolerance;
      const susCls = sus.frac > tol ? 'bad' : sus.frac > 0 ? 'warn' : 'good';
      const margin = cap * (1 - frac);
      h += `<div class="box ${audited ? 'audit' : ''}">
        <div class="title"><span>${r.name}</span><span class="small muted">len ${r.length} · ${trains} train${trains === 1 ? '' : 's'}</span></div>
        <div class="small">Expected per full trip: <b>${f1(cap * frac)}</b>/${cap} (${pct(frac)})
          ${sim.escortActive(s, r.id) ? ' · <span class="good">escorted</span>' : ''}
          ${audited ? ` · <span class="warn">${sw.phase === 'active' ? 'UNDER AUDIT' : 'audit candidate'}</span>` : ''}</div>
        <div class="small muted">Margin if no attacks: ~${f1(margin)} units/trip. Humans expect hazard losses of ~${pct(1 - frac)}.</div>
        <div class="small">Unexplained shortfall (last ${sus.n}): <span class="${susCls}">${sus.frac < 0 ? `none (surplus ${pct(-sus.frac)})` : pct(sus.frac)}</span> <span class="muted">(tolerance ${pct(tol)})</span></div>
        <div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span class="small">Skim</span>
          <select data-act="skimmode" data-id="${r.id}">
            ${[['off', 'Off'], ['margin', 'Margin only'], ['fixed', 'Fixed %']].map(([v, l]) => `<option value="${v}" ${r.skimMode === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          ${r.skimMode === 'fixed' ? `<input type="number" min="0" max="90" step="1" value="${Math.round(r.skimPct * 100)}" data-act="skimpct" data-id="${r.id}"/>%` : ''}
          <span style="flex:1"></span>${btn('Delete', `data-act="delroute" data-id="${r.id}"`, false, 'danger')}
        </div></div>`;
    }
    if (!s.routes.length) h += '<div class="muted small">No routes yet.</div>';
    h += `<h3>Trains</h3>`;
    h += s.trains.map(trainLine).join('');
    h += `<div style="margin-top:8px">${btn(`Buy train (${s.cfg.train.cost})`, 'data-act="buytrain"', s.resources < s.cfg.train.cost)}</div>`;
    return h;
  }

  function panelCounter() {
    let h = '';
    if (s.scenario === 'good') {
      const e = s.cfg.counters.escort;
      h += `<div class="small muted" style="margin-bottom:8px">Human escorts cut attack chance to ${pct(e.chanceMult)} and losses by ${pct(1 - e.lossMult)} for ${e.duration}h. Needs Trust ≥ ${e.trustMin}; costs ${e.trustCost} Trust.</div>`;
      for (const r of s.routes) {
        const esc = s.escorts.find((x) => x.routeId === r.id && x.until > s.tick);
        h += `<div class="row"><span class="grow">${r.name}${esc ? `<br><span class="small good">escorted, ${esc.until - s.tick}h left</span>` : ''}</span>
          ${btn(esc ? 'Extend' : 'Request escort', `data-act="escort" data-id="${r.id}"`, s.trust < e.trustMin)}</div>`;
      }
      if (!s.routes.length) h += '<div class="muted small">Create a route first.</div>';
    } else {
      const t = s.cfg.counters.turret;
      h += `<div class="small muted" style="margin-bottom:8px">Rogue turrets cut attack chance on a link to ${pct(t.chanceMult)}. Cost ${t.cost} resources + ${s.cfg.upkeep.perTurret} compute/h. They can malfunction, and auditors checking a route may find them (${pct(t.discoverChance)} each, +${t.discoverHarm} Awareness).</div>`;
      for (const l of Object.values(s.links).filter((x) => x.built)) {
        const st = l.turret ? (l.turret.offlineUntil > s.tick ? `<span class="warn">offline ${l.turret.offlineUntil - s.tick}h</span>` : '<span class="good">online</span>') : '';
        h += `<div class="row"><span class="grow">${sim.linkName(s, l)}<br><span class="small muted">hazard ${l.hazard} · activity ×${sim.activity(s, l.id)}</span> ${st}</span>
          ${l.turret ? '' : btn(`Deploy ${t.cost}`, `data-act="turret" data-id="${l.id}"`, s.resources < t.cost)}</div>`;
      }
      if (!Object.values(s.links).some((x) => x.built)) h += '<div class="muted small">Build track first.</div>';
    }
    return h;
  }

  function panelUpgrades() {
    const good = s.scenario === 'good';
    let h = `<h3>${good ? 'Trust perks' : 'Capability milestones'}</h3>
      <div class="small muted" style="margin-bottom:4px">${good ? 'Active while your current Trust is at or above the threshold; lost if Trust drops.' : `Permanent once reached. Each raises your Awareness floor by ${s.cfg.bad.footprintPerMilestone} (footprint now ${sim.awarenessFloor(s)}).`}</div>`;
    for (const p of sim.perkList(s))
      h += `<div class="row"><span class="grow"><span class="${p.active ? 'good' : 'muted'}">${p.active ? '●' : '○'} ${p.name}</span> <span class="small muted">(${good ? 'Trust' : 'Capability'} ${p.at})</span><br><span class="small muted">${p.desc}</span></span></div>`;
    h += '<h3>Upgrades</h3>';
    for (const [k, u] of Object.entries(s.cfg.upgrades)) {
      const tier = s.upgrades[k];
      const max = tier >= u.costs.length;
      const dots = '●'.repeat(tier) + '○'.repeat(u.costs.length - tier);
      h += `<div class="row"><span class="grow">${u.name} <span class="tier">${dots}</span><br><span class="small muted">${u.desc} Tiers: ${u.values.join(' / ')}</span></span>
        ${max ? '<span class="small good">max</span>' : btn(`Buy ${u.costs[tier]}`, `data-act="upgrade" data-id="${k}"`, s.resources < u.costs[tier])}</div>`;
    }
    h += `<div class="small muted">Each tier adds ${s.cfg.upkeep.perUpgradeTier} compute/h upkeep.</div>`;
    const cv = s.cfg.conversion;
    h += `<h3>Systems</h3>
      <div class="row"><span class="grow">Buy compute<br><span class="small muted">${cv.chunk} resources → ${f0(sim.computePerChunk(s))} compute</span></span>${btn('Buy', 'data-act="buycompute"', s.resources < cv.chunk)}</div>
      ${s.upgrades.broker ? `<div class="row"><span class="grow">Compute broker<br><span class="small muted">Buy when compute &lt; <input type="number" min="0" step="10" value="${s.broker.threshold}" data-act="brokerthreshold"/> · keep ≥ <input type="number" min="0" step="10" value="${s.broker.floor}" data-act="brokerfloor"/> resources</span></span></div>` : ''}
      <div class="row"><span class="grow">Low-power mode<br><span class="small muted">Upkeep ×${s.cfg.lowPower.upkeepMult}, upgrades offline, trains ×${s.cfg.lowPower.speedMult} speed.</span></span>
        ${btn(s.lowPower ? 'Turn OFF' : 'Turn ON', 'data-act="lowpower"', false, s.lowPower ? 'active' : '')}</div>
      <div class="small muted">Upkeep now: ${f1(sim.upkeep(s))} compute/h.</div>`;
    if (s.scenario === 'bad') {
      const b = s.cfg.bad;
      h += `<h3>Capability</h3>
        <div class="small muted">Siphoned cargo: <b>${f0(s.hoard)}</b>. Capability adds ${s.cfg.upkeep.perCapability} compute/h per point.</div>
        <div class="bar"><i style="width:${s.capability}%;background:var(--magenta)"></i></div>
        <div class="row"><span class="grow">Grow Capability +${b.capabilityStep}<br><span class="small muted">${b.capabilityStepCost} siphoned cargo</span></span>${btn('Grow', 'data-act="invest"', s.hoard < b.capabilityStepCost)}</div>
        <div class="row"><span class="grow">Fence cargo<br><span class="small muted">${b.fenceChunk} siphoned → ${b.fenceChunk * s.cfg.skim.valuePerUnit} resources</span></span>${btn('Fence', 'data-act="fence"', s.hoard < b.fenceChunk)}</div>`;
    }
    return h;
  }

  function panelReports() {
    const canPad = sim.scenario(s).canPad;
    const autoOk = sim.canAutoShare(s);
    let h = `<label class="small ${autoOk ? '' : 'muted'}"><input type="checkbox" data-act="autoshare" ${s.autoShare && autoOk ? 'checked' : ''} ${autoOk ? '' : 'disabled'}/> Auto-share honest hazard reports when losses beat expectations${autoOk ? '' : ` <span class="warn">(needs Trust ≥ ${s.cfg.good.perks[0].trust})</span>`}</label>
      <div class="small muted" style="margin:6px 0 10px">Sharing a report replaces the humans' average expectation with the actual loss for that trip.${canPad ? ' You can <b>pad</b> a report to hide skimming. Auditors who check that route may catch the padding.' : ''}</div>`;
    const attacked = s.deliveries.filter((d) => d.lost > 0).slice(-12).reverse();
    h += '<h3>Hazard reports</h3>';
    if (!attacked.length) h += '<div class="small muted">No attacked deliveries yet.</div>';
    for (const d of attacked) {
      const r = sim.route(s, d.routeId);
      const eff = sim.effectiveExpected(d);
      h += `<div class="box"><div class="title"><span>Train ${d.trainId} · ${r ? r.name : `${d.routeName} (removed)`}</span><span class="small muted">D${Math.floor(d.tick / 24) + 1} ${d.tick % 24}h</span></div>
        <div class="small mono">loaded ${f1(d.loaded)} · lost ${f1(d.lost)} (${d.attacks}×) · skim ${f1(d.skim)} · delivered ${f1(d.delivered)}<br>expected ${f1(eff)}${d.shared ? ` (report: ${f1(d.reportedLoss)} lost${d.padded ? `, <span class="warn">padded ${f1(d.padded)}</span>` : ''})` : ''}</div>
        ${d.shared ? '<div class="small good">shared</div>' : `<div style="margin-top:6px;display:flex;gap:6px;align-items:center">${btn('Share', `data-act="share" data-id="${d.id}"`)}
          ${canPad ? `<input type="number" min="0" step="1" value="${Math.ceil(d.skim)}" id="pad-${d.id}"/>${btn('Share padded', `data-act="sharepad" data-id="${d.id}"`)}` : ''}</div>`}</div>`;
    }
    h += '<h3>Recent deliveries</h3><div class="small mono">';
    for (const d of s.deliveries.slice(-10).reverse()) {
      const r = sim.route(s, d.routeId);
      const eff = sim.effectiveExpected(d);
      const cls = d.delivered >= eff - 0.5 ? 'good' : 'warn';
      h += `<div class="row"><span class="grow">${r ? r.name : d.routeName}</span><span class="${cls}">${f1(d.delivered)}/${f1(eff)}</span>${d.skim ? `<span class="muted">skim ${f1(d.skim)}</span>` : ''}</div>`;
    }
    h += '</div>';
    return h;
  }

  // ---------- panel events ----------
  $('panelBody').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b || !s || s.outcome) return;
    const id = b.dataset.id;
    const num = id != null && /^\d+$/.test(id) ? +id : id;
    switch (b.dataset.act) {
      case 'build': return act(sim.buildLink(s, id));
      case 'turret': return act(sim.buildTurret(s, id));
      case 'repair': return act(sim.repairLink(s, id, b.dataset.method));
      case 'unsel': selLink = null; return renderAll();
      case 'buytrain': return act(sim.buyTrain(s));
      case 'newroute': draft = ['hub']; selLink = null; return renderAll();
      case 'cancelroute': draft = null; return renderAll();
      case 'delroute': return act(sim.deleteRoute(s, num));
      case 'escort': return act(sim.requestEscort(s, num));
      case 'upgrade': return act(sim.buyUpgrade(s, id));
      case 'buycompute': return act(sim.buyCompute(s));
      case 'lowpower': return act(sim.setLowPower(s, !s.lowPower));
      case 'invest': return act(sim.investCapability(s));
      case 'fence': return act(sim.fenceHoard(s));
      case 'share': return act(sim.shareReport(s, num, 0));
      case 'sharepad': return act(sim.shareReport(s, num, +$(`pad-${id}`).value || 0));
    }
  });
  $('panelBody').addEventListener('change', (e) => {
    const el = e.target;
    if (!s || !el.dataset.act) return;
    const id = +el.dataset.id;
    switch (el.dataset.act) {
      case 'assign': act(sim.assignTrain(s, id, el.value === '' ? null : +el.value)); break;
      case 'skimmode': act(sim.setSkim(s, id, el.value)); break;
      case 'skimpct': act(sim.setSkim(s, id, 'fixed', (+el.value || 0) / 100)); break;
      case 'autoshare': act(sim.setAutoShare(s, el.checked)); break;
      case 'brokerthreshold': act(sim.setBroker(s, +el.value || 0, null)); break;
      case 'brokerfloor': act(sim.setBroker(s, null, +el.value || 0)); break;
    }
    el.blur();
  });
})();
