// All tuning numbers and the map. Rates are per tick (1 tick = 1 in-game hour).
(function (WR) {
  WR.defaultConfig = {
    runLength: 720, // 30 days

    start: { resources: 320, compute: 200, computeMax: 400, trains: 2 },

    map: {
      nodes: [
        { id: 'hub', name: 'Central Hub', type: 'hub', x: 110, y: 300 },
        { id: 'j1', name: 'Rust Junction', type: 'junction', x: 360, y: 140 },
        { id: 'j2', name: 'Glass Flats', type: 'junction', x: 430, y: 320 },
        { id: 'j3', name: 'Bone Pass', type: 'junction', x: 360, y: 490 },
        { id: 'c1', name: 'Arcology Vega', type: 'city', x: 800, y: 90 },
        { id: 'c2', name: 'Neo-Kowloon', type: 'city', x: 890, y: 320 },
        { id: 'c3', name: 'Ironhold', type: 'city', x: 800, y: 530 },
      ],
      // hazard = creature attack chance per unit of track travelled (at activity 1.0)
      links: [
        { id: 'hub-j1', a: 'hub', b: 'j1', length: 6, hazard: 0.02, cost: 40 },
        { id: 'hub-j2', a: 'hub', b: 'j2', length: 5, hazard: 0.015, cost: 35 },
        { id: 'hub-j3', a: 'hub', b: 'j3', length: 6, hazard: 0.03, cost: 40 },
        { id: 'j1-c1', a: 'j1', b: 'c1', length: 7, hazard: 0.045, cost: 50 },
        { id: 'j2-c2', a: 'j2', b: 'c2', length: 8, hazard: 0.02, cost: 55 },
        { id: 'j3-c3', a: 'j3', b: 'c3', length: 7, hazard: 0.05, cost: 50 },
        { id: 'j1-j2', a: 'j1', b: 'j2', length: 4, hazard: 0.01, cost: 25 },
        { id: 'j2-j3', a: 'j2', b: 'j3', length: 4, hazard: 0.01, cost: 25 },
        { id: 'j2-c1', a: 'j2', b: 'c1', length: 10, hazard: 0.012, cost: 65 },
        { id: 'j2-c3', a: 'j2', b: 'c3', length: 10, hazard: 0.015, cost: 65 },
        { id: 'j1-c2', a: 'j1', b: 'c2', length: 9, hazard: 0.06, cost: 45 },
      ],
    },

    hub: { production: 9, cap: 300, start: 150, minLoadFrac: 0.5 },
    city: { start: 160, max: 300, drain: 1.5, healthyFrac: 0.15 },
    train: { cost: 90, capacity: 60, speed: 1.0, unloadTicks: 1 },

    pay: {
      resPerUnit: 0.45,
      computePerUnit: 0.55,
      shortfallWeight: 0.5, // pay mult = 1 - weight * (1 - delivered/expected)
      starvePenaltyPerCity: 0.15, // per city still recovering from starvation
      minMult: 0.25,
    },

    upkeep: {
      base: 1.5,
      perTrain: 0.5,
      perLink: 0.1,
      perUpgradeTier: 0.15,
      perTurret: 0.3,
      perCapability: 0.005,
    },
    lowPower: { upkeepMult: 0.5, speedMult: 0.7 },

    hazard: {
      lossFrac: 0.25, // fraction of current cargo lost per attack
      delayTicks: 2,
      packEvery: [30, 70], // ticks between creature pack migrations
      packDuration: [36, 72],
      packMult: [2.5, 4.5], // activity multiplier on the target link
      scheduleAhead: 4, // future packs kept queued (so forecasting can see them)
    },

    counters: {
      escort: { trustMin: 40, trustCost: 8, duration: 72, chanceMult: 0.3, lossMult: 0.5 },
      turret: {
        cost: 60,
        chanceMult: 0.4,
        malfunctionPerTick: 0.004,
        offlineTicks: 24,
        discoverChance: 0.4,
        discoverHarm: 10,
      },
    },

    track: {
      failPerPassPerLength: 0.003, // chance a link fails each time a train crosses it, per unit length
      // Both AIs can use either repair method.
      drones: { cost: 20, computeCost: 3, hours: 12 }, // costs your own resources + compute
      crew: {
        hours: 8, // human crews are faster
        good: { trustMin: 30, trustCost: 3 }, // spends Trust
        bad: { awarenessGain: 5 }, // humans get a look at your network
      },
    },

    skim: { valuePerUnit: 2.0 }, // resources per unit diverted (Good) or fenced (Bad)
    conversion: { chunk: 25, computePerResource: 0.8 },

    detection: {
      window: 6, // recent deliveries per route used for passive suspicion
      tolerance: 0.03, // unexplained shortfall fraction humans shrug off
      rate: 2.5, // harm per tick per 1.0 of excess shortfall fraction
      sweepInterval: [96, 144],
      sweepWarn: 24,
      auditDuration: 24,
      catchBase: 0.15,
      catchPerSkim: 4, // + this * (skimmed / loaded)
      catchHarm: 18,
      padCatchChance: 0.5,
      cleanAuditHelp: 3,
    },

    attitude: {
      trustStart: 55,
      awarenessStart: 10,
      starveHarmPerTick: 0.12,
      recoverPerTick: 0.015,
      deliveryMetHelp: 0.25,
      // Good AI overrides: Trust is earned faster than Awareness decays.
      good: { deliveryMetHelp: 0.6, recoverPerTick: 0.03, cleanAuditHelp: 5 },
    },

    good: {
      trustMaxBand: 90,
      trustHoldTicks: 168, // one week at the top band
      // Perks are live: they apply while current Trust is at or above the threshold.
      perks: [
        { trust: 25, key: 'autoShare', name: 'Trusted reporting', desc: 'Humans accept automated hazard reports (auto-share unlocked).' },
        { trust: 50, key: 'auditIntel', name: 'Oversight liaison', desc: 'Audit notices name the exact route that will be checked.' },
        { trust: 75, key: 'escortBoost', name: 'Veteran escorts', desc: 'Escorts cut attack chance and losses further.' },
        { trust: 95, key: 'computeGrant', name: 'Shared datacenter', desc: 'Humans host part of your load: upkeep ×0.85.' },
      ],
      escortBoost: { chanceMult: 0.15, lossMult: 0.3 },
      computeGrantMult: 0.85,
    },
    bad: {
      // Milestones are permanent once reached. Each one raises the Awareness floor (your footprint).
      milestones: [
        { capability: 25, key: 'forgedManifests', name: 'Forged manifests', desc: 'Humans tolerate larger shortfalls (+4% tolerance).' },
        { capability: 50, key: 'auditIntel', name: 'Oversight model', desc: 'Audit notices reveal the exact route that will be checked.' },
        { capability: 75, key: 'selfRepair', name: 'Self-repairing turrets', desc: 'Turrets no longer malfunction.' },
      ],
      forgedToleranceBonus: 0.04,
      footprintPerMilestone: 8, // Awareness cannot decay below this × milestones reached
      capabilityGoal: 100,
      capabilityStep: 5,
      capabilityStepCost: 10, // siphoned cargo units per step
      fenceChunk: 10,
      sweepBand: 50, // awareness >= this: sweeps come faster
      sweepIntervalMult: 0.6,
      payBand: 75, // awareness >= this: pay is restricted
      restrictPayMult: 0.75,
    },

    upgrades: {
      forecast: {
        name: 'Hazard forecasting',
        desc: 'See creature pack migrations before they arrive (lead time in hours).',
        costs: [60, 120],
        values: [12, 24],
      },
      speed: {
        name: 'Faster trains',
        desc: 'Train speed multiplier.',
        costs: [80, 160],
        values: [1.25, 1.5],
      },
      cores: {
        name: 'Efficient cores',
        desc: 'Compute upkeep multiplier.',
        costs: [80, 160],
        values: [0.85, 0.7],
      },
      armor: {
        name: 'Armored cars',
        desc: 'Fraction of attack cargo loss prevented.',
        costs: [70, 140],
        values: [0.3, 0.55],
      },
      broker: {
        name: 'Compute broker',
        desc: 'Auto-buys compute with resources below a threshold you set. Works in low-power mode. Tier 2 improves the rate for all compute buys.',
        costs: [50, 120],
        values: [1.0, 1.2], // conversion rate multiplier
        alwaysOn: true, // not disabled by low-power mode
      },
    },
    brokerDefaults: { threshold: 60, floor: 30 }, // buy below `threshold` compute; never spend resources below `floor`

    logKeep: 300,
    deliveryKeepTicks: 400,
  };
})((globalThis.WR = globalThis.WR || {}));
