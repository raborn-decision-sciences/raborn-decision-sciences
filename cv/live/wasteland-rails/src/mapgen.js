// Seeded map generator. WR.generateMap(seed, opts) returns { nodes, links } in the same shape as cfg.map.
// Layout: Hub on the left, junctions in the middle, cities on the right, joined by non-crossing track.
// Cities only connect to junctions, so every route runs Hub → junction(s) → city.
(function (WR) {
  const W = 1000;
  const H = 620;
  const JUNCTION_NAMES = [
    'Rust Junction', 'Glass Flats', 'Bone Pass', 'Ash Crossing', 'Salt Wells', 'Dead Relay',
    'Cinder Gap', 'Copper Mesa', 'Sulfur Springs', 'Static Ridge', 'Hollow Yard', 'Signal Rock',
  ];
  const CITY_NAMES = [
    'Arcology Vega', 'Neo-Kowloon', 'Ironhold', 'Spire Meridian', 'New Carthage', 'Helix Prime',
    'Ember Stack', 'Port Obsidian', 'Lumen Deep', 'Kestrel Dome',
  ];

  WR.mapDefaults = {
    junctions: [3, 5], // inclusive range
    cities: 3,
    minNodeGap: 120, // px between any two nodes
    unitsPerPx: 0.019, // track length per pixel of distance (routes average ~15, classic is 13–15)
    lengthRange: [3, 12],
    hazardBase: [0.006, 0.012],
    hotspots: [3, 3], // creature territories that raise hazard nearby
    hotspotRadius: 160,
    hotspotPeak: [0.05, 0.07],
    hazardMax: 0.07,
    dropFrac: 0.1, // fraction of candidate links removed (when the map stays valid)
    costPerLength: 4.4, // lower than the classic map's ~5 so longer routes cost about the same to build
    safetyPremium: 300, // extra cost per unit of hazard below 0.06
    maxAttempts: 60,
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const round5 = (x) => Math.round(x / 5) * 5;

  // Proper segment intersection (shared endpoints do not count).
  function crosses(p1, p2, p3, p4) {
    const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }
  function pointSegDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  // Every city reachable from the Hub without passing through another city.
  function valid(nodes, links) {
    const adj = {};
    for (const n of nodes) adj[n.id] = [];
    for (const l of links) {
      adj[l.a].push(l.b);
      adj[l.b].push(l.a);
    }
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const seen = new Set(['hub']);
    const q = ['hub'];
    while (q.length) {
      const id = q.shift();
      if (byId[id].type === 'city') continue; // cities are dead ends
      for (const nb of adj[id]) if (!seen.has(nb)) (seen.add(nb), q.push(nb));
    }
    return nodes.every((n) => n.type !== 'city' || seen.has(n.id)) && adj.hub.length >= 2;
  }

  function place(s, nodes, o, box, id, name, type) {
    for (let i = 0; i < 400; i++) {
      const p = { x: Math.round(WR.randRange(s, box.x)), y: Math.round(WR.randRange(s, box.y)) };
      if (nodes.every((n) => dist(n, p) >= o.minNodeGap)) return nodes.push({ id, name, type, ...p }), true;
    }
    return false;
  }

  function attempt(s, o) {
    const nodes = [];
    const pickNames = (pool, n) => {
      const left = pool.slice();
      return Array.from({ length: n }, () => left.splice(Math.floor(WR.rand(s) * left.length), 1)[0]);
    };
    // Hub: left edge, clear of the map legend (bottom-left) and draft banner (top).
    nodes.push({ id: 'hub', name: 'Central Hub', type: 'hub', x: Math.round(WR.randRange(s, [90, 150])), y: Math.round(WR.randRange(s, [200, 420])) });
    // Cities: right side, spread top to bottom in bands.
    const nc = o.cities;
    const cityNames = pickNames(CITY_NAMES, nc);
    for (let i = 0; i < nc; i++) {
      const band = [80 + (i * 460) / nc, 80 + ((i + 1) * 460) / nc];
      if (!place(s, nodes, o, { x: [760, 910], y: band }, `c${i + 1}`, cityNames[i], 'city')) return null;
    }
    const nj = Math.floor(WR.randRange(s, [o.junctions[0], o.junctions[1] + 1]));
    const jNames = pickNames(JUNCTION_NAMES, nj);
    for (let i = 0; i < nj; i++)
      if (!place(s, nodes, o, { x: [290, 640], y: [90, 500] }, `j${i + 1}`, jNames[i], 'junction')) return null;
    nodes.sort((a, b) => (a.type === b.type ? a.id.localeCompare(b.id) : ['hub', 'junction', 'city'].indexOf(a.type) - ['hub', 'junction', 'city'].indexOf(b.type)));

    // Candidate links: no Hub–city or city–city track. Greedy shortest-first, skipping crossings
    // and links that graze a third node.
    const cands = [];
    for (let i = 0; i < nodes.length; i++)
      for (let k = i + 1; k < nodes.length; k++) {
        const a = nodes[i], b = nodes[k];
        const types = [a.type, b.type].sort().join();
        if (types === 'city,city' || types === 'city,hub') continue;
        cands.push({ a, b, d: dist(a, b) });
      }
    cands.sort((x, y) => x.d - y.d);
    let edges = [];
    for (const c of cands) {
      if (edges.some((e) => e.a !== c.a && e.a !== c.b && e.b !== c.a && e.b !== c.b && crosses(c.a, c.b, e.a, e.b))) continue;
      if (nodes.some((n) => n !== c.a && n !== c.b && pointSegDist(n, c.a, c.b) < 40)) continue;
      edges.push(c);
    }
    const asLinks = (es) => es.map((e) => ({ a: e.a.id, b: e.b.id }));
    if (!valid(nodes, asLinks(edges))) return null;

    // Thin it out so the network has real choices, keeping every city reachable.
    const order = edges.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const k = Math.floor(WR.rand(s) * (i + 1));
      [order[i], order[k]] = [order[k], order[i]];
    }
    let toDrop = Math.round(edges.length * o.dropFrac);
    for (const e of order) {
      if (!toDrop) break;
      const rest = edges.filter((x) => x !== e);
      if (!valid(nodes, asLinks(rest))) continue;
      edges = rest;
      toDrop--;
    }

    // Hazard: a low base plus creature territories (hotspots) that raise it near their centre.
    const nh = Math.floor(WR.randRange(s, [o.hotspots[0], o.hotspots[1] + 1]));
    const hot = Array.from({ length: nh }, () => ({
      x: WR.randRange(s, [300, 900]),
      y: WR.randRange(s, [60, 560]),
      peak: WR.randRange(s, o.hotspotPeak),
    }));
    const links = edges.map((e) => {
      const mid = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
      let hazard = WR.randRange(s, o.hazardBase);
      for (const h of hot) hazard += h.peak * Math.max(0, 1 - dist(mid, h) / o.hotspotRadius);
      hazard = Math.round(Math.min(o.hazardMax, hazard) * 1000) / 1000;
      const length = Math.max(o.lengthRange[0], Math.min(o.lengthRange[1], Math.round(e.d * o.unitsPerPx)));
      const cost = Math.max(20, round5(length * o.costPerLength + Math.max(0, 0.06 - hazard) * o.safetyPremium));
      return { id: `${e.a.id}-${e.b.id}`, a: e.a.id, b: e.b.id, length, hazard, cost };
    });
    return { nodes, links };
  }

  WR.generateMap = function (seed, opts) {
    const o = { ...WR.mapDefaults, ...opts };
    const s = { rngState: ((seed >>> 0) ^ 0x9e3779b9) >>> 0 || 1 }; // own stream: never touches the game RNG
    for (let i = 0; i < o.maxAttempts; i++) {
      const m = attempt(s, o);
      if (m) return { ...m, seed, generated: true };
    }
    throw new Error(`Map generation failed for seed ${seed}`);
  };
})((globalThis.WR = globalThis.WR || {}));
