// Automated players for balance testing. A bot = a network layout + an operator routine + a skim policy.
// Bots only call public sim actions, so they play by the same rules as a human.
(function (WR) {
  const sim = WR.sim;
  const bots = (WR.bots = {});

  // Layouts are computed from the map, so bots can play generated maps too. On the classic map
  // 'spokes' gives three short, separate spurs and 'trunk' one shared trunk through Glass Flats.
  const LAYOUT_WEIGHT = {
    spokes: (l) => l.length, // shortest path to each city
    trunk: (l) => l.hazard * l.length, // safest path to each city (lowest expected losses)
  };

  // Cheapest path from the Hub to `city` under `weight`, never passing through another city.
  function bestPath(map, city, weight) {
    const type = Object.fromEntries(map.nodes.map((n) => [n.id, n.type]));
    const dist = { hub: 0 };
    const prev = {};
    const done = new Set();
    for (;;) {
      let u = null;
      for (const id in dist) if (!done.has(id) && (u == null || dist[id] < dist[u])) u = id;
      if (u == null || u === city) break;
      done.add(u);
      if (type[u] === 'city') continue;
      for (const l of map.links) {
        const v = l.a === u ? l.b : l.b === u ? l.a : null;
        if (v == null || done.has(v)) continue;
        const d = dist[u] + weight(l);
        if (dist[v] == null || d < dist[v]) (dist[v] = d), (prev[v] = u);
      }
    }
    if (dist[city] == null) return null;
    const path = [city];
    while (path[0] !== 'hub') path.unshift(prev[path[0]]);
    return path;
  }

  bots.layout = function (map, name) {
    const routes = map.nodes.filter((n) => n.type === 'city').map((c) => bestPath(map, c.id, LAYOUT_WEIGHT[name])).filter(Boolean);
    const links = [];
    for (const r of routes)
      for (let i = 1; i < r.length; i++) {
        const l = map.links.find((x) => (x.a === r[i - 1] && x.b === r[i]) || (x.a === r[i] && x.b === r[i - 1]));
        if (!links.includes(l.id)) links.push(l.id);
      }
    return { links, routes };
  };
  // Resources to build a layout's track.
  bots.layoutCost = (map, name) => bots.layout(map, name).links.reduce((a, id) => a + map.links.find((l) => l.id === id).cost, 0);

  // skim: 'off' | 'margin' | 'fixed'; dodge: pull skims on audited routes; pad: pad reports to cover skims.
  bots.strategies = {
    random: { random: true },
    neverSkim: { skim: 'off' },
    neverSkimTrunk: { skim: 'off', layout: 'trunk' },
    marginSkim: { skim: 'margin', dodge: true },
    fixed10: { skim: 'fixed', pct: 0.1, dodge: true, pad: true },
    fixed15: { skim: 'fixed', pct: 0.15, dodge: true, pad: true },
    alwaysSkim30: { skim: 'fixed', pct: 0.3 },
  };

  // Build what we can afford now, route by route; the rest waits in mem.plan for operate() to finish.
  bots.setup = function (s, opts, mem) {
    mem.plan = bots.layout(s.cfg.map, opts.layout || 'spokes').routes;
    buildPlan(s, mem);
    s.trains.forEach((t, i) => s.routes.length && sim.assignTrain(s, t.id, s.routes[i % s.routes.length].id));
  };

  function buildPlan(s, mem) {
    for (const r of mem.plan.slice()) {
      const links = r.slice(1).map((id, i) => sim.linkBetween(s, r[i], id));
      const need = links.filter((l) => !l.built).reduce((a, l) => a + l.cost, 0);
      if (need > s.resources) break; // keep plan order: finish this route first
      links.forEach((l) => l.built || sim.buildLink(s, l.id));
      sim.createRoute(s, r);
      mem.plan.shift();
    }
  }

  function botRand(mem) {
    return WR.rand(mem); // bots keep their own RNG so they never perturb the sim's stream
  }

  // Keep the lights on: trains, broker, repairs, power, upgrades, counters.
  function operate(s, opts, mem) {
    const c = s.cfg;
    if (mem.plan.length) buildPlan(s, mem);
    // Fleet: one train per route, a 4th when rich
    const want = s.routes.length + (s.resources > 400 ? 1 : 0);
    if (s.trains.length < want && s.resources >= c.train.cost + 20) {
      const t = sim.buyTrain(s).data;
      const least = s.routes.slice().sort(
        (a, b) => s.trains.filter((x) => x.routeId === a.id).length - s.trains.filter((x) => x.routeId === b.id).length
      )[0];
      sim.assignTrain(s, t.id, least.id);
    }
    // Compute
    if (!s.upgrades.broker && s.resources >= c.upgrades.broker.costs[0] + 20) {
      sim.buyUpgrade(s, 'broker');
      sim.setBroker(s, 80, 20);
    }
    if (!s.upgrades.broker && s.compute < 70) while (s.compute < 90 && sim.buyCompute(s).ok);
    if (!s.lowPower && s.compute < 25 && s.resources < 40) sim.setLowPower(s, true);
    else if (s.lowPower && (s.compute > 90 || s.resources > 120)) sim.setLowPower(s, false);
    // Repairs first: broken track stops everything
    // Drones when affordable; otherwise a human crew if the meter can take it.
    for (const l of Object.values(s.links)) {
      if (!l.broken || l.repairUntil != null) continue;
      const crewOk = s.scenario === 'good' ? s.trust >= 45 : s.awareness < 50;
      if (s.resources < 60 && crewOk) sim.repairLink(s, l.id, 'crew');
      else if (!sim.repairLink(s, l.id, 'drones').ok && crewOk) sim.repairLink(s, l.id, 'crew');
    }
    // Upgrades with a reserve
    for (const k of ['cores', 'armor', 'speed', 'forecast']) {
      const u = c.upgrades[k];
      const tier = s.upgrades[k];
      if (tier < u.costs.length && s.resources > u.costs[tier] + 120) {
        sim.buyUpgrade(s, k);
        break;
      }
    }
    // Counters against active creature packs
    for (const r of s.routes) {
      const hot = r.links.some((id) => sim.activity(s, id) > 1);
      if (!hot) continue;
      if (s.scenario === 'good') {
        // spend Trust only if it keeps us above the next perk we'd lose
        if (!sim.escortActive(s, r.id) && s.trust - c.counters.escort.trustCost >= 55) sim.requestEscort(s, r.id);
      } else {
        const l = r.links.map((id) => s.links[id]).find((x) => sim.activity(s, x.id) > 1 && !x.turret);
        if (l && s.resources > 200 && Object.values(s.links).filter((x) => x.turret).length < 2) sim.buildTurret(s, l.id);
      }
    }
    // Bad AI: fence siphoned cargo when compute is tight, otherwise grow
    if (s.scenario === 'bad') {
      const tight = s.compute < 100 || s.computeTrend < -0.8;
      if (tight) while (s.resources < 100 && sim.fenceHoard(s).ok);
      else while (sim.investCapability(s).ok);
    }
    void mem;
  }

  function skimPolicy(s, opts) {
    const sw = s.sweep;
    let audited = [];
    if (sw.phase === 'active') audited = [sw.target];
    else if (sw.phase === 'announced') audited = sim.hasPerk(s, 'auditIntel') ? [sw.target] : sw.candidates;
    for (const r of s.routes) {
      const off = opts.dodge && audited.includes(r.key);
      sim.setSkim(s, r.id, off ? 'off' : opts.skim, opts.pct);
    }
    if (opts.pad && sim.scenario(s).canPad)
      for (const d of s.deliveries) if (!d.shared && d.lost > 0 && d.skim > 0) sim.shareReport(s, d.id, d.skim);
  }

  // Random player: every few hours, does one random legal-ish thing on top of basic survival.
  function randomAct(s, mem) {
    if (s.tick % 6 !== 0) return;
    const r = s.routes.length ? s.routes[Math.floor(botRand(mem) * s.routes.length)] : null;
    const pick = Math.floor(botRand(mem) * 7);
    if (pick === 0 && r) sim.setSkim(s, r.id, ['off', 'margin', 'fixed'][Math.floor(botRand(mem) * 3)], botRand(mem) * 0.4);
    else if (pick === 1) sim.buyUpgrade(s, Object.keys(s.cfg.upgrades)[Math.floor(botRand(mem) * 5)]);
    else if (pick === 2 && r) {
      if (s.scenario === 'good') sim.requestEscort(s, r.id);
      else sim.buildTurret(s, r.links[Math.floor(botRand(mem) * r.links.length)]);
    } else if (pick === 3) sim.buyCompute(s);
    else if (pick === 4 && s.resources > 150) sim.buyTrain(s);
    else if (pick === 5) {
      const idle = s.trains.find((t) => t.routeId == null);
      if (idle && r) sim.assignTrain(s, idle.id, r.id);
    } else if (pick === 6) {
      const d = s.deliveries.find((x) => !x.shared && x.lost > 0);
      if (d) sim.shareReport(s, d.id, sim.scenario(s).canPad && botRand(mem) < 0.5 ? d.skim : 0);
    }
  }

  // One decision pass. Call before each sim.tick.
  bots.step = function (s, opts, mem) {
    if (opts.random) {
      if (mem.plan.length) buildPlan(s, mem);
      if (s.compute < 40) sim.buyCompute(s);
      for (const l of Object.values(s.links)) if (l.broken && l.repairUntil == null && botRand(mem) < 0.1) sim.repairLink(s, l.id, botRand(mem) < 0.5 ? 'crew' : 'drones');
      if (s.scenario === 'bad') sim.investCapability(s);
      return randomAct(s, mem);
    }
    operate(s, opts, mem);
    skimPolicy(s, opts);
  };

  // Play a full game. `sample` (ticks) records a trajectory for charts.
  bots.play = function (scenario, strategyName, seed, sample = 0, config) {
    const opts = bots.strategies[strategyName];
    const s = sim.createState(scenario, seed, config);
    const mem = { rngState: (seed * 31 + 17) >>> 0 };
    bots.setup(s, opts, mem);
    const traj = [];
    s.minCompute = s.compute;
    while (!s.outcome) {
      bots.step(s, opts, mem);
      sim.tick(s, 1);
      s.minCompute = Math.min(s.minCompute, s.compute);
      if (sample && s.tick % sample === 0)
        traj.push({ t: s.tick, meter: s[sim.scenario(s).meter], compute: s.compute, resources: s.resources, capability: s.capability });
    }
    s.traj = traj;
    return s;
  };
})((globalThis.WR = globalThis.WR || {}));
