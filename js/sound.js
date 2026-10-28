// 内定ください: Web Audio で鳴らす効果音(音源ファイルなし)
(function () {
  let ac = null, master = null, on = true;
  try { on = localStorage.getItem('nt-sound') !== 'off'; } catch (e) { /* 保存できなくても鳴らす */ }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = on ? 0.5 : 0;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when = 0, freq = 800, type = 'highpass') {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + when;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = type; f.frequency.value = freq; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(master);
    s.start(t);
  }

  const SFX = {
    stamp(combo = 0) { noise(0.08, 0.5, 0, 300, 'lowpass'); tone(140 + Math.min(combo, 30) * 12, 0.07, 'square', 0.12); },
    miss() { tone(180, 0.12, 'sawtooth', 0.06, 0, 110); },
    fired() { tone(300, 0.5, 'sawtooth', 0.15, 0, 60); noise(0.5, 0.3, 0, 200, 'lowpass'); },
    combo() { [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.12, 'square', 0.06, i * 0.05)); },
    drum() { for (let i = 0; i < 14; i++) noise(0.05, 0.25, i * 0.07, 400, 'lowpass'); },
    reveal() { tone(110, 0.5, 'sine', 0.4, 0, 55); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, 0.05 + i * 0.06)); },
    up() { tone(880, 0.06, 'triangle', 0.05); },
    down() { tone(330, 0.06, 'triangle', 0.05); },
    buy() { [660, 990].forEach((f, i) => tone(f, 0.08, 'square', 0.06, i * 0.05)); },
    sell() { [990, 660].forEach((f, i) => tone(f, 0.08, 'square', 0.06, i * 0.05)); },
    alarm() { for (let i = 0; i < 3; i++) tone(740, 0.12, 'square', 0.08, i * 0.18, 520); },
    buyout() { tone(55, 1.2, 'sawtooth', 0.2, 0, 40); [392, 370, 349, 330].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.08, i * 0.22)); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'square', 0.08, i * 0.08)); noise(0.6, 0.1, 0.3, 3000); },
    bell() { [1568, 1568, 1568].forEach((f, i) => tone(f, 0.4, 'sine', 0.15, i * 0.35)); },
    age(i = 0) { tone(300 + (i % 12) * 40, 0.04, 'square', 0.04); },
    card(kind) { noise(0.06, 0.4, 0, 400, 'lowpass'); if (kind === 'good') tone(880, 0.15, 'triangle', 0.08, 0.03); else if (kind === 'grief') tone(220, 1.2, 'sine', 0.12, 0.05, 196); else tone(150, 0.25, 'sawtooth', 0.08, 0.02, 90); },
    beat() { tone(60, 0.12, 'sine', 0.5, 0, 40); tone(60, 0.12, 'sine', 0.4, 0.18, 40); },
    flat() { tone(988, 2.6, 'sine', 0.12); },
    deny() { tone(200, 0.15, 'square', 0.08, 0, 150); },
    mail() { [1319, 1760].forEach((f, i) => tone(f, 0.12, 'sine', 0.12, i * 0.09)); },
    ok() { tone(1046, 0.1, 'triangle', 0.08); tone(1568, 0.14, 'triangle', 0.06, 0.06); },
    tick() { tone(1200, 0.03, 'square', 0.03); },
    // 面接官があらわれた: サイレン2回
    siren() { for (let i = 0; i < 2; i++) { tone(620, 0.32, 'sawtooth', 0.07, i * 0.62, 940); tone(940, 0.3, 'sawtooth', 0.07, i * 0.62 + 0.32, 620); } },
    vs() { tone(70, 0.5, 'sine', 0.5, 0, 35); noise(0.35, 0.35, 0, 1800); },
    // 答えが刺さった / 反撃された
    hit() { noise(0.12, 0.4, 0, 2500); tone(1568, 0.08, 'square', 0.06, 0.02); tone(2093, 0.12, 'square', 0.05, 0.08); },
    crit() { noise(0.2, 0.45, 0, 2000); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.1, 'square', 0.06, 0.04 + i * 0.045)); },
    counter() { tone(140, 0.25, 'sawtooth', 0.14, 0, 70); noise(0.25, 0.3, 0, 300, 'lowpass'); },
    // スマホの通知
    notify() { [988, 1319].forEach((f, i) => tone(f, 0.14, 'sine', 0.13, i * 0.11)); },
    stampin() { tone(90, 0.3, 'sine', 0.5, 0, 45); noise(0.15, 0.35, 0, 600, 'lowpass'); },
  };

  function toggle() {
    on = !on;
    if (master) master.gain.value = on ? 0.5 : 0;
    try { localStorage.setItem('nt-sound', on ? 'on' : 'off'); } catch (e) { /* 保存できなくても切替は効く */ }
    return on;
  }

  KV.sound = { play: (n, ...a) => SFX[n] && SFX[n](...a), toggle, isOn: () => on, unlock: ctx };
})();
