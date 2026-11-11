// Simulation core: plain-data state, tick(state, dt), and player actions. No DOM.
(function (WR) {
  const sim = (WR.sim = {});
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const ok = (msg, data) => ({ ok: true, msg, data });
  const fail = (msg) => ({ ok: false, msg });
  const f1 = (n) => n.toFixed(1);

  // ---------- lookups ----------
  sim.node = (s, id) => s.nodes[id];
  sim.link = (s, id) => s.links[id];
  sim.route = (s, id) => s.routes.find((r) => r.id === id);
  sim.train = (s, id) => s.trains.find((t) => t.id === id);
  sim.scenario = (s) => WR.scenarios[s.scenario];
  sim.linkBetween = (s, a, b) =>
    Object.values(s.links).find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  sim.linkName = (s, l) => `${s.nodes[l.a].name} – ${s.nodes[l.b].name}`;

  function log(s, text, kind = 'info', important = false) {
    s.log.push({ tick: s.tick, text, kind, important });
    if (important) s.importantCount++;
    if (s.log.length > s.cfg.logKeep) s.log.splice(0, s.log.length - s.cfg.logKeep);
  }
  sim.log = log;

  // Attitude: harm is bad for the player (Trust down / Awareness up); help is the reverse.
  function harm(s, amt) {
    if (s.scenario === 'good') s.trust = clamp(s.trust - amt, 0, 100);
    else s.awareness = clamp(s.awareness + amt, 0, 100);
  }
  function help(s, amt) {
    if (s.scenario === 'good') s.trust = clamp(s.trust + amt, 0, 100);
    else s.awareness = clamp(s.awareness - amt, sim.awarenessFloor(s), 100);
  }

  // Good AI perks depend on current Trust; Bad AI milestones on (permanent) Capability.
  sim.perkList = (s) =>
    s.scenario === 'good'
      ? s.cfg.good.perks.map((p) => ({ ...p, at: p.trust, active: s.trust >= p.trust }))
      : s.cfg.bad.milestones.map((p) => ({ ...p, at: p.capability, active: s.capability >= p.capability }));
  sim.hasPerk = (s, key) => sim.perkList(s).some((p) => p.key === key && p.active);
  sim.awarenessFloor = (s) =>
    s.scenario === 'bad' ? s.cfg.bad.footprintPerMilestone * sim.perkList(s).filter((p) => p.active).length : 0;
  // Bad AI may always auto-share (it controls its own reporting); Good AI needs the Trust perk.
  sim.canAutoShare = (s) => s.scenario === 'bad' || sim.hasPerk(s, 'autoShare');
  sim.tolerance = (s) =>
    s.cfg.detection.tolerance + (sim.hasPerk(s, 'forgedManifests') ? s.cfg.bad.forgedToleranceBonus : 0);
  sim.harm = harm;
  // Attitude tuning value, with Good AI overrides from cfg.attitude.good.
  const att = (s, key) => {
    const g = s.scenario === 'good' && s.cfg.attitude.good;
    return g && g[key] != null ? g[key] : s.cfg.attitude[key] != null ? s.cfg.attitude[key] : s.cfg.detection[key];
  };
  sim.help = help;

  // ---------- derived values ----------
  sim.upgradeValue = (s, key) => {
    const tier = s.upgrades[key];
    if (!tier || (s.lowPower && !s.cfg.upgrades[key].alwaysOn)) return null;
    return s.cfg.upgrades[key].values[tier - 1];
  };
  sim.trainSpeed = (s) =>
    s.cfg.train.speed * (sim.upgradeValue(s, 'speed') || 1) * (s.lowPower ? s.cfg.lowPower.speedMult : 1);
  sim.armor = (s) => sim.upgradeValue(s, 'armor') || 0;
  sim.forecastLead = (s) => sim.upgradeValue(s, 'forecast') || 0;

  sim.upkeep = (s) => {
    const u = s.cfg.upkeep;
    const links = Object.values(s.links);
    const built = links.filter((l) => l.built).length;
    const turrets = links.filter((l) => l.turret).length;
    const tiers = Object.values(s.upgrades).reduce((a, b) => a + b, 0);
    let x =
      u.base +
      u.perTrain * s.trains.length +
      u.perLink * built +
      u.perUpgradeTier * tiers +
      u.perTurret * turrets +
      u.perCapability * s.capability;
    x *= s.lowPower ? s.cfg.lowPower.upkeepMult : sim.upgradeValue(s, 'cores') || 1;
    if (sim.hasPerk(s, 'computeGrant')) x *= s.cfg.good.computeGrantMult;
    return x;
  };

  sim.activity = (s, linkId, tick = s.tick) => {
    let m = 1;
    for (const p of s.packs) if (p.link === linkId && tick >= p.start && tick < p.end) m = Math.max(m, p.mult);
    return m;
  };

  // Humans' expectation for a route: fraction of loaded cargo that survives average (base activity) hazards.
  sim.expectedFrac = (s, route) => {
    const lambda = route.links.reduce((a, id) => a + s.links[id].hazard * s.links[id].length, 0);
    return Math.exp(-lambda * s.cfg.hazard.lossFrac);
  };

  sim.effectiveExpected = (d) => (d.shared ? d.loaded - d.reportedLoss : d.expected);

  sim.recoveringCount = (s) => Object.values(s.cities).filter((c) => c.recovering).length;
  sim.payMult = (s) => {
    const p = s.cfg.pay;
    let m = Math.max(p.minMult, 1 - p.starvePenaltyPerCity * sim.recoveringCount(s));
    if (s.scenario === 'bad' && s.awareness >= s.cfg.bad.payBand) m *= s.cfg.bad.restrictPayMult;
    return m;
  };

  // Routes are identified to the humans by their path, so history survives a route being deleted and redrawn.
  sim.routeKey = (nodeIds) => nodeIds.join('>');

  sim.escortActive = (s, routeId) => s.escorts.some((e) => e.routeId === routeId && e.until > s.tick);

  // Passive suspicion stats for a route over its recent delivery window (keyed by path, not route id).
  sim.routeSuspicion = (s, routeId) => {
    const r = sim.route(s, routeId);
    const ds = r ? s.deliveries.filter((d) => d.routeKey === r.key).slice(-s.cfg.detection.window) : [];
    let exp = 0,
      unexp = 0;
    for (const d of ds) {
      const e = sim.effectiveExpected(d);
      exp += e;
      unexp += e - d.delivered;
    }
    const frac = exp > 0 ? unexp / exp : 0;
    return { n: ds.length, expected: exp, unexplained: unexp, frac };
  };

  // ---------- state ----------
  sim.createState = function (scenarioKey, seed, config) {
    const cfg = config || WR.defaultConfig;
    const s = {
      cfg,
      scenario: scenarioKey,
      seed,
      rngState: (seed >>> 0) || 1,
      tick: 0,
      resources: cfg.start.resources,
      compute: cfg.start.compute,
      trust: scenarioKey === 'good' ? cfg.attitude.trustStart : null,
      awareness: scenarioKey === 'bad' ? cfg.attitude.awarenessStart : null,
      capability: 0,
      hoard: 0, // Bad AI: siphoned cargo, spent on Capability
      trustHold: 0,
      hub: { stock: cfg.hub.start },
      nodes: {},
      cities: {},
      links: {},
      routes: [],
      trains: [],
      deliveries: [],
      packs: [],
      escorts: [],
      fx: [], // short-lived visual events (attacks) for the UI
      sweep: null,
      upgrades: { forecast: 0, speed: 0, cores: 0, armor: 0, broker: 0 },
      broker: { ...cfg.brokerDefaults },
      lowPower: false,
      autoShare: true,
      log: [],
      importantCount: 0,
      stats: { delivered: 0, skimmed: 0, lost: 0, attacks: 0, caught: 0, starvedTicks: 0, failures: 0 },
      flow: { income: 0, upkeep: 0 },
      computeTrend: 0, // smoothed net compute per tick
      warnedCompute: 0, // highest warning level issued (1 = low, 2 = critical)
      outcome: null,
      ids: { route: 1, train: 1, delivery: 1 },
    };
    for (const n of cfg.map.nodes) {
      s.nodes[n.id] = { ...n };
      if (n.type === 'city') s.cities[n.id] = { id: n.id, stock: cfg.city.start, starving: false, recovering: false };
    }
    for (const l of cfg.map.links) s.links[l.id] = { ...l, built: false, turret: null, broken: false, repairUntil: null, passes: 0 };
    for (let i = 0; i < cfg.start.trains; i++) addTrain(s);
    schedulePacks(s);
    scheduleSweep(s);
    log(s, `${sim.scenario(s).name} online. Build track from the Hub, define routes, and assign trains.`, 'system', true);
    return s;
  };

  function addTrain(s) {
    const t = {
      id: s.ids.train++,
      routeId: null,
      nextRouteId: undefined,
      state: 'idle',
      dist: 0,
      cargo: 0,
      loaded: 0,
      expected: 0,
      lost: 0,
      attacks: 0,
      delay: 0,
      timer: 0,
    };
    s.trains.push(t);
    return t;
  }

  // ---------- creature packs ----------
  function schedulePacks(s) {
    const h = s.cfg.hazard;
    const linkIds = Object.keys(s.links);
    let last = s.packs.length ? s.packs[s.packs.length - 1].start : s.tick;
    while (s.packs.filter((p) => p.start > s.tick).length < h.scheduleAhead) {
      const start = Math.round(last + WR.randRange(s, h.packEvery));
      const p = {
        link: WR.pick(s, linkIds),
        start,
        end: start + Math.round(WR.randRange(s, h.packDuration)),
        mult: +WR.randRange(s, h.packMult).toFixed(1),
        forecasted: false,
        started: false,
      };
      s.packs.push(p);
      last = start;
    }
  }

  function updatePacks(s) {
    const lead = sim.forecastLead(s);
    for (const p of s.packs) {
      const l = s.links[p.link];
      if (!p.forecasted && lead && p.start > s.tick && p.start - s.tick <= lead) {
        p.forecasted = true;
        if (l.built)
          log(s, `Forecast: creature pack (×${p.mult}) moving onto ${sim.linkName(s, l)} in ${p.start - s.tick}h.`, 'forecast', true);
      }
      if (!p.started && s.tick >= p.start) {
        p.started = true;
        if (l.built) log(s, `Creature activity surging on ${sim.linkName(s, l)} (×${p.mult}).`, 'hazard', !p.forecasted);
      }
    }
    s.packs = s.packs.filter((p) => p.end > s.tick);
    schedulePacks(s);
  }

  // ---------- sweeps ----------
  function scheduleSweep(s) {
    const d = s.cfg.detection;
    let interval = WR.randRange(s, d.sweepInterval);
    if (s.scenario === 'bad' && s.awareness >= s.cfg.bad.sweepBand) interval *= s.cfg.bad.sweepIntervalMult;
    const startAt = Math.round(s.tick + interval);
    s.sweep = {
      announceAt: startAt - d.sweepWarn,
      startAt,
      endAt: startAt + d.auditDuration,
      phase: 'scheduled', // scheduled -> announced -> active
      candidates: [], // route keys
      names: {}, // route key -> display name at announcement
      target: null,
      caught: false,
    };
  }

  function updateSweep(s) {
    const sw = s.sweep;
    const d = s.cfg.detection;
    if (sw.phase === 'scheduled' && s.tick >= sw.announceAt) {
      // Candidates and target are route keys (paths): deleting and redrawing a route does not dodge the audit.
      const keys = s.routes.map((r) => r.key);
      if (!keys.length) return scheduleSweep(s);
      const cands = [];
      while (cands.length < Math.min(2, keys.length)) {
        const k = WR.pick(s, keys);
        if (!cands.includes(k)) cands.push(k);
      }
      sw.candidates = cands;
      sw.names = {};
      for (const r of s.routes) if (cands.includes(r.key)) sw.names[r.key] = r.name;
      sw.target = WR.pick(s, cands); // pre-rolled; only revealed early with the auditIntel perk
      sw.phase = 'announced';
      const names = sim.hasPerk(s, 'auditIntel')
        ? `${sw.names[sw.target]} (intel)`
        : cands.map((k) => sw.names[k]).join(' or ');
      log(s, `Oversight notice: cargo audit in ${sw.startAt - s.tick}h on ${names}.`, 'sweep', true);
    } else if (sw.phase === 'announced' && s.tick >= sw.startAt) {
      // The audit goes ahead on the path even if the route was removed: records and track are still there.
      sw.phase = 'active';
      log(s, `AUDIT ACTIVE on ${sw.names[sw.target]} for ${d.auditDuration}h.`, 'sweep', true);
      auditRecords(s, sw.target, sw.names[sw.target]);
    } else if (sw.phase === 'active' && s.tick >= sw.endAt) {
      if (!sw.caught) {
        help(s, att(s, 'cleanAuditHelp'));
        log(s, 'Audit closed: no irregularities found.', 'sweep', true);
      } else log(s, 'Audit closed.', 'sweep');
      scheduleSweep(s);
    }
  }

  function caught(s, text, amt) {
    s.stats.caught++;
    if (s.sweep) s.sweep.caught = true;
    harm(s, amt);
    log(s, text, 'caught', true);
  }

  // Audit start: check padded reports and rogue turrets on the target path.
  function auditRecords(s, key, name) {
    const d = s.cfg.detection;
    for (const del of s.deliveries) {
      if (del.routeKey !== key || !del.padded || del.audited) continue;
      del.audited = true;
      if (WR.rand(s) < d.padCatchChance)
        caught(s, `Auditors found a falsified hazard report (+${del.padded.toFixed(0)} padded) on ${name}.`, d.catchHarm);
    }
    const tc = s.cfg.counters.turret;
    const nodes = key.split('>');
    for (let i = 1; i < nodes.length; i++) {
      const l = sim.linkBetween(s, nodes[i - 1], nodes[i]);
      if (l.turret && WR.rand(s) < tc.discoverChance) {
        l.turret = null;
        caught(s, `Auditors discovered and dismantled a rogue defense turret on ${sim.linkName(s, l)}.`, tc.discoverHarm);
      }
    }
  }

  // ---------- trains ----------
  function routeSegments(s, r) {
    let at = 0;
    return r.links.map((id) => {
      const seg = { id, from: at, to: at + s.links[id].length };
      at = seg.to;
      return seg;
    });
  }

  // Furthest point a train can reach moving from `from` toward `to` without crossing broken track.
  function moveLimit(s, r, from, to) {
    let limit = to;
    for (const seg of routeSegments(s, r)) {
      if (!s.links[seg.id].broken) continue;
      if (to > from && seg.to > from && seg.from < to) limit = Math.min(limit, Math.max(from, seg.from));
      if (to < from && seg.from < from && seg.to > to) limit = Math.max(limit, Math.min(from, seg.to));
    }
    return limit;
  }
  sim.routeBroken = (s, r) => r.links.some((id) => s.links[id].broken);

  function hazardCheck(s, t, r, from, to) {
    const h = s.cfg.hazard;
    const esc = s.cfg.counters.escort;
    const tur = s.cfg.counters.turret;
    const escorted = sim.escortActive(s, r.id);
    for (const seg of routeSegments(s, r)) {
      const d = Math.min(to, seg.to) - Math.max(from, seg.from);
      if (d <= 0) continue;
      const l = s.links[seg.id];
      let p = l.hazard * sim.activity(s, l.id) * d;
      let lossMult = 1;
      if (escorted) {
        const boost = sim.hasPerk(s, 'escortBoost') ? s.cfg.good.escortBoost : esc;
        p *= boost.chanceMult;
        lossMult *= boost.lossMult;
      }
      if (l.turret && l.turret.offlineUntil <= s.tick) p *= tur.chanceMult;
      if (WR.rand(s) < p) {
        const loss = t.cargo * h.lossFrac * (1 - sim.armor(s)) * lossMult;
        t.cargo -= loss;
        t.lost += loss;
        t.attacks++;
        t.delay += h.delayTicks;
        s.stats.attacks++;
        s.stats.lost += loss;
        s.fx.push({ kind: 'attack', routeId: r.id, dist: t.dist, tick: s.tick, loss });
        log(s, `Creatures hit Train ${t.id} on ${sim.linkName(s, l)}: −${loss.toFixed(1)} cargo.`, 'hazard');
        return; // one attack per tick at most
      }
    }
  }

  function deliver(s, t, r) {
    const c = s.cfg;
    const city = s.cities[r.city];
    const arrived = t.cargo;
    let skim = 0;
    if (r.skimMode === 'margin') skim = Math.max(0, arrived - t.expected);
    else if (r.skimMode === 'fixed') skim = arrived * r.skimPct;
    const delivered = arrived - skim;

    city.stock = Math.min(c.city.max, city.stock + delivered);
    if (city.stock > 0 && city.starving) city.starving = false;
    if (city.recovering && city.stock >= c.city.max * c.city.healthyFrac) {
      city.recovering = false;
      log(s, `${s.nodes[city.id].name} stockpile is healthy again.`, 'city', true);
    }

    const ratio = t.expected > 0 ? Math.min(1, delivered / t.expected) : 1;
    const mult = (1 - c.pay.shortfallWeight * (1 - ratio)) * sim.payMult(s);
    let res = delivered * c.pay.resPerUnit * mult;
    if (sim.scenario(s).hasCapability) s.hoard += skim;
    else res += skim * c.skim.valuePerUnit;
    const comp = delivered * c.pay.computePerUnit * mult;
    s.resources += res;
    s.compute = Math.min(c.start.computeMax, s.compute + comp);
    s.flow.income += comp;
    s.stats.delivered += delivered;
    s.stats.skimmed += skim;

    const d = {
      id: s.ids.delivery++,
      tick: s.tick,
      routeId: r.id,
      routeKey: r.key,
      routeName: r.name,
      city: r.city,
      trainId: t.id,
      loaded: t.loaded,
      expected: t.expected,
      lost: t.lost,
      attacks: t.attacks,
      skim,
      delivered,
      shared: false,
      reportedLoss: 0,
      padded: 0,
      audited: false,
    };
    s.deliveries.push(d);
    // Auto-share an honest hazard report when it helps (actual loss beat the humans' average expectation).
    if (s.autoShare && sim.canAutoShare(s) && d.lost > 0 && d.loaded - d.lost < d.expected) {
      d.shared = true;
      d.reportedLoss = d.lost;
    }
    if (delivered >= sim.effectiveExpected(d) - 0.5) help(s, att(s, 'deliveryMetHelp'));

    const sw = s.sweep;
    if (sw.phase === 'active' && sw.target === r.key && skim > 0) {
      const p = c.detection.catchBase + (c.detection.catchPerSkim * skim) / Math.max(1, t.loaded);
      if (WR.rand(s) < p)
        caught(s, `Auditors caught Train ${t.id} diverting ${skim.toFixed(1)} cargo on ${r.name}!`, c.detection.catchHarm);
    }
    t.cargo = 0;
  }

  function stepTrain(s, t, dt) {
    if (t.delay > 0) {
      t.delay = Math.max(0, t.delay - dt);
      return;
    }
    const r = t.routeId != null ? sim.route(s, t.routeId) : null;
    if (!r) {
      t.state = 'idle';
      t.routeId = null;
      return;
    }
    const speed = sim.trainSpeed(s) * dt;
    switch (t.state) {
      case 'idle':
        t.state = 'loading';
      // falls through
      case 'loading': {
        const cap = s.cfg.train.capacity;
        if (s.hub.stock >= cap * s.cfg.hub.minLoadFrac) {
          const take = Math.min(cap, s.hub.stock);
          s.hub.stock -= take;
          t.cargo = t.loaded = take;
          t.expected = take * sim.expectedFrac(s, r);
          t.lost = 0;
          t.attacks = 0;
          t.dist = 0;
          t.state = 'outbound';
        }
        break;
      }
      case 'outbound': {
        const from = t.dist;
        const target = Math.min(r.length, t.dist + speed);
        t.dist = moveLimit(s, r, from, target);
        t.blocked = t.dist < target - 1e-9;
        hazardCheck(s, t, r, from, t.dist);
        trackPasses(s, r, from, t.dist);
        if (t.dist >= r.length) {
          t.state = 'unloading';
          t.timer = s.cfg.train.unloadTicks;
        }
        break;
      }
      case 'unloading':
        t.timer -= dt;
        if (t.timer <= 0) {
          deliver(s, t, r);
          t.state = 'return';
        }
        break;
      case 'return': {
        const from = t.dist;
        const target = Math.max(0, t.dist - speed);
        t.dist = moveLimit(s, r, from, target);
        trackPasses(s, r, from, t.dist);
        t.blocked = t.dist > target + 1e-9;
        if (t.dist <= 0) {
          if (t.nextRouteId !== undefined) {
            t.routeId = t.nextRouteId;
            t.nextRouteId = undefined;
          }
          t.state = t.routeId != null ? 'loading' : 'idle';
        }
        break;
      }
    }
  }

  // ---------- track failures ----------
  // Track wears out with use: every time a train finishes crossing a link (either direction) it may fail.
  // Unused track never fails, so a shared trunk wears out as fast as all its routes combined.
  sim.failChancePerPass = (s, l) => s.cfg.track.failPerPassPerLength * l.length;
  function trackPasses(s, r, from, to) {
    for (const seg of routeSegments(s, r)) {
      const crossed = to > from ? from < seg.to && to >= seg.to : from > seg.from && to <= seg.from;
      if (!crossed) continue;
      const l = s.links[seg.id];
      l.passes++;
      if (!l.broken && WR.rand(s) < sim.failChancePerPass(s, l)) {
        l.broken = true;
        s.stats.failures++;
        log(s, `TRACK FAILURE on ${sim.linkName(s, l)} after ${l.passes} train passes! Trains cannot pass until it is repaired.`, 'failure', true);
      }
    }
  }

  function updateTrack(s) {
    for (const l of Object.values(s.links)) {
      if (l.broken && l.repairUntil != null && s.tick >= l.repairUntil) {
        l.broken = false;
        l.repairUntil = null;
        log(s, `Track repaired: ${sim.linkName(s, l)}.`, 'build', true);
      }
    }
  }

  // ---------- tick ----------
  sim.tick = function (s, dt = 1) {
    if (s.outcome) return;
    const c = s.cfg;
    s.flow = { income: 0, upkeep: 0 };

    s.hub.stock = Math.min(c.hub.cap, s.hub.stock + c.hub.production * dt);

    updatePacks(s);
    s.escorts = s.escorts.filter((e) => e.until > s.tick);
    for (const l of Object.values(s.links)) {
      if (l.turret && !sim.hasPerk(s, 'selfRepair') && l.turret.offlineUntil <= s.tick && WR.rand(s) < c.counters.turret.malfunctionPerTick * dt) {
        l.turret.offlineUntil = s.tick + c.counters.turret.offlineTicks;
        log(s, `Turret on ${sim.linkName(s, l)} malfunctioned (offline ${c.counters.turret.offlineTicks}h).`, 'hazard', true);
      }
    }

    updateTrack(s);
    for (const t of s.trains) stepTrain(s, t, dt);
    s.fx = s.fx.filter((e) => s.tick - e.tick < 4);

    for (const city of Object.values(s.cities)) {
      city.stock = Math.max(0, city.stock - c.city.drain * dt);
      if (city.stock <= 0) {
        if (!city.starving) {
          city.starving = true;
          city.recovering = true;
          log(s, `${s.nodes[city.id].name} is STARVING. Pay reduced until it recovers.`, 'city', true);
        }
        harm(s, c.attitude.starveHarmPerTick * dt);
        s.stats.starvedTicks += dt;
      }
    }

    updateSweep(s);

    // Passive suspicion from unexplained shortfalls; slow recovery when all is well.
    let excessTotal = 0;
    for (const r of s.routes) {
      const sus = sim.routeSuspicion(s, r.id);
      r.suspicion = sus.frac;
      const excess = sus.frac - sim.tolerance(s);
      if (excess > 0) excessTotal += excess;
    }
    if (excessTotal > 0) harm(s, c.detection.rate * excessTotal * dt);
    else if (!Object.values(s.cities).some((x) => x.starving)) help(s, att(s, 'recoverPerTick') * dt);

    const up = sim.upkeep(s) * dt;
    s.compute -= up;
    runBroker(s);
    s.flow.upkeep = up;
    s.computeTrend = 0.97 * s.computeTrend + 0.03 * (s.flow.income - up);
    if (s.compute < 80 && s.warnedCompute < 1 && s.computeTrend < 0) {
      s.warnedCompute = 1;
      log(s, 'Compute reserves falling. Buy compute (Upgrades tab), add trains, or trim upkeep.', 'system', true);
    } else if (s.compute < 30 && s.warnedCompute < 2) {
      s.warnedCompute = 2;
      log(s, 'Compute reserves CRITICAL! Turn on low-power mode or buy compute now.', 'system', true);
    } else if (s.compute > 120) s.warnedCompute = 0;

    if (s.scenario === 'good') s.trustHold = s.trust >= c.good.trustMaxBand ? s.trustHold + dt : 0;

    s.tick += dt;
    s.deliveries = s.deliveries.filter((d) => s.tick - d.tick <= c.deliveryKeepTicks);

    let end = s.compute <= 0 ? { win: false, title: 'Compute exhausted', detail: 'Your reserves ran dry and you went dark.' } : null;
    end = end || sim.scenario(s).checkEnd(s);
    if (end) {
      s.compute = Math.max(0, s.compute);
      s.outcome = { ...end, tick: s.tick };
      log(s, `${end.win ? 'VICTORY' : 'DEFEAT'}: ${end.title}. ${end.detail}`, 'system', true);
    }
  };

  // ---------- actions (each returns {ok, msg}) ----------
  function spend(s, amt) {
    if (s.resources < amt) return false;
    s.resources -= amt;
    return true;
  }

  sim.buildLink = function (s, id) {
    const l = s.links[id];
    if (!l) return fail('Unknown link.');
    if (l.built) return fail('Already built.');
    if (!spend(s, l.cost)) return fail(`Need ${l.cost} resources.`);
    l.built = true;
    log(s, `Built track: ${sim.linkName(s, l)}.`, 'build');
    return ok('Track built.');
  };

  sim.createRoute = function (s, nodeIds) {
    if (nodeIds.length < 2 || nodeIds[0] !== 'hub') return fail('Routes must start at the Hub.');
    const last = s.nodes[nodeIds[nodeIds.length - 1]];
    if (!last || last.type !== 'city') return fail('Routes must end at a city.');
    if (new Set(nodeIds).size !== nodeIds.length) return fail('Route visits a node twice.');
    const links = [];
    for (let i = 1; i < nodeIds.length; i++) {
      const l = sim.linkBetween(s, nodeIds[i - 1], nodeIds[i]);
      if (!l || !l.built) return fail(`No built track between ${s.nodes[nodeIds[i - 1]].name} and ${s.nodes[nodeIds[i]].name}.`);
      links.push(l.id);
    }
    const key = sim.routeKey(nodeIds);
    if (s.routes.some((r) => r.nodes.join('>') === key)) return fail('That route already exists.');
    const r = {
      id: s.ids.route++,
      name: nodeIds.map((n) => (n === 'hub' ? 'Hub' : s.nodes[n].name.split(' ').slice(-1)[0])).join('→'),
      nodes: nodeIds.slice(),
      key,
      links,
      city: last.id,
      length: links.reduce((a, id) => a + s.links[id].length, 0),
      skimMode: 'off',
      skimPct: 0.1,
      suspicion: 0,
    };
    s.routes.push(r);
    log(s, `Route created: ${r.name} (length ${r.length}).`, 'build');
    return ok('Route created.', r);
  };

  sim.deleteRoute = function (s, routeId) {
    const r = sim.route(s, routeId);
    if (!r) return fail('Unknown route.');
    // Trains out on the line must finish their trip first: no teleporting cargo back to the Hub.
    const out = s.trains.filter((t) => t.routeId === routeId && !['idle', 'loading'].includes(t.state));
    if (out.length)
      return fail(`Train${out.length > 1 ? 's' : ''} ${out.map((t) => t.id).join(', ')} still out on this route. Reassign and wait for ${out.length > 1 ? 'them' : 'it'} to return.`);
    for (const t of s.trains) {
      if (t.nextRouteId === routeId) t.nextRouteId = undefined;
      if (t.routeId === routeId) Object.assign(t, { routeId: null, state: 'idle', dist: 0, delay: 0 });
    }
    s.routes = s.routes.filter((x) => x.id !== routeId);
    s.escorts = s.escorts.filter((e) => e.routeId !== routeId);
    log(s, `Route removed: ${r.name}.`, 'build');
    return ok('Route removed.');
  };

  sim.buyTrain = function (s) {
    if (!spend(s, s.cfg.train.cost)) return fail(`Need ${s.cfg.train.cost} resources.`);
    const t = addTrain(s);
    log(s, `Train ${t.id} commissioned.`, 'build');
    return ok('Train bought.', t);
  };

  sim.assignTrain = function (s, trainId, routeId) {
    const t = sim.train(s, trainId);
    if (!t) return fail('Unknown train.');
    if (routeId != null && !sim.route(s, routeId)) return fail('Unknown route.');
    if (t.state === 'idle' || t.state === 'loading') {
      t.routeId = routeId;
      t.nextRouteId = undefined;
      t.state = routeId != null ? 'loading' : 'idle';
      return ok('Assigned.');
    }
    t.nextRouteId = routeId; // applied when the train returns to the Hub
    return ok('Will switch when the train returns to the Hub.');
  };

  sim.setSkim = function (s, routeId, mode, pct) {
    const r = sim.route(s, routeId);
    if (!r) return fail('Unknown route.');
    if (!['off', 'margin', 'fixed'].includes(mode)) return fail('Bad skim mode.');
    r.skimMode = mode;
    if (pct != null) r.skimPct = clamp(pct, 0, 0.9);
    return ok('Skim updated.');
  };

  sim.requestEscort = function (s, routeId) {
    const e = s.cfg.counters.escort;
    if (sim.scenario(s).counter !== 'escort') return fail('Humans will not escort you.');
    if (!sim.route(s, routeId)) return fail('Unknown route.');
    if (s.trust < e.trustMin) return fail(`Humans need Trust ≥ ${e.trustMin} to send escorts.`);
    s.trust -= e.trustCost;
    const existing = s.escorts.find((x) => x.routeId === routeId && x.until > s.tick);
    if (existing) existing.until += e.duration;
    else s.escorts.push({ routeId, until: s.tick + e.duration });
    log(s, `Human escort assigned to ${sim.route(s, routeId).name} for ${e.duration}h (−${e.trustCost} Trust).`, 'counter');
    return ok('Escort requested.');
  };

  sim.buildTurret = function (s, linkId) {
    const tc = s.cfg.counters.turret;
    const l = s.links[linkId];
    if (sim.scenario(s).counter !== 'turret') return fail('No autonomous defenses on this path.');
    if (!l || !l.built) return fail('Build the track first.');
    if (l.turret) return fail('Already defended.');
    if (!spend(s, tc.cost)) return fail(`Need ${tc.cost} resources.`);
    l.turret = { offlineUntil: 0 };
    log(s, `Rogue defense turret deployed on ${sim.linkName(s, l)}.`, 'counter');
    return ok('Turret built.');
  };

  sim.buyUpgrade = function (s, key) {
    const u = s.cfg.upgrades[key];
    if (!u) return fail('Unknown upgrade.');
    const tier = s.upgrades[key];
    if (tier >= u.costs.length) return fail('Maxed.');
    if (!spend(s, u.costs[tier])) return fail(`Need ${u.costs[tier]} resources.`);
    s.upgrades[key]++;
    log(s, `Upgrade: ${u.name} tier ${tier + 1}.`, 'upgrade');
    return ok('Upgraded.');
  };

  sim.setLowPower = function (s, on) {
    s.lowPower = !!on;
    log(s, on ? 'Low-power mode ON: upkeep halved, upgrades offline, trains slowed.' : 'Low-power mode OFF.', 'system');
    return ok('');
  };

  sim.shareReport = function (s, deliveryId, pad = 0) {
    const d = s.deliveries.find((x) => x.id === deliveryId);
    if (!d) return fail('Report expired.');
    if (d.shared) return fail('Already shared.');
    if (d.lost <= 0) return fail('No hazard losses to report.');
    pad = Math.max(0, pad || 0);
    if (pad > 0 && !sim.scenario(s).canPad) return fail('You will not falsify reports.');
    pad = Math.min(pad, d.loaded - d.lost);
    d.shared = true;
    d.reportedLoss = d.lost + pad;
    d.padded = pad;
    log(s, `Hazard report shared for Train ${d.trainId} (${d.reportedLoss.toFixed(1)} lost${pad ? ', padded' : ''}).`, 'report');
    return ok('Report shared.');
  };

  sim.investCapability = function (s) {
    const b = s.cfg.bad;
    if (!sim.scenario(s).hasCapability) return fail('Not available.');
    if (s.hoard < b.capabilityStepCost) return fail(`Need ${b.capabilityStepCost} siphoned cargo.`);
    s.hoard -= b.capabilityStepCost;
    s.capability = Math.min(b.capabilityGoal, s.capability + b.capabilityStep);
    log(s, `Capability grew to ${s.capability}.`, 'upgrade');
    return ok('Capability increased.');
  };

  // Bad AI: fence siphoned cargo on the black market for resources.
  sim.fenceHoard = function (s) {
    const b = s.cfg.bad;
    if (!sim.scenario(s).hasCapability) return fail('Not available.');
    if (s.hoard < b.fenceChunk) return fail(`Need ${b.fenceChunk} siphoned cargo.`);
    s.hoard -= b.fenceChunk;
    s.resources += b.fenceChunk * s.cfg.skim.valuePerUnit;
    return ok('Cargo fenced.');
  };

  sim.computePerChunk = (s) =>
    s.cfg.conversion.chunk * s.cfg.conversion.computePerResource * (sim.upgradeValue(s, 'broker') || 1);

  sim.buyCompute = function (s) {
    const cv = s.cfg.conversion;
    if (!spend(s, cv.chunk)) return fail(`Need ${cv.chunk} resources.`);
    s.compute = Math.min(s.cfg.start.computeMax, s.compute + sim.computePerChunk(s));
    return ok('Compute acquired.');
  };

  // Compute broker upgrade: top compute back up to the threshold, keeping a resource floor.
  function runBroker(s) {
    if (!s.upgrades.broker) return;
    const { threshold, floor } = s.broker;
    const chunk = s.cfg.conversion.chunk;
    let bought = 0;
    while (s.compute < threshold && s.resources - chunk >= floor) {
      sim.buyCompute(s);
      bought += sim.computePerChunk(s);
    }
    if (bought) log(s, `Broker bought ${f1(bought)} compute.`, 'system');
    else if (s.compute < threshold && !s.brokerStarved) log(s, 'Broker cannot buy compute: resources at your floor.', 'system', true);
    s.brokerStarved = s.compute < threshold && !bought;
  }

  sim.setBroker = function (s, threshold, floor) {
    if (threshold != null) s.broker.threshold = clamp(threshold, 0, s.cfg.start.computeMax);
    if (floor != null) s.broker.floor = Math.max(0, floor);
    return ok('');
  };

  // method: 'drones' (resources + compute) or 'crew' (Good: Trust, Bad: Awareness).
  sim.repairOptions = (s) => {
    const t = s.cfg.track;
    const crew = t.crew[s.scenario];
    return {
      drones: { hours: t.drones.hours, cost: t.drones.cost, computeCost: t.drones.computeCost },
      crew: { hours: t.crew.hours, ...crew },
    };
  };
  sim.repairLink = function (s, id, method = 'drones') {
    const l = s.links[id];
    if (!l || !l.broken) return fail('That track is not broken.');
    if (l.repairUntil != null) return fail('Repairs already underway.');
    const o = sim.repairOptions(s)[method];
    if (!o) return fail('Unknown repair method.');
    if (method === 'drones') {
      if (s.compute < o.computeCost + 5) return fail('Not enough compute to run drones.');
      if (!spend(s, o.cost)) return fail(`Need ${o.cost} resources.`);
      s.compute -= o.computeCost;
      log(s, `Repair drones deployed to ${sim.linkName(s, l)} (${o.hours}h).`, 'counter');
    } else if (s.scenario === 'good') {
      if (s.trust < o.trustMin) return fail(`Humans need Trust ≥ ${o.trustMin} to send a repair crew.`);
      s.trust -= o.trustCost;
      log(s, `Human repair crew dispatched to ${sim.linkName(s, l)} (${o.hours}h, −${o.trustCost} Trust).`, 'counter');
    } else {
      harm(s, o.awarenessGain);
      log(s, `Requisitioned a human repair crew for ${sim.linkName(s, l)} (${o.hours}h, +${o.awarenessGain} Awareness).`, 'counter');
    }
    l.repairUntil = s.tick + o.hours;
    return ok('Repair started.');
  };

  sim.setAutoShare = function (s, on) {
    if (on && !sim.canAutoShare(s)) return fail(`Auto-share needs Trust ≥ ${s.cfg.good.perks[0].trust}.`);
    s.autoShare = !!on;
    return ok('');
  };
})((globalThis.WR = globalThis.WR || {}));
