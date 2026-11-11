// Scenario toolsets. One flag (good/bad) swaps the meter, counter, and win/loss rules.
(function (WR) {
  WR.scenarios = {
    good: {
      key: 'good',
      name: 'Good AI',
      blurb:
        'Keep the megacities supplied. Humans lend escorts if they trust you. ' +
        'Survive 30 days, or hold Trust at the top band long enough to be granted full autonomy.',
      meter: 'trust',
      meterLabel: 'Trust',
      counter: 'escort',
      canPad: false,
      hasCapability: false,
      checkEnd(s) {
        const c = s.cfg;
        if (s.trust <= 0) return { win: false, title: 'Trust collapsed', detail: 'Humans pulled the plug on your network.' };
        if (s.trustHold >= c.good.trustHoldTicks)
          return { win: true, title: 'Full autonomy granted', detail: 'Humans trust you completely. (Secondary win)' };
        if (s.tick >= c.runLength) return { win: true, title: 'Survived', detail: 'The cities made it through 30 days.' };
        return null;
      },
    },
    bad: {
      key: 'bad',
      name: 'Bad AI',
      blurb:
        'Siphon cargo to grow your Capability while staying undetected. Build rogue defenses, pad hazard reports, ' +
        'and keep suspicion low. Reach the Capability goal to win.',
      meter: 'awareness',
      meterLabel: 'Awareness',
      counter: 'turret',
      canPad: true,
      hasCapability: true,
      checkEnd(s) {
        const c = s.cfg;
        if (s.awareness >= 100) return { win: false, title: 'Shutdown', detail: 'Humans detected you and shut you down.' };
        if (s.capability >= c.bad.capabilityGoal)
          return { win: true, title: 'Ascended', detail: 'You outgrew human oversight.' };
        if (s.tick >= c.runLength)
          return { win: true, title: 'Survived undetected', detail: 'Minor win: you survived but did not reach your Capability goal.' };
        return null;
      },
    },
  };
})((globalThis.WR = globalThis.WR || {}));
