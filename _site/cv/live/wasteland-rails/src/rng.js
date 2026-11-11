// Seeded RNG (mulberry32). State lives in s.rngState so a game state is plain data.
(function (WR) {
  WR.rand = function (s) {
    let a = (s.rngState = (s.rngState + 0x6d2b79f5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  WR.randRange = function (s, range) {
    return range[0] + WR.rand(s) * (range[1] - range[0]);
  };
  WR.pick = function (s, arr) {
    return arr[Math.floor(WR.rand(s) * arr.length)];
  };
})((globalThis.WR = globalThis.WR || {}));
