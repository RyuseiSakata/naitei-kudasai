// 内定ください: 3月〜9月の就活シーズン。月のはじめにメールを開け、エントリーし、その月の選考を受ける
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = KV.clamp, R = KV.RATIO, ST = KV.STAGES;
  const app = $('app');
  const S = { pf: {}, month: KV.FIRST_MONTH, mental: 100, apps: [], mails: [], silent: [], step: '', plan: [], planDone: false, busy: false, rivals: [], line: [], lost: [], accepted: null, warned: 0 };

  // ===== 演出 =====
  let sfxTimer = 0;
  const fx = {
    shake(cls = 'shake') { app.classList.remove('shake', 'quake'); void app.offsetWidth; app.classList.add(cls); },
    vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 非対応端末は無視 */ } },
    // 漫画の効果音の文字(集中線つき)
    sfx(html, cls = '') {
      const el = $('sfx');
      el.className = 'sfx ' + cls; el.innerHTML = `<i class="burst"></i><b>${html}</b>`; void el.offsetWidth; el.classList.add('go');
      clearTimeout(sfxTimer); sfxTimer = setTimeout(() => el.classList.remove('go'), 1700);
    },
    flash(cls = '') { const f = $('flash'); f.className = 'flash ' + cls; void f.offsetWidth; f.classList.add('go'); },
    confetti(n = 70) {
      const box = $('confetti'), cols = ['--c-red', '--c-yellow', '--c-cyan', '--c-pink', '--c-green'];
      for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.background = `var(${KV.pick(cols)})`;
        p.style.setProperty('--dx', (Math.random() * 2 - 1) * 160 + 'px');
        p.style.setProperty('--rot', Math.random() * 900 + 'deg');
        p.style.animationDelay = Math.random() * 0.4 + 's';
        p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
        box.appendChild(p);
        setTimeout(() => p.remove(), 3400);
      }
    },
    countUp(el, to, fmt, ms = 700) {
      const t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    },
  };
  const SCENES = ['s-title', 's-month', 's-web', 's-iv', 's-gd', 's-result'];
  // intro: カレンダーや持ち駒を出さない(タイトルと自己紹介面接)
  function show(id, intro = id === 's-title') {
    SCENES.forEach((s) => ($(s).hidden = s !== id));
    document.body.classList.toggle('intro', intro);
    document.body.dataset.scene = id;
    const el = $(id); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    window.scrollTo(0, 0);
  }
  $('mute').addEventListener('click', () => $('mute').setAttribute('aria-pressed', String(KV.sound.toggle())));
  $('mute').setAttribute('aria-pressed', String(KV.sound.isOn()));
  $('src').textContent = KV.SOURCES;
  $('max-active').textContent = KV.MAX_ACTIVE;

  // ===== タイトル: 面接官がずらっと並んで表情を変える =====
  const BOSSES = Object.keys(KV.BOSS);
  $('lineup').innerHTML = BOSSES.map((b) => `<figure class="lu" data-b="${b}">${KV.chara.face(b)}<figcaption>${KV.BOSS[b].title}</figcaption></figure>`).join('');
  setInterval(() => {
    if ($('s-title').hidden) return;
    const f = KV.pick([...document.querySelectorAll('.lu')]);
    f.innerHTML = KV.chara.face(f.dataset.b, KV.pick(['happy', 'angry', 'shock', 'normal'])) + `<figcaption>${KV.BOSS[f.dataset.b].title}</figcaption>`;
    f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop');
  }, 900);

  // ===== 確率 =====
  //   会社の求人倍率 = 規模の倍率 × (業種の倍率 ÷ 全体)^0.5 。平均的な学生の内定率に直す(ゲーム内の基準)
  const ratioOf = (co) => R.size[co.size] * Math.sqrt(R.ind[co.ind] / R.all);
  const offerP = (co) => clamp(1 - Math.exp(-0.06 * ratioOf(co)), 0.01, 0.35);
  const profileScore = () => 0.5 * S.pf.univ + 0.3 * S.pf.gaku + 0.2 * S.pf.toeic + (S.pf.kind === 'pub' ? 0.03 : 0);
  // 就活の罠に引っかかった回数
  const trap = () => (S.trap = S.trap || { gosha: 0, dress: 0, full: 0, rev: 0 });
  const meType = () => (S.pf.sex === 'f' ? 'me-f' : 'me-m');
  // 文理男女別の内定率(%)。ゼミの同期は、自分と同じ文系・理系として扱う
  const grpKey = (sex = S.pf.sex) => (KV.RIKEI[S.pf.fac] ? 's' : 'b') + (sex === 'f' ? 'f' : 'm');
  const grpRate = (m, sex) => KV.NAITEI_GROUP[grpKey(sex)][Math.min(m, 10)];

  // ===== 自己紹介面接: 性別を選んだら、すぐ面接官があらわれる。プロフィールは面接で答えながら決める =====
  document.querySelectorAll('.t-face').forEach((f) => (f.innerHTML = KV.chara.face(f.dataset.t, 'happy')));
  $('t-start').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sex]'); if (!b || S.busy) return;
    KV.sound.unlock(); KV.sound.play('up');
    S.pf = { sex: b.dataset.sex, sexLabel: b.dataset.sex === 'f' ? '女性' : '男性' }; S.mental = 100;
    selfIntro();
  });
  async function selfIntro() {
    const type = KV.INTRO_BOSS, boss = KV.BOSS[type];
    S.busy = true;
    await encounterFx(type, '就活解禁の前に ― 自己紹介', `${boss.name}(${boss.title})が あらわれた！`, false);
    show('s-iv', true);
    $('s-iv').classList.remove('final', 'web');
    document.querySelector('.iv-stage').classList.add('intro');
    $('iv-co').textContent = '自己紹介';
    $('iv-boss').textContent = `${boss.name}(${boss.title})`;
    $('iv-sfx').textContent = ''; $('iv-ch').innerHTML = ''; setLog('');
    let meter = 50; setMeter(meter);
    setFace(type, 'normal'); say(KV.INTRO_HELLO);
    await wait(1100);
    for (const p of KV.PROFILE.filter((x) => x.id !== 'sex')) {
      const r = KV.INTRO[p.id];
      say(r.q); setFace(type, 'normal'); setLog(p.note || '');
      const i = await new Promise((res) => {
        $('iv-ch').innerHTML = p.opts.map(([l], k) => `<button type="button" class="ans" data-k="${k}">${esc(l)}</button>`).join('');
        $('iv-ch').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) { $('iv-ch').onclick = null; res(+b.dataset.k); } };
      });
      S.pf[p.id] = p.opts[i][1]; S.pf[p.id + 'Label'] = p.opts[i][0];
      $('iv-ch').innerHTML = '';
      const [expr, line, d] = r.r[i];
      setFace(type, expr); say(line);
      meter = clamp(meter + d, 0, 100); setMeter(meter);
      hitFx(d);
      await wait(1150);
    }
    const [expr, line] = KV.INTRO_BYE[meter >= 65 ? 'hi' : meter <= 35 ? 'lo' : 'mid'];
    setFace(type, expr); say(line); setLog('');
    await wait(1500);
    document.querySelector('.iv-stage').classList.remove('intro');
    S.busy = false;
    if (S.demo) demoDone(); else newSeason();
  }
  function newSeason() {
    Object.assign(S, { month: KV.FIRST_MONTH, mental: 100, apps: [], line: [], lost: [], accepted: null, warned: 0, lastES: null, sick: 0, ng: 0, full: {}, trap: { gosha: 0, dress: 0, full: 0, rev: 0 } });
    S.rivals = KV.RIVALS.map((r) => ({ ...r, u: Math.random(), co: null, month: 0 }));
    startMonth();
  }

  // ===== 画面上の状態(カレンダー・メンタル・持ち駒) =====
  function renderTop() {
    $('cal-m').textContent = S.month > KV.LAST_MONTH ? 10 : S.month;
    $('m-val').textContent = Math.round(S.mental);
    $('m-bar').style.width = S.mental + '%';
    $('m-bar').className = S.mental < 40 ? 'low' : '';
    const mood = S.mental >= 60 ? 'normal' : S.mental >= 25 ? 'shock' : 'cry';
    if ($('me-mini').dataset.mood !== mood + meType()) { $('me-mini').dataset.mood = mood + meType(); $('me-mini').innerHTML = KV.chara.face(meType(), mood); }
    const act = S.apps.filter((a) => a.state === 'active').length;
    $('koma-n').textContent = `${act} / ${KV.MAX_ACTIVE}`;
    $('koma-empty').hidden = S.apps.length > 0;
    $('koma').innerHTML = S.apps.map((a) => {
      const pips = ST.map((st, i) => {
        const cls = a.state === 'out' && i === a.failAt ? 'x' : i < a.passed ? 'ok' : (a.pending && a.pending.stage === i) || a.todo === i ? 'now' : '';
        return `<i class="${cls}" title="${st.name}">${st.short}</i>`;
      }).join('');
      const tag = a.state === 'naitei' ? '<b class="k-naitei">内定</b>' : a.state === 'lost' ? '<b class="k-out">取り消し</b>' : a.state === 'out' ? `<b class="k-out">${a.silent ? '音信不通' : 'お祈り'}</b>` : `<b class="k-wait">${a.todo != null ? ST[a.todo].name : '結果待ち'}</b>`;
      // 内定には返事の期限がある。承諾すると就活は終わり
      const act = a.state === 'naitei' && S.month <= KV.LAST_MONTH
        ? `<span class="k-dl">${a.deadline === S.month ? '今月中に返事を' : `${a.deadline}月中に返事を`}</span><span class="k-act">
            <button type="button" class="btn red k-ok" data-act="ok" data-id="${a.co.id}">内定承諾書を見る</button>
            ${a.waited ? '' : `<button type="button" class="btn sm" data-act="wait" data-id="${a.co.id}">待ってもらう</button>`}</span>`
        : '';
      return `<li class="k-${a.state}${a.fresh ? ' fresh' : ''}"><span class="k-name">${esc(a.co.name)}</span>${tag}<span class="pips">${pips}</span>${act}</li>`;
    }).join('');
    S.apps.forEach((a) => (a.fresh = false));
    renderNat();
  }
  // 全国の内定率と、ゼミの同期
  function renderNat() {
    const [rate, when] = KV.NAITEI_RATE[Math.min(S.month, 10)];
    $('nat-when').textContent = `(${when}時点)`;
    $('nat-v').textContent = rate.toFixed(1) + '%';
    $('nat-bar').style.width = rate + '%';
    const mine = S.apps.filter((a) => a.state === 'naitei').length;
    $('nat-you').innerHTML = mine ? `あなた: <b>内定 ${mine}社</b>` : `あなた: <b class="zero">内定 0社</b>(全国の${rate.toFixed(1)}%に入れていない)`;
    $('nat-grp').innerHTML = `あなたと同じ${KV.GROUP_NAME[grpKey()]}: <b>${grpRate(S.month, S.pf.sex).toFixed(1)}%</b>`;
    $('peers').innerHTML = S.rivals.map((r) => `<span class="peer${r.co ? ' done' : ''}" title="${esc(r.note)}"><i class="${r.sex}">${esc(r.name[0])}</i>${esc(r.name)}${r.co ? '<b>内定</b>' : ''}</span>`).join('');
    $('line').innerHTML = S.line.slice(-6).map((m) => `<li class="${m.me ? 'me' : ''}${m.fresh ? ' fresh' : ''}" style="--d:${m.d || 0}s"><b>${esc(m.who)}</b><span>${esc(m.text)}</span></li>`).join('');
    S.line.forEach((m) => (m.fresh = false));
  }
  // 同期が内定をもらう時期は、全国の内定率から決める
  function rivalsTick() {
    let n = 0;
    const add = (who, text) => S.line.push({ who, text, fresh: true, d: n++ * 0.5 });
    // 自分が落ちた会社に、同期が受かることがある
    const failed = S.apps.filter((a) => a.state === 'out' || a.state === 'lost').map((a) => a.co);
    const mine = S.apps.some((a) => a.state === 'naitei');
    const news = [];
    S.rivals.filter((r) => !r.co && r.u < Math.min(0.97, (grpRate(S.month, r.sex) / 100) * r.k)).forEach((r) => {
      const pool = KV.COMPANIES.filter((c) => (r.k >= 1.1 ? c.size !== 's' : c.size !== 'xl'));
      const stab = failed.length > 0 && Math.random() < 0.45;
      r.co = stab ? KV.pick(failed) : KV.pick(pool); r.month = S.month;
      const text = S.month === KV.FIRST_MONTH ? KV.pick(KV.TALK.early) : KV.pick(KV.TALK.offer).replace('{co}', r.co.name);
      add(r.name, text);
      // 自分にまだ内定がないと、同期の報告が刺さる。落ちた会社なら、もっと刺さる
      const hurt = (mine ? 0 : 5) + (stab ? 5 : 0);
      if (hurt) news.push({ r, text, stab, hurt });
      else toast(r.name, text, '');
    });
    const left = S.rivals.filter((r) => !r.co);
    if (left.length && Math.random() < 0.6) add(KV.pick(left).name, KV.pick(KV.TALK.chat));
    renderNat();
    return news;
  }
  // 刺さる報告は、全画面で1人ずつ突きつける(クリックで次へ)。減ったメンタルの合計を返す
  function peerNews(list) {
    if (!list.length) return Promise.resolve(0);
    const el = $('news');
    let i = 0, total = 0, t = 0;
    return new Promise((res) => {
      const next = () => {
        clearTimeout(t);
        if (i >= list.length) { el.onclick = null; el.hidden = true; res(total); return; }
        const n = list[i++];
        total += n.hurt;
        $('news-peer').innerHTML = KV.chara.face(n.r.sex === 'f' ? 'me-f' : 'me-m', 'happy') + `<b>${esc(n.r.name)}</b>`;
        $('news-talk').textContent = n.text;
        $('news-t').textContent = `${n.r.name}、内定。`;
        $('news-co').textContent = n.r.co.name;
        $('news-stab').hidden = !n.stab;
        $('news-me').innerHTML = KV.chara.face(meType(), n.stab ? 'cry' : 'shock')
          + `<b class="news-dmg">メンタル −${n.hurt}</b><span class="news-say">${esc(KV.pick(n.stab ? KV.TALK.stabbed : KV.TALK.hurt))}</span>`;
        // 最後の1枚で、ゼミの中での自分の位置を見せる
        const done = S.rivals.filter((r) => r.co).length, have = S.apps.filter((a) => a.state === 'naitei').length;
        $('news-sum').textContent = i === list.length ? `ゼミ${S.rivals.length + 1}人中 ${done}人が内定。あなたは ${have}社。` : `次の報告 あと${list.length - i}件`;
        el.className = 'news' + (n.stab ? ' stab' : '') + (i === list.length && !have ? ' last' : '');
        el.hidden = false; void el.offsetWidth; el.classList.add('go');
        KV.sound.play('notify'); fx.vibrate(40);
        setTimeout(() => KV.sound.play('stampin'), 550);
        setTimeout(() => { KV.sound.play('counter'); fx.vibrate(80); }, 1150);
        if (n.stab) setTimeout(() => { KV.sound.play('fired'); fx.vibrate([60, 40, 160]); }, 1700);
        t = setTimeout(next, n.stab ? 3800 : 3000);
      };
      el.onclick = next;
      next();
    });
  }
  // スマホの通知のように、上から1件ずつ出す
  const toastQ = [];
  let toastOn = false;
  function toast(who, text, sub, from = 'ゼミ同期') { toastQ.push({ who, text, sub, from }); if (!toastOn) nextToast(); }
  function nextToast() {
    const m = toastQ.shift(), el = $('toast');
    if (!m) { toastOn = false; return; }
    toastOn = true;
    el.innerHTML = `<i>トーク</i><span class="tt-who">${esc(m.from)} / ${esc(m.who)}</span><span class="tt-text">${esc(m.text)}</span>${m.sub ? `<em>${esc(m.sub)}</em>` : ''}`;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    KV.sound.play('notify'); fx.vibrate(40);
    setTimeout(() => { el.classList.remove('go'); setTimeout(nextToast, 300); }, 2100);
  }
  $('koma').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || S.busy) return;
    const a = S.apps.find((x) => x.co.id === b.dataset.id);
    if (b.dataset.act === 'ok') openOffer(a);
    else if (!a.waited) askWait(a);
  });
  // ===== 内定承諾書 =====
  //   内定の通知を閉じたとき、持ち駒の「承諾する」を押したときに出る。承諾すると就活は終わり
  function askWait(a) {
    a.waited = true;
    const ok = Math.random() < KV.WAIT_OK;
    if (ok) { a.deadline++; KV.sound.play('ok'); fx.sfx('1ヶ月だけ<small>待ってもらえた</small>', 'pass'); }
    else { KV.sound.play('deny'); fx.shake(); fx.sfx('「今月中に<small>お願いします」</small>', 'gloom'); }
    renderTop();
    return ok;
  }
  function openOffer(a) {
    if (S.busy || S.month > KV.LAST_MONTH) return;
    const el = $('offer');
    const rest = S.apps.filter((x) => x !== a && (x.state === 'active' || x.state === 'naitei'));
    const done = S.rivals.filter((r) => r.co).length;
    $('od-to').textContent = `${a.co.name} 御中`;
    $('od-spec').innerHTML = `<span><i>初任給</i><b>${KV.yen(a.co.salary)}</b></span><span><i>会社の規模</i><b>社員 ${KV.SIZE[a.co.size]}</b></span><span><i>返事の期限</i><b class="dl">${a.deadline === S.month ? '今月中' : `${a.deadline}月中`}</b></span>`;
    $('od-name').textContent = '';
    $('od-han').textContent = '';
    $('od-warn').innerHTML = (rest.length ? `承諾すると、ほかの持ち駒<b>${rest.length}社</b>は辞退になります。` : '承諾すると、就活は終わりです。')
      + `<br>ゼミの同期は<b>${done}人</b>が内定済み。`;
    $('od-act').innerHTML = `<button type="button" class="btn red big" data-o="ok">承諾して、就活を終える</button>
      <button type="button" class="btn" data-o="hold">保留する</button>
      ${a.waited ? '' : '<button type="button" class="btn" data-o="wait">返事を1ヶ月待ってもらう</button>'}`;
    el.className = 'offer';
    el.hidden = false; void el.offsetWidth; el.classList.add('go');
    KV.sound.play('reveal');
    $('od-act').onclick = (e) => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      const o = b.dataset.o;
      if (o === 'hold') { el.hidden = true; KV.sound.play('tick'); return; }
      if (o === 'wait') { el.hidden = true; askWait(a); return; }
      // 承諾: 名前を書いて、ハンコを押して、画面いっぱいに「内定承諾」
      $('od-act').onclick = null; $('od-act').innerHTML = '';
      S.accepted = a; S.busy = true;
      const name = S.pf.sex === 'f' ? '就活 花子' : '就活 太郎';
      let n = 0;
      const write = setInterval(() => { n++; $('od-name').textContent = name.slice(0, n); KV.sound.play('tick'); if (n >= name.length) clearInterval(write); }, 120);
      setTimeout(() => { $('od-han').textContent = '就活'; el.classList.add('han'); KV.sound.play('stampin'); fx.shake(); fx.vibrate(60); }, 1150);
      setTimeout(() => {
        el.classList.add('big'); fx.flash(); fx.shake('quake'); fx.vibrate([60, 40, 200]);
        KV.sound.play('win'); fx.confetti(120);
      }, 1900);
      setTimeout(() => { el.hidden = true; S.busy = false; result(); }, 4200);
    };
  }

  // メンタルの増減: バーが削れていく演出と、主人公のリアクション
  let trailT = 0, popT = 0;
  function setMental(d) {
    const old = S.mental;
    S.mental = clamp(S.mental + d, 0, 100);
    const diff = Math.round(S.mental - old);
    renderTop();
    if (!diff) return;
    const trail = $('m-trail');
    clearTimeout(trailT);
    trail.className = diff < 0 ? 'hurt' : 'heal';
    trail.style.transition = 'none'; trail.style.width = (diff < 0 ? old : S.mental) + '%';
    if (diff > 0) { $('m-bar').style.transition = 'none'; $('m-bar').style.width = old + '%'; }
    void trail.offsetWidth;
    trailT = setTimeout(() => { trail.style.transition = ''; $('m-bar').style.transition = ''; trail.style.width = S.mental + '%'; $('m-bar').style.width = S.mental + '%'; }, 450);
    fx.countUp($('m-val'), 1, (k) => Math.round(old + (S.mental - old) * k), 900);
    const tag = document.createElement('em');
    tag.className = 'm-delta ' + (diff < 0 ? 'down' : 'up');
    tag.textContent = (diff < 0 ? '−' : '+') + Math.abs(diff);
    $('mental').appendChild(tag);
    setTimeout(() => tag.remove(), 1500);
    const box = $('mental'); box.classList.remove('hit', 'joy'); void box.offsetWidth; box.classList.add(diff < 0 ? 'hit' : 'joy');
    // 大きく動いたときは、主人公が大きく出てくる
    if (diff <= -10 || diff >= 20) {
      const expr = diff > 0 ? 'happy' : S.mental < 25 ? 'cry' : 'shock';
      const lines = diff > 0 ? KV.HURT.up : S.mental < 25 ? KV.HURT.bottom : KV.HURT.big;
      $('me-face').innerHTML = KV.chara.face(meType(), expr);
      $('me-say').textContent = KV.pick(lines);
      $('me-dmg').textContent = `メンタル ${diff < 0 ? '−' : '+'}${Math.abs(diff)}`;
      const pop = $('me-pop');
      pop.className = 'me-pop ' + (diff < 0 ? 'hurt' : 'joy'); void pop.offsetWidth; pop.classList.add('go');
      clearTimeout(popT); popT = setTimeout(() => pop.classList.remove('go'), 2300);
    }
  }

  // ===== 月のはじめ =====
  async function startMonth() {
    // 月がかわる演出のあいだは、ボタンを押しても進まない(二重に進むとメールが消える)
    S.busy = true;
    $('month-next').disabled = true;
    show('s-month');
    renderTop();
    const last = S.month > KV.LAST_MONTH;
    await monthFlip(last ? '10月' : `${S.month}月`, last ? '内定式の日。最後の結果が届く' : S.month === KV.FIRST_MONTH ? '就活解禁' : `持ち駒 ${S.apps.filter((a) => a.state === 'active').length}社`);
    // メンタルが0になると、その月は寝込んでエントリーできない(少し回復する)
    const sick = S.mental <= 0 && !last;
    if (sick) S.sick = S.month;
    expireOffers();
    const hurt = await peerNews(rivalsTick());
    if (hurt) setMental(-hurt);
    // 内定がないまま5月をむかえると、家族からもLINEが来る
    if (!last && S.month >= 5 && !S.apps.some((a) => a.state === 'naitei') && Math.random() < KV.PARENT_P) {
      const [who, text, m] = KV.pick(KV.PARENT);
      toast(who, text, '', '家族');
      setTimeout(() => setMental(m), 1200);
    }
    if (sick) setTimeout(() => { fx.sfx('心が折れた……<small>今月は布団から出られない</small>', 'gloom'); setMental(30); }, hurt ? 2400 : 300);
    judgeAll();
    S.busy = false;
    if (S.mails.length || S.silent.length || S.lost.length) setStep('mail'); else if (last) result(); else setStep('board');
    if (S.lost.length) setTimeout(() => { fx.flash('dark'); fx.shake('quake'); KV.sound.play('buyout'); setMental(-12 * S.lost.length); }, 500);
  }
  // 返事をしなかった内定は取り消し(10月は、9月にもらった内定までは有効)
  function expireOffers() {
    const lim = S.month > KV.LAST_MONTH ? S.month - 1 : S.month;
    S.lost = S.apps.filter((a) => a.state === 'naitei' && a.deadline < lim);
    S.lost.forEach((a) => (a.state = 'lost'));
  }
  function monthFlip(m, sub) {
    const el = $('monthflip');
    $('mf-m').textContent = m; $('mf-sub').textContent = sub;
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    KV.sound.play('drum');
    return wait(1300).then(() => { el.hidden = true; });
  }

  // 前の月に受けた選考の結果を出す
  function judgeAll() {
    S.mails = []; S.silent = []; S.silentShown = false;
    S.apps.filter((a) => a.state === 'active' && a.pending).forEach((a) => {
      const { stage, score } = a.pending, st = ST[stage];
      // 同じ文理男女の内定率が全国より高い月は通りやすく、低い月は通りにくい(効き方はゲーム内の基準)
      const tk = Math.sqrt(grpRate(S.month, S.pf.sex) / KV.NAITEI_RATE[Math.min(S.month, 10)][0]);
      const p1 = Math.pow(offerP(a.co), 1 / ST.length) * tk;
      const k = st.id === 'iv1' || st.id === 'iv2' ? 1.7 * score : st.id === 'web' ? 0.2 + 1.4 * score : 0.6 + 0.8 * score;
      let pass = Math.random() < clamp(p1 * k, 0.02, 0.85);
      // 学歴フィルター(大企業の書類選考。強さはゲーム内の基準)
      if (st.id === 'es' && a.co.size === 'xl' && S.pf.univ <= 0.42 && Math.random() < 0.6) { pass = false; a.filter = true; }
      // 使い回したESに他社の名前が残っていたら、書類で必ず落ちて、お祈りメールで指摘される
      if (st.id === 'es' && a.copyMiss) { pass = false; a.filter = false; S.mails.push({ a, stage, kind: 'pray' }); a.pending = null; return; }
      a.pending = null;
      if (pass) S.mails.push({ a, stage, kind: stage === ST.length - 1 ? 'naitei' : 'pass' });
      else if (st.id === 'es' && (a.filter || Math.random() < 0.35)) S.silent.push({ a, stage });
      else S.mails.push({ a, stage, kind: 'pray' });
    });
    S.mails = KV.shuffle(S.mails);
    // 予兆: 封筒が金色に光る(通過なら高め、落ちても少し)
    S.mails.forEach((m) => (m.gold = Math.random() < (m.kind === 'pray' ? 0.08 : 0.5)));
  }

  function setStep(step) {
    S.step = step;
    $('p-mail').hidden = step !== 'mail';
    $('p-board').hidden = step !== 'board';
    $('p-plan').hidden = step !== 'plan';
    const panel = $({ mail: 'p-mail', board: 'p-board', plan: 'p-plan' }[step]);
    panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter');
    if (step === 'mail') renderDesk(true);
    if (step === 'board') renderBoard();
    if (step === 'plan') { S.planDone = false; makePlan(); renderPlan(); }
    renderNext();
  }
  function renderNext() {
    const b = $('month-next'), last = S.month > KV.LAST_MONTH;
    let t = '', on = true;
    if (S.step === 'mail') { on = S.mails.every((m) => m.open); t = last ? '結果を見る' : 'エントリーへ'; }
    else if (S.step === 'board') t = '今月の予定へ';
    else if (S.step === 'plan') t = S.plan.length && !S.planDone ? '選考を受ける' : S.month >= KV.LAST_MONTH ? '10月へ(最後の結果)' : `${S.month + 1}月へ`;
    b.textContent = t; b.disabled = !on;
  }
  $('month-next').addEventListener('click', async () => {
    if (S.busy) return;
    if (S.step === 'mail') { if (S.month > KV.LAST_MONTH) result(); else setStep('board'); }
    else if (S.step === 'board') setStep('plan');
    else if (S.step === 'plan') {
      if (S.plan.length && !S.planDone) { await runPlan(); return; }
      // 今月が期限の内定に返事をしていないときは、1回だけ止める
      const due = S.apps.filter((a) => a.state === 'naitei' && a.deadline === S.month);
      if (due.length && S.warned !== S.month) {
        S.warned = S.month;
        KV.sound.play('alarm'); fx.shake();
        fx.sfx('内定の返事がまだ！<small>このまま進むと取り消し</small>', 'gloom');
        $('month-next').textContent = '返事をせずに進む';
        return;
      }
      S.month++;
      startMonth();
    }
  });

  // ===== 受信箱(机の上の封筒) =====
  function renderDesk(fly) {
    const n = S.mails.length;
    $('mail-h').textContent = n ? `${S.month > KV.LAST_MONTH ? 10 : S.month}月、メールが${n}通届いた` : 'メールは届かなかった';
    $('mail-note').hidden = !n;
    $('lost').hidden = !S.lost.length;
    $('lost').textContent = S.lost.length ? `${S.lost.map((a) => a.co.name).join('、')}の内定は、返事をしなかったので取り消された。` : '';
    $('desk').innerHTML = S.mails.map((m, i) => {
      const res = m.open ? `<em class="st-${m.kind}">${m.kind === 'pray' ? '不採用' : m.kind === 'naitei' ? '内定' : '通過'}</em>` : '';
      return `<button type="button" class="tile${m.open ? ' open' : ''}${m.gold && !m.open ? ' gold' : ''}${fly ? ' fly' : ''}" data-i="${i}" style="--d:${i * 0.12}s">
        <span class="t-from">${esc(m.a.co.name)}</span><span class="t-sub">${ST[m.stage].name}の結果</span>${res}</button>`;
    }).join('');
    if (fly && n) S.mails.forEach((m, i) => setTimeout(() => KV.sound.play('mail'), i * 120));
    const done = S.mails.every((m) => m.open);
    $('silent').hidden = !(done && S.silent.length);
    if (done && S.silent.length && !S.silentShown) {
      S.silentShown = true;
      S.silent.forEach(({ a, stage }) => { a.state = 'out'; a.silent = true; a.failAt = stage; });
      setMental(-10 * S.silent.length);
    }
    $('silent').textContent = S.silent.length ? `${S.silent.map((x) => x.a.co.name).join('、')}からは、いくら待っても連絡が来なかった。(サイレントお祈り)` : '';
    renderNext();
  }
  $('desk').addEventListener('click', (e) => {
    const b = e.target.closest('.tile'); if (!b) return;
    const m = S.mails[+b.dataset.i];
    if (!m.open) openMail(m);
  });

  // ===== 封筒を開ける =====
  let cur = null;
  function openMail(m) {
    cur = m;
    $('env').className = 'env' + (m.gold ? ' gold' : '');
    $('env-from').textContent = m.a.co.name + ' 人事部';
    $('env').hidden = false; $('letter').hidden = true;
    $('mail').hidden = false;
    KV.sound.play(m.gold ? 'alarm' : 'card');
    if (m.gold) fx.vibrate(30);
  }
  $('env').addEventListener('click', async () => {
    const m = cur; if (!m || m.open || S.busy) return;
    S.busy = true;
    m.open = true;
    const co = m.a.co, st = ST[m.stage];
    $('env').classList.add('opening');
    KV.sound.play('card');
    await wait(520);
    $('env').hidden = true;
    const L = $('letter');
    const stamp = { pray: '不採用', pass: '通過', naitei: '内定' }[m.kind];
    let body;
    if (m.kind === 'pray') body = `このたびは${st.name}にご参加いただき、誠にありがとうございました。慎重に選考を重ねました結果、誠に残念ながら、今回はご期待に添えない結果となりました。<br>末筆ながら、今後のご活躍を心よりお祈り申し上げます。${m.a.busted === m.stage ? '<br><span class="lt-ps">追伸: 面接でのお話と、エントリーシートの内容に、いくつか食い違いがございました。</span>' : ''}${m.a.copyMiss && m.stage === 0 ? `<br><span class="lt-ps">追伸: ご提出のエントリーシートの宛名が「${esc(m.a.copyMiss)}」様になっておりました。</span>` : ''}`;
    else if (m.kind === 'naitei') body = `このたびは最終面接にお越しいただき、ありがとうございました。厳正なる選考の結果、あなたを採用することに決定いたしました。<br>初任給: ${KV.yen(co.salary)}<br><span class="lt-ps">${S.month > KV.LAST_MONTH ? '本日の内定式でお待ちしております。' : '内定を承諾されるかどうか、今月中にお返事ください。'}</span>`;
    else body = `厳正なる選考の結果、${st.name}を通過されました。次の選考のご案内をお送りします。`;
    L.className = 'letter ' + m.kind;
    L.innerHTML = `<p class="lt-sub">${esc(m.kind === 'pray' ? '選考結果のご連絡' : st.pass)}</p><p class="lt-from">${esc(co.name)} 人事部</p><p class="lt-body">${body}</p><span class="stamp s-${m.kind}">${stamp}</span><p class="lt-close">クリックして閉じる</p>`;
    L.hidden = false;
    await wait(650);
    const a = m.a;
    if (m.kind === 'pray') {
      a.state = 'out'; a.failAt = m.stage;
      fx.flash('dark'); fx.shake('quake'); fx.vibrate(80); KV.sound.play('buyout');
      fx.sfx((a.copyMiss && m.stage === 0) || a.busted === m.stage ? 'バレてた…' : 'ズーン…', 'gloom'); setMental(-15);
    } else if (m.kind === 'naitei') {
      a.state = 'naitei'; a.passed = ST.length; a.deadline = Math.min(S.month, 10); a.month = Math.min(S.month, 10);
      S.line.push({ who: KV.pick(S.rivals).name, text: KV.pick(KV.TALK.you).replace('{n}', S.pf.sex === 'f' ? '花子' : '太郎'), fresh: true });
      fx.flash(); fx.shake('quake'); fx.vibrate([60, 40, 160]); KV.sound.play('win'); fx.confetti();
      fx.sfx('内定！！', 'naitei'); setMental(25);
    } else {
      a.passed = m.stage + 1; a.todo = m.stage + 1;
      fx.flash(); fx.shake(); KV.sound.play('reveal');
      fx.sfx('通過！', 'pass'); setMental(4);
    }
    S.busy = false;
  });
  $('letter').addEventListener('click', () => {
    if (S.busy) return;
    const m = cur;
    $('mail').hidden = true; cur = null; renderDesk(false);
    // 内定の通知を閉じたら、そのまま内定承諾書
    if (m && m.kind === 'naitei') setTimeout(() => openOffer(m.a), 400);
  });

  // ===== エントリー =====
  function renderBoard() {
    const act = S.apps.filter((a) => a.state === 'active').length;
    if (S.sick === S.month) { $('board').innerHTML = '<p class="sick">心が折れて、今月は布団から出られなかった。エントリーはお休み。(メンタルが少し回復した)</p>'; return; }
    const list = KV.COMPANIES.filter((co) => co.open[0] <= S.month && S.month <= co.open[1] && !S.apps.some((a) => a.co.id === co.id));
    $('board').innerHTML = list.length ? list.map((co) => {
      const r = R.size[co.size], b = KV.BOSS[co.boss];
      // 偏差値が低いと、大企業の説明会がなぜか満席(その月はエントリーできない)
      const fk = co.id + '-' + S.month;
      if (S.full && S.full[fk] === undefined) { S.full[fk] = co.size === 'xl' && S.pf.univ <= 0.42 && Math.random() < KV.FULL_P; if (S.full[fk]) trap().full++; }
      const full = S.full && S.full[fk];
      const per = r < 1 ? `学生${(1 / r).toFixed(1)}人に求人1件` : `求人${r.toFixed(1)}件に学生1人`;
      const closing = co.open[1] === S.month ? '<span class="closing">今月で締切</span>' : '';
      return `<button type="button" class="co${full ? ' full' : ''}" data-id="${co.id}" ${act >= KV.MAX_ACTIVE || full ? 'disabled' : ''}>
        ${closing}<span class="co-head">
          <span class="co-name">${esc(co.name)}</span>
          <span class="co-tags"><i>${KV.IND[co.ind]}</i><i>社員 ${KV.SIZE[co.size]}</i></span>
          <span class="co-face">${KV.chara.face(co.boss)}</span>
        </span>
        <span class="co-spec">
          <span class="co-row"><i>初任給</i><b>${(co.salary / 1e4).toFixed(1)}<small>万円</small></b></span>
          <span class="co-row co-ratio${r < 1 ? ' hard' : ''}"><i>求人倍率</i><b>${r.toFixed(2)}<small>倍</small></b></span>
          <span class="co-per">${per}</span>
          <span class="co-row"><i>面接官</i><b class="co-boss">${b.title}</b></span>
        </span>
        ${full ? '<span class="co-full">説明会 満席<small>(さっき見たら空いていたのに……)</small></span>' : '<span class="co-go">エントリーする</span>'}
      </button>`;
    }).join('') : '<p class="note">今月エントリーできる会社はありません。</p>';
  }
  $('board').addEventListener('click', (e) => {
    const b = e.target.closest('.co'); if (!b || b.disabled) return;
    openES(KV.COMPANIES.find((c) => c.id === b.dataset.id));
  });

  // ===== エントリーシートを書く =====
  //   志望動機は業種に合うか、自己PRは面接官の好みに合うかで点が変わる
  const ES = { co: null, mot: null, pr: null, gk: null, motOpts: [], prOpts: [] };
  const gakuTexts = () => KV.GAKU_TEXT[S.pf.gakuLabel];
  function openES(co) {
    const others = Object.keys(KV.MOTIVE).filter((k) => k !== co.ind);
    ES.co = co; ES.mot = null; ES.pr = null; ES.gk = null;
    $('es-gk').textContent = '（下から選んでください）'; $('es-gk').classList.remove('written');
    $('es-mori').textContent = '';
    $('es-gk-o').innerHTML = gakuTexts().map((t, i) => `<button type="button" class="chip es-o" data-k="gk" data-i="${i}"><small class="mori m${i}">${KV.MORI[i].name}</small>${esc(t)}</button>`).join('');
    // 業種に合う志望動機に、「御社」と書いたそっくりの選択肢がまざる(ESは「貴社」が正しい)
    const twin = Math.random() < 0.6;
    ES.motOpts = KV.shuffle([
      [(twin ? '貴社を志望するのは、' : '') + KV.MOTIVE[co.ind], 1],
      ...(twin ? [['御社を志望するのは、' + KV.MOTIVE[co.ind], 1, true]] : []),
      [KV.MOTIVE_GENERIC, 0.5],
      [KV.MOTIVE[KV.pick(others)], 0.15],
      [KV.pick(KV.MOTIVE_BAD), 0.05],
    ]);
    const w = KV.BOSS[co.boss].w;
    const fav = Object.keys(w).sort((x, y) => w[y] - w[x])[0];
    const rest = KV.shuffle(Object.keys(KV.PR).filter((k) => k !== fav)).slice(0, 2);
    ES.prOpts = KV.shuffle([fav, ...rest]).map((k) => [KV.PR[k], clamp(0.5 + w[k] / 40, 0, 1)]);
    $('es-co').textContent = co.name + ' 御中';
    $('es-name').textContent = S.pf.sex === 'f' ? '就活 花子' : '就活 太郎';
    $('es-fac').textContent = S.pf.facLabel + '学部';
    $('es-mot').textContent = $('es-pr').textContent = '（下から選んでください）';
    $('es-mot').classList.remove('written'); $('es-pr').classList.remove('written');
    $('es-mot-o').innerHTML = ES.motOpts.map(([t], i) => `<button type="button" class="chip es-o" data-k="mot" data-i="${i}">${esc(t)}</button>`).join('');
    $('es-pr-o').innerHTML = ES.prOpts.map(([t], i) => `<button type="button" class="chip es-o" data-k="pr" data-i="${i}">${esc(t)}</button>`).join('');
    $('es-hint').textContent = `面接官は「${KV.BOSS[co.boss].title}」らしい。`;
    $('es-copy').hidden = !S.lastES;
    $('es-submit').disabled = true;
    $('es').hidden = false;
    KV.sound.play('card');
  }
  $('es').addEventListener('click', (e) => {
    const b = e.target.closest('.es-o'); if (!b) return;
    const k = b.dataset.k, i = +b.dataset.i;
    ES[k] = i;
    b.parentElement.querySelectorAll('.es-o').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const out = $('es-' + k);
    out.textContent = k === 'gk' ? gakuTexts()[i] : (k === 'mot' ? ES.motOpts : ES.prOpts)[i][0];
    out.classList.remove('written'); void out.offsetWidth; out.classList.add('written');
    if (k === 'gk') { $('es-mori').textContent = i ? `${KV.MORI[i].name}(書類は通りやすい。面接で深掘りされる)` : ''; $('es-mori').className = 'es-mori m' + i; }
    KV.sound.play('tick');
    $('es-submit').disabled = ES.mot === null || ES.pr === null || ES.gk === null;
  });
  function sendES(score, copyMiss, mori, gk) {
    const co = ES.co;
    S.apps.push({ co, state: 'active', passed: 0, pending: { stage: 0, score: clamp(score, 0, 1) }, todo: null, fresh: true, copyMiss, mori, gk, busted: null });
    $('es').hidden = true;
    const card = document.querySelector(`.co[data-id="${co.id}"]`);
    if (card) card.classList.add('sent');
    KV.sound.play('ok'); fx.sfx('提出！', 'pass');
    setTimeout(() => { renderTop(); renderBoard(); }, 420);
  }
  $('es-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (ES.mot === null || ES.pr === null || ES.gk === null) return;
    const fit = (KV.FIT[ES.co.ind] || {})[S.pf.fac] || 0;
    const gosha = !!ES.motOpts[ES.mot][2];
    if (gosha) trap().gosha++;
    const score = 0.5 * profileScore() + 0.25 * ES.motOpts[ES.mot][1] + 0.25 * ES.prOpts[ES.pr][1] + fit + KV.MORI[ES.gk].bonus - (gosha ? KV.GOSHA_MISS : 0);
    S.lastES = { score, co: ES.co.name, mori: ES.gk, gk: gakuTexts()[ES.gk] };
    sendES(score, false, ES.gk, gakuTexts()[ES.gk]);
  });
  // 使い回し: 速いけど、前の会社の名前が残っているかもしれない
  $('es-copy').addEventListener('click', () => sendES(S.lastES.score - 0.1, Math.random() < KV.COPY_MISS ? S.lastES.co : false, S.lastES.mori, S.lastES.gk));
  $('es-cancel').addEventListener('click', () => { $('es').hidden = true; });

  // ===== 今月の予定 =====
  function makePlan() {
    S.plan = [];
    const web = S.apps.filter((a) => a.state === 'active' && a.todo === 1);
    if (web.length) S.plan.push({ kind: 'web', apps: web, label: `Webテスト(${web.map((a) => a.co.name).join('・')})` });
    S.apps.filter((a) => a.state === 'active' && (a.todo === 2 || a.todo === 3)).forEach((a) => S.plan.push({ kind: 'iv', apps: [a], gd: ST[a.todo].id === 'iv1' && a.co.gd, label: `${a.co.name} の${ST[a.todo].id === 'iv1' && a.co.gd ? 'グループディスカッション' : ST[a.todo].name}` }));
    S.apps.filter((a) => a.state === 'active' && a.pending && a.pending.stage === 0).forEach((a) => S.plan.push({ kind: 'es', apps: [a], label: `${a.co.name} の書類選考(結果は来月)`, done: true }));
  }
  function renderPlan() {
    const real = S.plan.filter((p) => p.kind !== 'es');
    $('plan').innerHTML = S.plan.length ? S.plan.map((p) => `<li class="${p.done ? 'done' : ''}"><i>${p.kind === 'web' ? 'Web' : p.kind === 'iv' ? (p.gd ? 'GD' : '面接') : '書類'}</i>${esc(p.label)}</li>`).join('')
      : '<li class="none">今月の予定はなし。カレンダーが白い……</li>';
    if (!real.length) S.planDone = true;
    renderNext();
  }
  async function runPlan() {
    S.busy = true;
    for (const p of S.plan) {
      if (p.done) continue;
      if (p.kind === 'web') {
        const sc = await webTest(p.apps);
        p.apps.forEach((a) => { a.pending = { stage: 1, score: sc }; a.todo = null; });
      } else if (p.kind === 'iv') {
        const a = p.apps[0], stage = a.todo;
        // 一次選考がグループディスカッションの会社もある
        const sc = ST[stage].id === 'iv1' && a.co.gd ? await gd(a) : await interview(a, stage);
        a.pending = { stage, score: sc }; a.todo = null;
      }
      p.done = true;
    }
    S.planDone = true; S.busy = false;
    show('s-month'); renderTop(); renderPlan();
    fx.sfx('結果は来月！', 'pass');
  }

  // ===== Webテスト(4問。SPIや玉手箱によく出る形をまぜる) =====
  //   数の問題は毎回数字が変わる。言葉の問題は問題集から選ぶ
  function makeQ(cat) {
    const pick = KV.pick;
    const N = {
      '割引': () => { const p = pick([1200, 1800, 2400, 3000, 3600]), d = pick([10, 20, 25, 30, 40]); const v = p * (1 - d / 100); return { q: `定価${p.toLocaleString()}円の商品が${d}%引き。売値は？`, v, w: [p * d / 100, v - 100, p - d * 10], u: '円' }; },
      '速さ': () => { let s, m; do { s = pick([40, 60, 80, 90]); m = pick([15, 30, 45, 90]); } while ((s * m) % 60); const v = (s * m) / 60; return { q: `時速${s}kmで${m}分走ると、何km進む？`, v, w: [v + 10, v * 2, s * m / 100], u: 'km' }; },
      '割合': () => { const n = pick([120, 240, 360, 480]), p = pick([15, 25, 35, 45]); const v = (n * p) / 100; return { q: `${n}人の${p}%は何人？`, v, w: [v + 6, v - 6, n - v], u: '人' }; },
      '比': () => { const a = pick([2, 3, 4]), b = pick([5, 7]), k = pick([6, 8, 9]); const v = b * k; return { q: `A:B = ${a}:${b}。Aが${a * k}のとき、Bは？`, v, w: [v + b, v - k, a * b * 2], u: '' }; },
      '損益算': () => { const c = pick([800, 1000, 1500, 2000]), r = pick([20, 30, 50]); const v = c * (1 + r / 100); return { q: `原価${c.toLocaleString()}円に${r}%の利益を乗せた定価は？`, v, w: [c * r / 100, v + 100, c + r * 10], u: '円' }; },
      '仕事算': () => { const [a, b, v] = pick([[12, 6, 4], [10, 15, 6], [6, 3, 2], [20, 30, 12], [12, 4, 3], [30, 20, 12]]); return { q: `Aは1人で${a}日、Bは1人で${b}日かかる仕事。2人でやると何日？`, v, w: [(a + b) / 2, Math.abs(a - b), v + 2], u: '日' }; },
      '濃度': () => { const [w, s] = pick([[180, 20], [380, 20], [240, 60], [160, 40], [450, 50], [85, 15]]); const v = (s / (w + s)) * 100; return { q: `水${w}gに食塩${s}gを溶かした。濃度は何%？`, v, w: [Math.round((s / w) * 100), v + 5, v * 2], u: '%' }; },
      '平均': () => { const n = pick([4, 5]), avg = pick([60, 65, 70]), inc = pick([2, 3, 4]); const v = (avg + inc) * (n + 1) - avg * n; return { q: `${n}人のテストの平均点は${avg}点。1人加わると、平均が${avg + inc}点になった。加わった人は何点？`, v, w: [avg + inc, v - inc, v + 10], u: '点' }; },
      '年齢算': () => { const [p, c] = pick([[40, 10], [44, 12], [36, 8], [42, 10], [50, 14]]); const v = (p - 3 * c) / 2; return { q: `親は${p}歳、子は${c}歳。親の年齢が子の3倍になるのは何年後？`, v, w: [v + 2, p - 3 * c, v + 5], u: '年後' }; },
      '集合': () => { const all = pick([40, 50]), d = pick([18, 22]), c = pick([12, 15]), b = pick([5, 7]); const v = all - (d + c - b); return { q: `${all}人のうち、犬を飼っている人は${d}人、猫は${c}人、両方は${b}人。どちらも飼っていない人は？`, v, w: [all - d - c, v + b, all - d], u: '人' }; },
      '数列': () => {
        const a = pick([1, 2, 3]), r = pick(['+', 'x2', 'x2+1', '++']);
        const s = [a]; for (let i = 0; i < 5; i++) { const x = s[i]; s.push(r === '+' ? x + 4 : r === 'x2' ? x * 2 : r === 'x2+1' ? x * 2 + 1 : x + i + 1); }
        const v = s.pop(); return { q: `${s.join(', ')}, ？　次に入る数は？`, v, w: [v + 1, v - 2, v + 4], u: '' };
      },
      '表の読み取り': () => { const a = pick([80, 120, 160, 200]), r = pick([10, 20, 25, 50]); const b = a * (1 + r / 100); return { q: `A社の売上は、去年${a}億円、今年${b}億円。増加率は何%？`, v: r, w: [b - a, r + 5, Math.round(((b - a) / b) * 100)], u: '%' }; },
    };
    // 言葉の問題: [問題, 正解, まちがい1, まちがい2, まちがい3]
    const W = {
      '推論': [
        ['AはBより背が高い。CはAより背が高い。一番低いのは？', 'B', 'A', 'C', 'わからない'],
        ['PはQより早く着いた。RはPより早く着いた。2番目に着いたのは？', 'P', 'Q', 'R', 'わからない'],
        ['XはYより年上。ZはYより年下。一番年下は？', 'Z', 'X', 'Y', 'わからない'],
        ['赤い箱は青い箱より重い。白い箱は赤い箱より重い。一番重いのは？', '白い箱', '赤い箱', '青い箱', 'わからない'],
      ],
      '二語の関係': [
        ['医者:病院 と同じ関係は？', '教師:学校', '本:作家', '鉛筆:書く', '雨:傘'],
        ['ペン:書く と同じ関係は？', 'はさみ:切る', '机:いす', '本:図書館', '先生:生徒'],
        ['米:日本酒 と同じ関係は？', 'ぶどう:ワイン', '麦:畑', '魚:海', '水:氷'],
        ['犬:動物 と同じ関係は？', 'バラ:花', '車:タイヤ', '木:森', '空:雲'],
      ],
      '語句の意味': [
        ['「杞憂」の意味は？', 'いらない心配', '深い悲しみ', '大きな喜び', '昔の思い出'],
        ['「一石二鳥」の意味は？', '1つで2つの得', '2回やり直す', '2人で協力する', '石を大事にする'],
        ['「腑に落ちない」の意味は？', '納得できない', 'お腹がすいた', '気分が悪い', '忘れられない'],
        ['「役不足」の正しい意味は？', '力に対して役が軽すぎる', '力が足りない', '役者が足りない', '仕事が多すぎる'],
        ['「確信犯」のもとの意味は？', '正しいと信じて行う犯罪', '悪いと知りつつ行う', 'わざと失敗する', '計画的なうそ'],
      ],
      '反対語': [
        ['「抽象」の反対は？', '具体', '具象化', '現実', '詳細'],
        ['「需要」の反対は？', '供給', '必要', '消費', '生産'],
        ['「楽観」の反対は？', '悲観', '主観', '客観', '直観'],
        ['「拡大」の反対は？', '縮小', '減少', '低下', '短縮'],
      ],
      '英語': [
        ['"purchase" と同じ意味は？', 'buy', 'sell', 'borrow', 'return'],
        ['"improve" と同じ意味は？', 'make better', 'make worse', 'keep', 'stop'],
        ['"deadline" の意味は？', 'しめきり', '死んだ線', '休み', '会議'],
        ['"colleague" の意味は？', '同僚', '大学', '上司', '顧客'],
      ],
    };
    const kind = cat || pick([...Object.keys(N), ...Object.keys(W)]);
    if (W[kind]) {
      const [q, ans, ...w] = pick(W[kind]);
      return { cat: kind, q, ans, opts: KV.shuffle([ans, ...w]) };
    }
    for (;;) {
      const x = N[kind]();
      const nums = [x.v, ...x.w].map((n) => Math.round(n));
      if (new Set(nums).size === 4 && nums.every((n) => n > 0)) {
        const fmt = (n) => n.toLocaleString() + x.u;
        return { cat: kind, q: x.q, ans: fmt(nums[0]), opts: KV.shuffle(nums.map(fmt)) };
      }
    }
  }
  // 非言語2問 + 言語1問 + どれか1問。同じ種類は続けない
  function webSet() {
    const non = ['割引', '速さ', '割合', '比', '損益算', '仕事算', '濃度', '平均', '年齢算', '集合', '数列', '表の読み取り'];
    const lang = ['推論', '二語の関係', '語句の意味', '反対語', '英語'];
    const cats = [...KV.shuffle(non).slice(0, 2), KV.pick(lang), KV.pick([...non, ...lang])];
    const seen = new Set();
    return KV.shuffle(cats).map((c) => { let q; do { q = makeQ(c); } while (seen.has(q.q)); seen.add(q.q); return q; });
  }
  function webTest(apps = []) {
    return new Promise((done) => {
      const qs = webSet();
      let i = 0, ok = 0, lock = false;
      show('s-web');
      $('w-no').textContent = ''; $('w-q').textContent = ''; $('w-ch').innerHTML = ''; $('w-bar').style.width = '100%';
      const next = () => {
        if (i >= qs.length) {
          fx.sfx(`${ok} / ${qs.length}問 正解`, ok >= 3 ? 'pass' : 'gloom');
          return setTimeout(() => done(ok / qs.length), 1500);
        }
        const q = qs[i]; lock = false;
        $('w-no').textContent = `${i + 1} / ${qs.length}　${q.cat}`;
        $('w-q').textContent = q.q;
        $('w-ch').innerHTML = q.opts.map((n) => `<button type="button" class="ch" data-v="${esc(n)}">${esc(n)}</button>`).join('');
        // 文章が長い問題は、時間を長めに
        runTimer('w-bar', ['平均', '集合', '年齢算', '仕事算', '推論', '表の読み取り'].includes(q.cat) ? 16000 : 12000, () => answer(null));
        $('w-ch').onclick = (e) => { const b = e.target.closest('.ch'); if (b) answer(b.dataset.v); };
        function answer(v) {
          if (lock) return; lock = true; stopTimer();
          const good = v === q.ans;
          $('w-ch').querySelectorAll('.ch').forEach((b) => { b.disabled = true; if (b.dataset.v === q.ans) b.classList.add('right'); else if (b.dataset.v === v) b.classList.add('wrong'); });
          if (good) { ok++; KV.sound.play('ok'); fx.sfx('正解！', 'pass'); } else { KV.sound.play('deny'); fx.shake(); fx.sfx(v === null ? '時間切れ' : 'ブブー', 'gloom'); }
          i++; setTimeout(next, 900);
        }
      };
      ready({
        k: apps.length ? `${apps[0].co.name}${apps.length > 1 ? ` ほか${apps.length - 1}社` : ''} の選考` : '選考', t: 'Webテスト', key: 'web', count: true, go: 'テストを始める',
        sub: 'SPI・玉手箱によく出る問題 4問',
        rules: [
          ['時間', '1問12秒(長い問題は16秒)。時間切れは不正解'],
          ['問題', '計算(非言語)2問・言葉(言語)1問・どちらか1問'],
          ['結果', '正解が多いほど、次の選考に進みやすい。同じ月の会社は、まとめて1回'],
        ],
      }).then(next);
    });
  }
  let tId = 0;
  function runTimer(barId, ms, onEnd) {
    const bar = $(barId), t0 = performance.now();
    let last = -1;
    stopTimer();
    const step = () => {
      const left = Math.max(0, 1 - (performance.now() - t0) / ms);
      bar.style.width = left * 100 + '%';
      bar.classList.toggle('hurry', left < 0.3);
      const sec = Math.ceil((left * ms) / 1000);
      if (left < 0.3 && sec !== last) { last = sec; KV.sound.play('tick'); }
      if (left <= 0) { tId = 0; onEnd(); return; }
      tId = requestAnimationFrame(step);
    };
    tId = requestAnimationFrame(step);
  }
  function stopTimer() { if (tId) cancelAnimationFrame(tId); tId = 0; }

  // ===== 面接(制限時間なし。面接官の好みを読む) =====
  function setFace(type, expr) {
    const el = $('iv-face');
    el.innerHTML = KV.chara.face(type, expr);
    el.className = 'iv-face e-' + expr; void el.offsetWidth; el.classList.add('react');
  }
  function setMeter(v) { $('iv-meter').style.width = v + '%'; $('iv-meter').className = v >= 65 ? 'hi' : v <= 35 ? 'lo' : ''; }
  function say(t) { const q = $('iv-q'); q.textContent = t; q.classList.remove('pop'); void q.offsetWidth; q.classList.add('pop'); }
  function interview(a, stage) {
    return new Promise((done) => {
      const type = a.co.boss, boss = KV.BOSS[type], final = ST[stage].id === 'iv2';
      const qs = KV.shuffle([KV.BOSS_Q[type], ...KV.shuffle(KV.QUESTIONS).slice(0, 2)]);
      // ESに書いたガクチカを、2問目で必ず深掘りされる
      if (a.gk) qs[1] = deepQ(a);
      // 経歴を突っ込まれる(同じ会社では同じことを聞かれない)
      a.asked = a.asked || [];
      const pq = KV.PF_Q.filter((x) => x.when(S.pf, a.co) && !a.asked.includes(x.id));
      if (pq.length && (final || Math.random() < 0.75)) { const x = KV.pick(pq); a.asked.push(x.id); qs[2] = { q: x.q, a: x.a, pf: true }; }
      // 他社の選考状況(持ち駒しだいで、正直に言うと得をする)
      const gi = qs.findIndex((x) => KV.QUESTIONS.includes(x));
      if (gi >= 0 && Math.random() < 0.5) qs[gi] = othersQ(a);
      // 一次面接はWeb面接のことがある。回線が固まることも
      const web = ST[stage].id === 'iv1' && Math.random() < KV.WEB_P;
      if (web && Math.random() < 0.5) qs.splice(1 + Math.floor(Math.random() * 2), 0, { ...KV.LAG_Q, lag: true });
      // 性別で変わる質問が、急にはさまる
      if (Math.random() < KV.NG_P[type]) qs.splice(1 + Math.floor(Math.random() * 3), 0, { q: KV.pick(KV.NG_Q[S.pf.sex === 'f' ? 'f' : 'm']), a: KV.NG_A, ng: true });
      // 最後は逆質問
      qs.push({ q: KV.REV_Q, a: KV.shuffle([...KV.shuffle(KV.REV_GOOD).slice(0, 2), KV.pick(KV.REV_BAD)]), rev: true });
      // 最初の面接は「服装自由」の罠があることも
      if (!a.dressed && Math.random() < KV.DRESS_P[type]) {
        a.dressed = true;
        qs.unshift({ q: KV.DRESS_Q, narr: true, a: KV.DRESS_A.map((t) => [t, 'dress']), score: (k) => KV.DRESS[type][k], word: (k, d) => KV.DRESS_WORD[k][d > 0 ? 1 : 0] });
      }
      let over = false;
      // メンタルが20未満だと、緊張で最初から評価が低い
      let meter = (final ? 45 : 50) - (S.mental < 20 ? 12 : 0), i = 0;
      show('s-iv');
      $('s-iv').classList.toggle('final', final);
      $('s-iv').classList.toggle('web', web);
      $('iv-co').textContent = `${a.co.name} ${ST[stage].name}`;
      $('iv-boss').textContent = `${web ? 'Web面接 / ' : ''}${final ? '役員' : boss.name}(${boss.title})`;
      $('iv-ch').innerHTML = '';
      $('iv-sfx').textContent = '';
      $('iv-q').textContent = '';
      setLog('');
      setFace(type, 'normal'); setMeter(meter);
      const ask = () => {
        if (over) {
          say('……今日は、もう結構です。');
          $('iv-ch').innerHTML = '';
          return setTimeout(() => done(meter / 100), 1900);
        }
        if (i >= qs.length) {
          const good = meter >= 65, bad = meter <= 35;
          setFace(type, good ? 'happy' : bad ? 'angry' : 'normal');
          say(good ? '今日はありがとう！ 結果は追って連絡します！' : bad ? '……お疲れさまでした。' : '結果は、追ってご連絡します。');
          setLog(good ? '面接官の心を つかんだ！' : bad ? '面接官は 興味を なくした……' : '勝負の行方は、結果待ち', good ? 'good' : bad ? 'bad' : '');
          $('iv-ch').innerHTML = '';
          fx.sfx(good ? '手応えアリ！' : bad ? '手応えナシ…' : '手応え、微妙', good ? 'pass' : 'gloom');
          return setTimeout(() => done(meter / 100), 1900);
        }
        const q = qs[i];
        say(q.q);
        if (q.ng) {
          S.ng = (S.ng || 0) + 1; a.ng = true;
          const sx = $('iv-sfx'); sx.textContent = 'NG質問！？'; sx.className = 'iv-sfx ng'; void sx.offsetWidth; sx.classList.add('go');
          document.querySelector('.iv-stage').classList.add('ngq');
          setLog('※性別で変わる この質問は、男女雇用機会均等法に反する', 'bad');
          KV.sound.play('alarm'); fx.vibrate([40, 40, 40]);
        } else document.querySelector('.iv-stage').classList.remove('ngq');
        if (q.pf) setLog('経歴を 突っ込まれた！');
        if (q.narr) setLog('面接の前に……');
        if (q.rev) setLog('逆質問の チャンス！');
        if (q.lag) { const st = document.querySelector('.iv-stage'); st.classList.add('lag'); setTimeout(() => st.classList.remove('lag'), 1600); setLog('回線が 不安定です', 'bad'); KV.sound.play('deny'); }
        // 盛ったESを深掘りされるときは、面接官がじっと見てくる
        if (q.deep && a.mori) { setFace(type, 'angry'); const sx = $('iv-sfx'); sx.textContent = 'じーっ…'; sx.className = 'iv-sfx angry'; void sx.offsetWidth; sx.classList.add('go'); KV.sound.play('tick'); }
        let opts = KV.shuffle(q.a.map((x, k) => k));
        // メンタルが低いと、答えが思い浮かばない(40未満で1つ、20未満で2つ)。連打すれば思い出せる
        const nBlank = q.narr ? 0 : S.mental < 20 ? 2 : S.mental < 40 ? 1 : 0;
        const blanks = opts.filter((k) => q.a[k][1] !== 'bad').slice(0, nBlank);
        $('iv-ch').innerHTML = opts.map((k, n) => blanks.includes(k)
          ? `<button type="button" class="ans blank" data-k="${k}" style="--d:${n * 0.08}s"><span class="bl-t">${esc(q.a[k][0])}</span><small class="bl-h">頭が真っ白…… 連打して思い出す！</small><i class="bl-bar"></i></button>`
          : `<button type="button" class="ans" data-k="${k}" style="--d:${n * 0.08}s">${esc(q.a[k][0])}</button>`).join('');
        // 思い出す: 押すたびに文字がはっきりする。面接官が待てなくなる前に、規定の回数を押しきる
        const recall = (b) => {
          if (!b.dataset.st) {
            const need = S.mental < 20 ? 9 : 7, ms = 2200;
            Object.assign(b.dataset, { st: 'go', n: 0, need });
            b.classList.add('recall');
            b.querySelector('.bl-bar').style.animation = `gd-bar ${ms}ms linear forwards`;
            setLog('連打して 思い出せ！');
            b.recallT = setTimeout(() => {
              if (b.dataset.st !== 'go' || b.disabled) return;
              b.dataset.st = 'fail'; b.disabled = true;
              b.classList.remove('recall'); b.classList.add('fail');
              b.querySelector('.bl-h').textContent = '……(沈黙が流れた)';
              meter = clamp(meter - 5, 0, 100); setMeter(meter);
              setFace(type, 'angry'); KV.sound.play('deny'); fx.shake();
              setLog('沈黙…… 面接官は 待ちくたびれた', 'bad');
            }, ms);
          }
          const n = +b.dataset.n + 1, need = +b.dataset.need;
          b.dataset.n = n;
          b.style.setProperty('--clear', Math.min(1, n / need));
          KV.sound.play('tick');
          b.classList.remove('mash'); void b.offsetWidth; b.classList.add('mash');
          if (n >= need) {
            clearTimeout(b.recallT);
            b.dataset.st = 'lock';
            b.classList.remove('recall', 'blank'); b.classList.add('got');
            b.querySelector('.bl-h').textContent = '思い出した！';
            b.querySelector('.bl-bar').remove();
            KV.sound.play('ok'); fx.sfx('思い出した！', 'pass');
            setLog('思い出した！ この答えも 選べる', 'good');
            // 連打の勢いで、そのまま選んでしまわないように少し待つ
            setTimeout(() => { delete b.dataset.st; }, 500);
          }
        };
        $('iv-ch').onclick = (e) => {
          const b = e.target.closest('.ans'); if (!b || b.disabled || b.dataset.st === 'lock') return;
          if (b.classList.contains('blank')) return recall(b);
          $('iv-ch').querySelectorAll('.ans').forEach((x) => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
          b.classList.add('chosen');
          const trait = q.a[+b.dataset.k][1];
          if (q.ng) {
            const r = ngAnswer(trait, type);
            meter = clamp(meter + r.d, 0, 100); setMeter(meter);
            setFace(type, r.expr);
            const sx = $('iv-sfx'); sx.textContent = r.word; sx.className = 'iv-sfx ' + r.expr; void sx.offsetWidth; sx.classList.add('go');
            hitFx(r.d);
            if (r.m) setTimeout(() => setMental(r.m), 500);
            i++; setTimeout(ask, 1900); return;
          }
          if (q.deep && trait !== 'bad') {
            const r = deepAnswer(a, trait, boss, final);
            meter = r.bust ? Math.min(meter, 8) : clamp(meter + r.d, 0, 100);
            setMeter(meter);
            if (r.bust) {
              // 嘘バレ: その場で面接が終わる
              a.busted = stage; over = true;
              setFace(type, 'shock');
              say(KV.pick(['……さっきの話と、ESの内容が違いますね？', '具体的な数字を、もう一度お願いできますか？ ……あれ？', 'その大会、去年はなかったはずですが。']));
              fx.flash('dark'); fx.shake('quake'); fx.vibrate([80, 40, 120]); KV.sound.play('fired');
              fx.sfx('嘘バレ！！', 'gloom');
              hitFx(-99); setLog('嘘が バレた！ 面接は 強制終了', 'bad');
              setMental(-8);
              i++; setTimeout(ask, 2600); return;
            }
            const expr = r.d >= 15 ? 'happy' : r.d >= 0 ? 'normal' : 'angry';
            setFace(type, expr);
            const sx = $('iv-sfx'); sx.textContent = r.word; sx.className = 'iv-sfx ' + expr; void sx.offsetWidth; sx.classList.add('go');
            hitFx(r.d);
            i++; setTimeout(ask, 1700); return;
          }
          const k = +b.dataset.k;
          // q.score があれば面接官ごとの固定の点、3つめの数字はおまけの点
          const d = (q.score ? q.score(k) : (trait === 'bad' ? KV.BAD : boss.w[trait]) * (final ? 1.2 : 1)) + (q.a[k][2] || 0) + (Math.random() * 8 - 4);
          if (q.narr && d < 0) trap().dress++;
          if (q.rev && trait === 'bad') trap().rev++;
          meter = clamp(meter + d, 0, 100);
          const expr = d >= 15 ? 'happy' : d >= 0 ? 'normal' : d > -20 ? 'angry' : 'shock';
          setFace(type, expr); setMeter(meter);
          const w = q.word ? q.word(k, d) : (q.a[k][2] > 0 ? '他社にも評価されてるんだね' : KV.pick(KV.REACT[expr]));
          const sx = $('iv-sfx'); sx.textContent = w; sx.className = 'iv-sfx ' + expr; void sx.offsetWidth; sx.classList.add('go');
          if (expr === 'angry' || expr === 'shock') fx.shake(expr === 'shock' ? 'quake' : 'shake');
          hitFx(d);
          i++;
          // 悪くない答えのあとは、もっと話すか、切り上げるかを選ぶ
          if (trait !== 'bad' && !q.narr && !q.rev && d >= 0) {
            setTimeout(() => pushTalk(type, trait, final, meter, setMeter).then((m) => { meter = m; ask(); }), 1100);
            return;
          }
          setTimeout(ask, 1700);
        };
      };
      // 面接官が「あらわれる」演出のあとで、面接が始まる
      encounter(a, stage).then(() => ready({
        k: `${a.co.name} の${ST[stage].name}`, t: final ? '最終面接 ― ボス戦' : ST[stage].name, face: type, key: 'iv', go: '面接を始める',
        sub: `${final ? '役員' : boss.name}(${boss.title})「${boss.line}」`,
        rules: [
          ['答える', '質問に、答えを選ぶ。面接官によって好きな答えがちがう(セリフがヒント)'],
          ['話す', '答えたあと「もっと話す」か「切り上げる」。面接官のしぐさを見て決める'],
          ['評価', '評価メーターを、右の線までのばすと合格に近づく。時間制限はない'],
        ],
      })).then(() => {
        say(boss.line);
        setLog(final ? 'ボス戦。合格ラインは 65' : `${boss.name}は こちらを じっと見ている……`);
        setTimeout(ask, 1600);
      });
    });
  }
  // ===== もっと話すか、切り上げるか =====
  //   面接官のしぐさを見て、話し続けるか決める。話し続けるほど「盛り上がり」がたまるが、外すと全部失う
  function drawTell(s, trait, boss) {
    const fav = (boss.w[trait] || 0) >= 20, dislike = (boss.w[trait] || 0) < 0;
    const w = {
      lean: Math.max(0.2, 3 + (fav ? 2 : 0) - s * 0.6),
      nod: 4,
      arms: 1.5 + s * 1.2,
      clock: 0.5 + s * 1.3 + (dislike ? 1.5 : 0),
    };
    let r = Math.random() * Object.values(w).reduce((x, y) => x + y, 0);
    for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
    return 'nod';
  }
  function pushTalk(type, trait, final, meter, setM) {
    const boss = KV.BOSS[type];
    return new Promise((done) => {
      let s = 0, pool = 0, tell = drawTell(0, trait, boss);
      const showTell = () => {
        const t = KV.TELLS[tell];
        setFace(type, t.expr);
        const sx = $('iv-sfx'); sx.textContent = t.short; sx.className = 'iv-sfx tell ' + tell; void sx.offsetWidth; sx.classList.add('go');
        setLog(`面接官は ${t.label}`, tell === 'lean' ? 'good' : tell === 'clock' ? 'bad' : '');
        $('iv-ch').innerHTML = `<p class="push-pool${pool ? ' on' : ''}">盛り上がり <b>+${pool}</b><small>${s}/${KV.PUSH_MAX}</small></p>
          <button type="button" class="ans push-go" data-p="go">もっと話す<small>${esc(KV.pick(KV.PUSH_TALK))}</small></button>
          <button type="button" class="ans push-stop" data-p="stop">${pool ? `ここで切り上げる(+${pool}を確定)` : 'ここで切り上げる'}</button>`;
      };
      const bank = (word) => {
        $('iv-ch').onclick = null;
        if (pool) {
          meter = clamp(meter + pool, 0, 100); setM(meter);
          hitFx(pool); setFace(type, 'happy');
          setLog(word || `ちょうどいいところで 切り上げた！ +${pool}`, 'good');
        }
        setTimeout(() => done(meter), pool ? 1500 : 200);
      };
      $('iv-ch').onclick = (e) => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        $('iv-ch').querySelectorAll('.ans').forEach((x) => (x.disabled = true));
        if (b.dataset.p === 'stop') return bank();
        if (Math.random() < KV.TELLS[tell].ok) {
          pool += Math.round((5 + 4 * s) * (final ? 1.2 : 1)); s++;
          KV.sound.play(s >= 3 ? 'crit' : 'hit');
          const p = document.querySelector('.push-pool'); if (p) { p.classList.add('on'); p.querySelector('b').textContent = '+' + pool; }
          if (s >= KV.PUSH_MAX) { fx.flash(); return bank(`話しきった！ 面接官は 聞き入っている！ +${pool}`); }
          tell = drawTell(s, trait, boss);
          setTimeout(showTell, 450);
        } else {
          // 話しすぎ: ためた盛り上がりを失い、反撃される
          const lost = pool; pool = 0;
          say(KV.PUSH_FAIL[tell]);
          meter = clamp(meter - 8, 0, 100); setM(meter);
          setFace(type, 'angry'); fx.shake('quake');
          hitFx(-22);
          setLog(lost ? `話しすぎた！ 盛り上がり +${lost} が 消えた……` : '話しすぎた！', 'bad');
          $('iv-ch').onclick = null;
          setTimeout(() => done(meter), 1900);
        }
      };
      showTell();
    });
  }

  // ===== グループディスカッション =====
  //   だれかが話し終わった「間」に、今の流れ(前提 → アイデア → まとめ)に合う発言を選ぶ。
  //   話の途中で押すと「かぶり」。クラッシャーは話を戻し、だまっている人には話を振る。最後に面接官のメモが出る
  async function gd(a) {
    const type = a.co.boss;
    const theme = KV.pick(KV.GD_THEME);
    const npc = [KV.GD_NPC[1], ...KV.shuffle(KV.GD_NPC.filter((x) => !x.crash)).slice(0, 3)];
    const seats = KV.shuffle(npc);
    seats.splice(2, 0, { me: true, name: 'あなた' });
    const meI = seats.findIndex((p) => p.me);
    const quietI = seats.findIndex((p) => p.quiet);
    show('s-gd');
    $('gd-co').textContent = a.co.name;
    $('gd-theme').textContent = theme.t;
    $('gd-boss').innerHTML = KV.chara.face(type, 'normal');
    $('gd-board').innerHTML = '';
    $('gd-review').hidden = true;
    $('gd-table').innerHTML = seats.map((p, i) => `<div class="gd-seat${p.me ? ' me' : ''}" data-i="${i}">
      <span class="gd-face">${KV.chara.face(p.me ? meType() : p.sex === 'f' ? 'me-f' : 'me-m', 'normal')}</span>
      <b class="gd-name">${esc(p.name)}</b></div>`).join('');
    $('gd-act').innerHTML = KV.GD_PHASE.map((p) => `<button type="button" class="btn gd-move" data-m="${p.id}">${p.move}</button>`).join('');
    $('gd-fix').hidden = true;
    $('s-gd').dataset.state = 'wait';
    setPhase(-1);
    await ready({
      k: `${a.co.name} の一次選考`, t: 'グループディスカッション', face: type, key: 'gd', count: true,
      sub: `お題「${theme.t}」`,
      rules: [
        ['間', 'だれかが話し終わった「間」(緑に光る)に発言する。話の途中で押すと、かぶって減点'],
        ['流れ', '議論は 前提 → アイデア → まとめ と進む。今の流れに合うボタンを押す'],
        ['協調', 'クラッシャーが暴れたら「話を戻す」。だまっている人に話を振るのも評価される'],
      ],
      before: () => pickRole(),
    });
    return new Promise((done) => {
      let score = 50, round = 0, state = 'wait', saidThis = false, t = 0, crashes = 0;
      const st = { said: 0, fit: 0, cut: 0, team: 0, ideas: 0, base: 0, sum: 0, passed: false };
      const role = S.gdRole;
      const phaseOf = (r) => KV.GD_PHASE[Math.min(2, Math.floor((r - 1) / 3))];
      const air = () => { $('gd-air').style.width = clamp(score, 0, 100) + '%'; $('gd-air').className = score >= 65 ? 'hi' : score <= 35 ? 'lo' : ''; };
      const log = (txt, cls = '') => { const l = $('gd-log'); l.textContent = txt; l.className = 'iv-log ' + cls; void l.offsetWidth; l.classList.add('pop'); };
      const pts = (d) => {
        const v = Math.round(d * (d > 0 ? role.mult : 1));
        score = clamp(score + v, 0, 100); air();
        const n = document.createElement('b'); n.className = 'iv-dmg ' + (v >= 0 ? 'up' : 'down'); n.textContent = (v >= 0 ? '+' : '−') + Math.abs(v);
        $('gd-room').appendChild(n); setTimeout(() => n.remove(), 1400);
      };
      // 話している人と、その言葉。bar は話し終わるまでの残り(ms)
      const speak = (i, txt, cls = '', bar = 0) => {
        const p = seats[i];
        document.querySelectorAll('.gd-seat').forEach((x) => x.classList.toggle('talk', +x.dataset.i === i));
        $('gd-who').textContent = p.name;
        $('gd-say-t').textContent = txt;
        const sp = $('gd-speech');
        sp.className = 'gd-speech on ' + cls; void sp.offsetWidth; sp.classList.add('pop');
        const b = $('gd-talkbar'); b.style.animation = 'none'; void b.offsetWidth;
        b.style.animation = bar ? `gd-bar ${bar}ms linear forwards` : 'none';
      };
      const write = (txt, me) => {
        const li = document.createElement('li');
        li.className = me ? 'me' : ''; li.textContent = txt;
        $('gd-board').appendChild(li);
        while ($('gd-board').children.length > 6) $('gd-board').firstElementChild.remove();
      };
      const setState = (s, ms = 0) => {
        state = s; $('s-gd').dataset.state = s;
        if (s === 'gap') {
          const sp = $('gd-speech'); sp.className = 'gd-speech on gap';
          $('gd-who').textContent = '';
          $('gd-say-t').textContent = '(間)';
          const b = $('gd-talkbar'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = `gd-bar ${ms}ms linear forwards`;
          document.querySelectorAll('.gd-seat').forEach((x) => x.classList.remove('talk'));
        }
      };
      const special = (label, k) => { const f = $('gd-fix'); f.hidden = false; f.textContent = label; f.dataset.k = k; };
      const turn = () => {
        if (round >= KV.GD_ROUNDS) return finish();
        round++; saidThis = false;
        const ph = phaseOf(round);
        setPhase(KV.GD_PHASE.indexOf(ph));
        $('gd-time').style.width = (100 - (round / KV.GD_ROUNDS) * 100) + '%';
        if (role.passive) pts(role.passive);
        $('gd-fix').hidden = true;
        const crashNow = crashes < 2 && round >= 3 && Math.random() < 0.3;
        const si = crashNow ? seats.findIndex((p) => p.crash) : KV.pick(seats.map((p, i) => i).filter((i) => !seats[i].me && !seats[i].crash && i !== quietI));
        const sp = seats[si];
        const talk = 1300 + Math.random() * 900;
        // アイデアの時間は、ほかの人も案を出してボードに書く
        let line = KV.pick(sp.lines);
        if (!crashNow && ph.id === 'idea' && Math.random() < 0.6) { const idea = theme.npc[(round - 4) % 2]; line = `${idea}、とかどうですか？`; setTimeout(() => write(idea), talk * 0.6); }
        speak(si, line, crashNow ? 'crash' : '', talk);
        setState('talk');
        if (crashNow) {
          crashes++;
          special('話を戻す！', 'crash');
          log('クラッシャーが 議論を こわしはじめた！', 'bad'); KV.sound.play('alarm');
          t = setTimeout(() => {
            if (!$('gd-fix').hidden && $('gd-fix').dataset.k === 'crash') { $('gd-fix').hidden = true; pts(-6); log('議論が 脱線した……', 'bad'); }
            gap();
          }, 1700);
          return;
        }
        // だまっている人に、話を振るチャンス(アイデアの時間に1回)
        if (quietI >= 0 && !st.passed && ph.id === 'idea') special(`${seats[quietI].name}さんに 話を振る`, 'quiet');
        // タイムキーパーは、まとめの前に「残り時間」を伝えるチャンス
        if (role.id === 'timer' && round === KV.GD_ROUNDS - 2) special('「残り5分です！」', 'time');
        t = setTimeout(gap, talk);
      };
      const gap = () => {
        const ms = Math.max(560, 1150 - round * 60);
        setState('gap', ms);
        KV.sound.play('tick');
        t = setTimeout(() => { if (state === 'gap') turn(); }, ms);
      };
      const finish = () => {
        clearTimeout(t); setState('end'); $('gd-fix').hidden = true; setPhase(3);
        document.querySelectorAll('.gd-seat').forEach((x) => x.classList.remove('talk'));
        if (!st.said) { pts(-20); setMental(-6); }
        else if (st.said >= KV.GD_ROUNDS - 1) pts(-6);
        // 面接官のメモ: 4つの観点
        const mark = (v) => ['×', '△', '○', '◎'][v];
        const rows = [
          ['発言のタイミング', st.cut === 0 ? 3 : st.cut === 1 ? 2 : st.cut === 2 ? 1 : 0, st.cut ? `かぶり ${st.cut}回` : 'かぶりなし'],
          ['流れを読む', !st.said ? 0 : st.fit / st.said >= 0.8 ? 3 : st.fit / st.said >= 0.5 ? 2 : 1, `${st.fit} / ${st.said}回 流れに合った`],
          ['協調性', st.team >= 2 ? 3 : st.team === 1 ? 2 : 1, st.team ? `話を戻す・振る ${st.team}回` : '人を助けなかった'],
          ['存在感', !st.said ? 0 : st.said >= KV.GD_ROUNDS - 1 ? 1 : st.said >= 3 ? 3 : st.said === 2 ? 2 : 1, !st.said ? '一言も話さなかった' : st.said >= KV.GD_ROUNDS - 1 ? 'しゃべりすぎ' : `発言 ${st.said}回`],
        ];
        const good = score >= 65, bad = score <= 35;
        $('gd-review').innerHTML = `<div class="gd-rv"><p class="gd-rv-h">面接官のメモ</p>
          <ul>${rows.map(([n, v, s], i) => `<li style="--d:${0.15 + i * 0.25}s"><span>${n}<small>${s}</small></span><b class="m${v}">${mark(v)}</b></li>`).join('')}</ul>
          <p class="gd-rv-v ${good ? 'good' : bad ? 'bad' : ''}">${good ? '議論を 引っぱった！' : bad ? '存在感が なかった……' : '可もなく、不可もなく'}</p></div>`;
        $('gd-review').hidden = false;
        KV.sound.play('drum');
        $('gd-boss').innerHTML = KV.chara.face(type, good ? 'happy' : bad ? 'angry' : 'normal');
        setTimeout(() => fx.sfx(good ? '手応えアリ！' : bad ? '手応えナシ…' : '手応え、微妙', good ? 'pass' : 'gloom'), 1300);
        setTimeout(() => done(score / 100), 3600);
      };
      $('gd-act').onclick = (e) => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        if (state === 'wait' || state === 'end' || state === 'mine') return;
        if (state === 'talk') {
          // 人が話している途中で、かぶせた
          st.cut++;
          speak(meI, 'あの、それって……(かぶった)', 'me bad');
          pts(-8); KV.sound.play('counter'); fx.shake(); log('発言が かぶった！', 'bad');
          return;
        }
        if (saidThis) return;
        saidThis = true; st.said++;
        const m = b.dataset.m, ph = phaseOf(round), fit = m === ph.id;
        let line, memo;
        if (m === 'base') { line = theme.base[0]; memo = st.base++ ? '' : theme.base[1]; }
        else if (m === 'idea') { const x = theme.ideas[st.ideas % theme.ideas.length]; st.ideas++; [line, memo] = x; }
        else { line = theme.sum[0]; memo = st.sum++ ? '' : theme.sum[1]; }
        speak(meI, line, 'me');
        if (memo) setTimeout(() => write(memo, true), 400);
        if (fit) {
          st.fit++;
          pts(10 + Math.min(st.fit, 3) + (m === 'sum' && role.id === 'chair' ? 6 : 0));
          KV.sound.play(st.fit >= 3 ? 'crit' : 'hit');
          log(m === 'sum' && role.id === 'chair' ? '司会として まとめた！' : 'いい タイミングで、流れに合った発言！', 'good');
        } else {
          pts(2); KV.sound.play('tick');
          log(`面接官「${KV.pick(KV.GD_OFF[m])}」`, 'bad');
        }
        clearTimeout(t); setState('mine');
        document.querySelectorAll('.gd-seat').forEach((x) => x.classList.toggle('talk', +x.dataset.i === meI));
        t = setTimeout(turn, 1300);
      };
      $('gd-fix').onclick = () => {
        const f = $('gd-fix'); if (f.hidden) return;
        f.hidden = true; st.team++;
        if (f.dataset.k === 'crash') {
          pts(14); speak(meI, 'いったん、テーマに戻しませんか？', 'me'); log('議論を 立て直した！', 'good'); KV.sound.play('crit'); fx.flash();
        } else if (f.dataset.k === 'quiet') {
          st.passed = true;
          const q = seats[quietI];
          pts(10); speak(meI, `${q.name}さんは、どう思いますか？`, 'me'); log('だまっていた人に 話を振った！', 'good'); KV.sound.play('hit');
          clearTimeout(t); setState('mine');
          const idea = theme.npc[theme.npc.length - 1];
          t = setTimeout(() => { speak(quietI, `……あの、${idea}、とか……`, '', 1200); write(idea); t = setTimeout(turn, 1500); }, 1300);
        } else {
          pts(10); speak(meI, '残り5分です！ 結論に向かいましょう', 'me'); log('時間管理で 評価アップ！', 'good'); KV.sound.play('hit');
        }
      };
      air();
      if (role.id === 'chair') { pts(5); speak(meI, 'では、私が司会をします', 'me'); }
      log('「間」に、流れに合うボタンを押す！');
      KV.sound.play('vs');
      t = setTimeout(turn, 1200);
    });
  }
  // 議論の流れ(前提 → アイデア → まとめ)。i = 3 で終わり
  function setPhase(i) {
    $('gd-phase').innerHTML = KV.GD_PHASE.map((p, k) => `<li class="${k === i ? 'now' : k < i ? 'done' : ''}">${p.name}</li>`).join('');
    document.querySelectorAll('.gd-move').forEach((b) => b.classList.toggle('fit', i >= 0 && i < 3 && b.dataset.m === KV.GD_PHASE[i].id));
  }
  // 役割を決める(準備カードの「始める」のあと)
  function pickRole() {
    return new Promise((res) => {
      $('gd-role').hidden = false;
      $('gd-role').innerHTML = `<p class="gd-role-h">役割を決めよう</p>` + KV.GD_ROLE.map((r, i) => `<button type="button" class="ans" data-r="${i}">${r.name}<small>${r.note}</small></button>`).join('');
      $('gd-role').onclick = (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        S.gdRole = KV.GD_ROLE[+b.dataset.r];
        $('gd-role').hidden = true; $('gd-role').onclick = null;
        KV.sound.play('ok');
        res();
      };
    });
  }

  // ===== 準備カード: 選考の前に、何をするか・遊び方を見せる。時間制限があるものは 3・2・1 =====
  //   遊び方は、その種類の初回だけ開いて見せる(2回目からは閉じておく)
  function ready(o) {
    return new Promise((res) => {
      S.seen = S.seen || {};
      const first = !S.seen[o.key];
      S.seen[o.key] = true;
      $('rd-k').textContent = o.k;
      $('rd-t').textContent = o.t;
      $('rd-sub').textContent = o.sub || '';
      $('rd-face').innerHTML = o.face ? KV.chara.face(o.face, 'normal') : '';
      $('rd-face').hidden = !o.face;
      $('rd-rules').innerHTML = `<details${first ? ' open' : ''}><summary>遊び方</summary><ul>${o.rules.map(([h, t]) => `<li><b>${h}</b><span>${t}</span></li>`).join('')}</ul></details>`;
      $('rd-go').textContent = o.go || '始める';
      const el = $('ready');
      el.className = 'ready'; el.hidden = false; void el.offsetWidth; el.classList.add('go');
      KV.sound.play('card');
      $('rd-go').onclick = async () => {
        $('rd-go').onclick = null;
        KV.sound.play('up');
        el.hidden = true;
        if (o.before) await o.before();
        if (o.count) await countdown();
        res();
      };
    });
  }
  async function countdown() {
    const c = $('rd-count');
    for (const n of ['3', '2', '1', 'スタート！']) {
      c.textContent = n; c.hidden = false;
      c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
      KV.sound.play(n.length > 1 ? 'up' : 'tick');
      await wait(n.length > 1 ? 650 : 600);
    }
    c.hidden = true;
  }

  // ===== 面接官があらわれた(敵の襲来) =====
  function encounter(a, stage) {
    const type = a.co.boss, boss = KV.BOSS[type], final = ST[stage].id === 'iv2';
    return encounterFx(type, final ? `${a.co.name} 最終面接 ― ボス戦` : `${a.co.name} 一次面接`, final ? `役員(${boss.title})が あらわれた！` : `${boss.name}(${boss.title})が あらわれた！`, final);
  }
  function encounterFx(type, kind, text, final) {
    const el = $('enc');
    $('enc-me').innerHTML = KV.chara.face(meType(), S.mental < 25 ? 'cry' : S.mental < 60 ? 'shock' : 'normal');
    $('enc-boss').innerHTML = KV.chara.face(type, 'angry');
    $('enc-kind').textContent = kind;
    $('enc-t').textContent = text;
    el.className = 'enc' + (final ? ' final' : '');
    el.hidden = false; void el.offsetWidth; el.classList.add('go');
    KV.sound.play('siren');
    setTimeout(() => { KV.sound.play('vs'); fx.vibrate(60); }, 900);
    return new Promise((res) => {
      let t = 0;
      const end = () => { clearTimeout(t); el.onclick = null; el.hidden = true; res(); };
      t = setTimeout(end, final ? 3200 : 2700);
      el.onclick = end; // クリックで飛ばせる
    });
  }
  function setLog(t, cls = '') { const l = $('iv-log'); l.textContent = t; l.className = 'iv-log ' + cls; void l.offsetWidth; if (t) l.classList.add('pop'); }
  // 答えの手応え: ダメージの数字が飛び、面接官がのけぞる。悪い答えは反撃されてメンタルが減る
  function hitFx(d) {
    const st = document.querySelector('.iv-stage');
    const n = document.createElement('b');
    n.className = 'iv-dmg ' + (d >= 0 ? 'up' : 'down');
    n.textContent = d <= -99 ? 'MISS' : (d >= 0 ? '+' : '−') + Math.abs(Math.round(d));
    st.appendChild(n); setTimeout(() => n.remove(), 1400);
    st.classList.remove('hit', 'crit', 'counter'); void st.offsetWidth;
    st.classList.add(d >= 25 ? 'crit' : d >= 0 ? 'hit' : 'counter');
    if (d <= -99) return;
    if (d >= 25) { KV.sound.play('crit'); setLog('クリティカル！ 面接官の心に 刺さった！', 'good'); fx.flash(); }
    else if (d >= 15) { KV.sound.play('hit'); setLog('こうかは ばつぐんだ！', 'good'); }
    else if (d >= 0) { KV.sound.play('tick'); setLog('まあまあの 手応え'); }
    else if (d > -20) { KV.sound.play('deny'); setLog('こうかは いまひとつ……', 'bad'); }
    else { KV.sound.play('counter'); setLog('面接官の 反撃！ メンタルに ダメージ！', 'bad'); fx.flash('dark'); setMental(-4); }
  }

  // 他社の選考状況: 内定を持っていれば正直に言うだけで評価が上がる。持ち駒があるのに「御社だけ」はウソ
  function othersQ(a) {
    const rest = S.apps.filter((x) => x !== a && (x.state === 'active' || x.state === 'naitei'));
    const nai = rest.filter((x) => x.state === 'naitei').length;
    const truth = nai ? [`正直に、他社から内定を${nai}社いただいています`, 'honest', KV.OTHERS_BONUS]
      : rest.length ? [`正直に、他に${rest.length}社受けています`, 'honest'] : ['正直に、今は御社だけです', 'honest', 4];
    const only = ['御社が第一志望なので、他は受けていません！', 'genki', rest.length ? -10 : 0];
    return { q: KV.OTHERS_Q, a: [truth, only, ['それは、言わないといけませんか？', 'bad']] };
  }
  // NG質問への答え: のみこむとメンタルが削れる。聞き返すと面接官で評価が割れる
  function ngAnswer(trait, type) {
    if (trait === 'swallow') return { d: 6, m: -8, expr: 'happy', word: '(……のみこんだ)' };
    if (trait === 'object') { const d = KV.NG_OBJECT[type]; return { d, m: 2, expr: d > 0 ? 'shock' : 'angry', word: d > 0 ? '……失礼しました' : 'は？ 生意気だね' }; }
    return { d: KV.BAD / 2, m: -4, expr: 'normal', word: 'あれ、どうしたの？' };
  }
  // ===== ガクチカの深掘り =====
  function deepQ(a) {
    const q = `ESに「${a.gk}」とありますね。もう少し詳しく聞かせてください。`;
    return a.mori
      ? { q, deep: true, a: [['実は……少し盛って書きました', 'confess'], ['さらに盛って、押し切る', 'bluff'], ['細かい数字は、ぼかして話す', 'dodge']] }
      : { q, deep: true, a: [['具体的なエピソードを、自分の言葉で話す', 'true'], ['ここぞとばかりに、話を盛る', 'bluff'], ['えっと……(言葉に詰まる)', 'bad']] };
  }
  //   バレる確率: 盛った量で決まり、最終面接とメンタルが低いときは上がる(ゲーム内の基準)
  function deepAnswer(a, trait, boss, final) {
    // 何もしてこなかった人が盛ると、もっとバレやすい
    const base = (a.mori ? KV.MORI[a.mori].bust : 0.25) + (S.pf.gaku <= 0.15 ? 0.1 : 0);
    const pb = clamp(base * (final ? 1.4 : 1) + (S.mental < 40 ? 0.1 : 0), 0, 0.9);
    // ガクチカが濃いほど、正直に話したときの手応えが大きい(留学22・幹部17・バイト15・なし9)
    if (trait === 'true') return { d: Math.round(6 + 18 * S.pf.gaku), word: S.pf.gaku >= 0.6 ? 'なるほど！' : 'ふむふむ' };
    if (trait === 'confess') {
      // 正直に話すと、話は小さくなるが、次からは本当のことを聞かれる
      a.mori = 0; a.gk = gakuTexts()[0];
      return { d: boss.w.honest * 0.6 - 14, word: boss.w.honest > 10 ? '正直でいいね' : 'ふーん……' };
    }
    if (trait === 'dodge') return Math.random() < pb * 0.5 ? { bust: true } : { d: 4, word: 'ふむ' };
    if (Math.random() < pb) return { bust: true };
    if (!a.mori) { a.mori = 1; a.gk = gakuTexts()[1]; }
    return { d: 20, word: 'すごいね！' };
  }

  // ===== 結果 =====
  
  function result() {
    const offers = S.apps.filter((a) => a.state === 'naitei');
    const prays = S.apps.filter((a) => a.state === 'out' && !a.silent).length;
    const silents = S.apps.filter((a) => a.silent).length;
    // 途中で就活を終えても、同期は10月まで就活を続ける
    for (let m = S.month + 1; m <= 10; m++) S.rivals.filter((r) => !r.co && r.u < Math.min(0.97, (grpRate(m, r.sex) / 100) * r.k)).forEach((r) => { r.co = KV.pick(KV.COMPANIES.filter((c) => (r.k >= 1.1 ? c.size !== 's' : c.size !== 'xl'))); r.month = m; });
    const best = S.accepted || offers.slice().sort((x, y) => y.co.salary - x.co.salary)[0];
    // ゼミ7人の順位: 会社の規模が大きいほど上、同じなら早く決まったほど上。同点なら自分が下
    const TIER = { xl: 4, l: 3, m: 2, s: 1 };
    const pt = (co, m) => (co ? TIER[co.size] * 100 - m : -1);
    const board = [...S.rivals.map((r) => ({ name: r.name, co: r.co, p: pt(r.co, r.month) })), { name: 'あなた', me: true, co: best && best.co, p: pt(best && best.co, best && (best.month || Math.min(S.month, 10))) - 0.5 }]
      .sort((x, y) => y.p - x.p);
    const rank = board.findIndex((x) => x.me) + 1;
    const title = !offers.length ? '就職浪人' : offers.some((a) => a.co.size === 'xl') ? '倍率の暴力を突破' : offers.length >= 2 ? '内定ホルダー' : '滑り込み内定';
    const fact = !offers.length
      ? `大学生の就職率は${KV.SHUSHOKU}%。あなたは、残りの${(100 - KV.SHUSHOKU).toFixed(1)}%に入った。`
      : best.co.size === 'xl'
        ? `5000人以上の会社の求人倍率は${R.size.xl}倍。学生${(1 / R.size.xl).toFixed(1)}人に求人1件の中を勝ち抜いた。`
        : `${KV.SIZE[best.co.size]}の会社の求人倍率は${R.size[best.co.size]}倍。`;
    const rows = S.apps.map((a) => {
      const how = a.state === 'naitei' ? `<b class="r-naitei">${a === S.accepted ? '内定(承諾)' : '内定'}</b>` : a.state === 'lost' ? '<b class="r-pray">内定を保留しすぎて取り消し</b>' : a.busted != null && a.failAt === a.busted ? `<b class="r-pray">${ST[a.failAt].name}で盛ったのがバレた</b>` : a.silent ? `<b class="r-pray">${a.filter ? '書類で音信不通(学歴フィルター？)' : '書類で音信不通'}</b>` : a.state === 'out' ? `<b class="r-pray">${ST[a.failAt].name}でお祈り</b>` : '<b class="r-wait">選考中に終了</b>';
      return `<li><span>${esc(a.co.name)}</span>${how}</li>`;
    }).join('');
    const month = Math.min(S.month, 10);
    $('res-card').className = 'res-card panel ' + (offers.length ? 'win' : 'lose');
    $('res-card').innerHTML = `<span class="res-face">${KV.chara.face(meType(), offers.length ? 'happy' : 'cry')}</span>
      <p class="res-k">${month}月の結果</p>
      <p class="res-title">${title}</p>
      <div class="res-nums"><span><b id="rn-o">0</b>内定</span><span><b id="rn-p">0</b>お祈り</span><span><b id="rn-s">0</b>音信不通</span><span><b>${Math.round(S.mental)}</b>メンタル</span></div>
      ${best ? `<p class="res-best">${esc(best.co.name)}<small>初任給 ${KV.yen(best.co.salary)}</small></p>` : ''}
      <ul class="res-list">${rows || '<li><span>エントリー0社</span></li>'}</ul>
      <div class="res-rank"><p>ゼミ7人中 <b class="rk">${rank}位</b></p>
        <ol>${board.map((x, i) => `<li class="${x.me ? 'me' : ''}" style="--d:${0.6 + (board.length - 1 - i) * 0.28}s"><span>${esc(x.name)}</span><b>${x.co ? esc(x.co.name) : '内定なし'}</b></li>`).join('')}</ol></div>
      <p class="res-fact">${fact}<br>全国では、${KV.NAITEI_RATE[10][1]}の時点で${KV.NAITEI_RATE[10][0]}%の学生が内々定を持っていた(${KV.GROUP_NAME[grpKey()]}は${grpRate(10, S.pf.sex)}%)。</p>
      ${trapList() ? `<p class="res-trap">就活の罠<small>${trapList()}</small></p>` : ''}
      ${S.ng ? `<p class="res-ng">面接で、性別で変わる質問を<b>${S.ng}回</b>された。<small>男性または女性にだけ、結婚・出産後も働くか、残業や転勤ができるかを聞くことは、男女雇用機会均等法に反します。</small></p>` : ''}`;
    show('s-result');
    fx.countUp($('rn-o'), offers.length, (v) => Math.round(v));
    fx.countUp($('rn-p'), prays, (v) => Math.round(v));
    fx.countUp($('rn-s'), silents, (v) => Math.round(v));
    // 順位は下から1人ずつ出して、最後に自分の順位にハンコ
    KV.sound.play('drum');
    setTimeout(() => { KV.sound.play('stampin'); fx.shake(rank <= 3 ? 'shake' : 'quake'); }, 2700);
    if (offers.length) { fx.flash(); KV.sound.play('win'); fx.confetti(90); fx.sfx(title, 'naitei'); } else { fx.flash('dark'); KV.sound.play('fired'); fx.sfx(title, 'gloom'); }
    const busts = S.apps.filter((a) => a.busted != null).length;
    const text = `【就活の結果】${title}。ゼミ7人中${rank}位。内定${offers.length}社・お祈り${prays}通・音信不通${silents}社${busts ? `・嘘バレ${busts}回` : ''}${S.ng ? `・NG質問${S.ng}回` : ''}${best ? `。内定先は${best.co.name}(架空)` : ''}`;
    const q = new URLSearchParams({ text, hashtags: '内定ください' });
    if (location.protocol.startsWith('http')) q.set('url', location.href.split('#')[0]);
    $('share-x').href = 'https://x.com/intent/post?' + q.toString();
    // シェア用の画像(演出が終わるころに作っておく)
    $('share-img').disabled = true; $('res-img').hidden = true;
    const extras = [busts && `ガクチカを盛ってバレた: ${busts}回`, S.ng && `性別で変わるNG質問をされた: ${S.ng}回`, ...trapList().split('<br>').filter(Boolean).map((t) => t.replace(/(.*)/, ''))].filter(Boolean);
    const card = {
      title, win: offers.length > 0, rank, of: board.length,
      nums: [[offers.length, '内定'], [prays, 'お祈り'], [silents, '音信不通'], [Math.round(S.mental), 'メンタル']],
      best: best && `${best.co.name}(架空)`,
      extras, face: meType(), expr: offers.length ? 'happy' : 'cry',
      profile: `${S.pf.sexLabel} / ${S.pf.kindLabel} / ${S.pf.facLabel} / 偏差値${S.pf.univLabel} / ガクチカ: ${S.pf.gakuLabel} / TOEIC ${S.pf.toeicLabel}`,
      url: location.protocol.startsWith('http') ? location.host + location.pathname.replace(/index.html$/, '') : '',
    };
    const myRun = (S.run = (S.run || 0) + 1);
    setTimeout(() => KV.card.make(card).then((blob) => {
      if (!blob || S.run !== myRun) return;
      S.cardBlob = blob;
      const img = $('res-img-i');
      if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
      $('res-img').hidden = false; $('share-img').disabled = false;
    }), 3200);
    S.shareText = text;
  }
  // スマホは共有メニュー(インスタやXに直接)、PCは画像を保存
  $('share-img').addEventListener('click', async () => {
    if (!S.cardBlob) return;
    const file = new File([S.cardBlob], 'naitei-kudasai.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: S.shareText + ' #内定ください' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = $('res-img-i').src; a.download = 'naitei-kudasai.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
  function trapList() {
    const t = S.trap || {}, l = [];
    if (t.gosha) l.push(`ESに「御社」と書いた: ${t.gosha}回(書き言葉は「貴社」)`);
    if (t.dress) l.push(`服装で減点された: ${t.dress}回`);
    if (t.full) l.push(`説明会が「満席」だった: ${t.full}回`);
    if (t.rev) l.push(`逆質問で失敗した: ${t.rev}回`);
    return l.join('<br>');
  }
  $('again').addEventListener('click', () => { S.pf = {}; show('s-title'); });

  // ===== 撮影モード(URLの最後に #demo) =====
  //   見せ場を1つずつ自動で再生する。TikTokやショート動画を画面録画で撮るため。指のマークでタップを見せる
  const DEMO = [
    ['intro', '自己紹介面接', '圧迫面接の人事に、スペックを値踏みされる'],
    ['boss', '最終面接(ボス戦)', 'NG質問・盛ったガクチカの深掘り・話しすぎの反撃'],
    ['news', '同期の内定速報', 'あなたが落ちた会社に、同期が内定'],
    ['gd', 'グループディスカッション', 'クラッシャーと、発言のかぶり'],
    ['offer', '内定承諾のハンコ', '承諾書に名前を書いて、ハンコ'],
    ['lose', '結果: 就職浪人', 'ゼミ7人中7位と、シェア画像'],
  ];
  let demoT = 0;
  function demoMenu() {
    clearInterval(demoT);
    $('demo-back').hidden = true;
    const sex = S.demoSex || 'f';
    $('demo-list').innerHTML = DEMO.map(([id, name, note]) => `<button type="button" class="ans" data-d="${id}">${name}<small>${note}</small></button>`).join('');
    $('demo-sex').querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === sex)));
    $('demo').hidden = false;
  }
  function demoDone() { clearInterval(demoT); S.busy = false; $('demo-back').hidden = false; }
  // シーズンの途中(6月)の状態を作る。スペックは、面接官にいじられやすいもの
  function demoSetup() {
    const co = (id) => KV.COMPANIES.find((c) => c.id === id);
    const f = (S.demoSex || 'f') === 'f';
    S.pf = { sex: f ? 'f' : 'm', sexLabel: f ? '女性' : '男性', kind: 'pri', kindLabel: '私立', fac: 'lit', facLabel: '文・外国語', univ: 0.42, univLabel: '50〜54', gaku: 0.5, gakuLabel: 'アルバイト', toeic: 0.3, toeicLabel: '受けていない' };
    Object.assign(S, { month: 6, mental: 45, line: [], lost: [], accepted: null, warned: 0, lastES: null, sick: 0, ng: 0, full: {}, trap: { gosha: 1, dress: 0, full: 2, rev: 0 }, busy: false, mails: [], silent: [] });
    S.rivals = KV.RIVALS.map((r) => ({ ...r, u: Math.random(), co: null, month: 0 }));
    S.apps = ['shinonome', 'harenohi', 'minato', 'maruhiro'].map((id) => ({ co: co(id), state: 'active', passed: 2, pending: null, todo: null, busted: null }));
  }
  function tapFx(el) {
    const r = el.getBoundingClientRect();
    const t = document.createElement('i');
    t.className = 'tapfx';
    t.style.left = r.left + r.width / 2 + 'px'; t.style.top = r.top + r.height / 2 + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 800);
    setTimeout(() => el.click(), 260);
  }
  // 画面を見て、次に押すボタンを決める。選択肢が出てから少し待つ(見ている人が読めるように)
  function demoDrive() {
    clearInterval(demoT);
    let next = 0, seen = '';
    demoT = setInterval(() => {
      const now = performance.now();
      if (now < next) return;
      const q = (s) => document.querySelector(s);
      let el = null, gap = 900;
      if (!$('offer').hidden) { el = q('#od-act [data-o=ok]'); gap = 9999; }
      else if (!$('ready').hidden) { if (!seen) { seen = 'ready'; next = now + 1600; return; } el = $('rd-go'); seen = ''; }
      else if (!$('s-gd').hidden) {
        const st = $('s-gd').dataset.state;
        if (!$('gd-role').hidden) el = q('#gd-role [data-r]');
        else if (!$('gd-fix').hidden && Math.random() < 0.5) el = $('gd-fix');
        else if (st === 'gap') el = Math.random() < 0.8 ? q('.gd-move.fit') : KV.pick([...document.querySelectorAll('.gd-move')]);
        else if (st === 'talk' && Math.random() < 0.02) el = q('.gd-move'); // たまに、かぶる
        gap = 500;
      } else if (!$('s-iv').hidden && $('enc').hidden) {
        const as = [...document.querySelectorAll('#iv-ch .ans:not([disabled])')];
        const key = $('iv-ch').textContent;
        if (as.length && key !== seen) { seen = key; next = now + 1300; return; }
        if (as.length) {
          const go = as.find((b) => b.dataset.p === 'go');
          el = S.demoPick && S.demoPick.length ? as[S.demoPick.shift()] : go && Math.random() < 0.75 ? go : KV.pick(as);
          seen = '';
        }
      }
      if (el) { next = now + gap; tapFx(el); }
    }, 120);
  }
  const DEMO_RUN = {
    async intro() {
      S.demoPick = [1, 2, 3, 2, 2]; // 私立・文学部・偏差値50〜54・アルバイト・TOEICなし
      show('s-title'); await wait(1200);
      tapFx(document.querySelector(`[data-sex="${S.demoSex || 'f'}"]`));
    },
    async boss() {
      demoSetup();
      const a = S.apps[0], ng = KV.NG_P[a.co.boss];
      a.gk = KV.GAKU_TEXT['アルバイト'][2]; a.mori = 2;
      KV.NG_P[a.co.boss] = 1;
      show('s-month'); setStep('board'); renderTop();
      await interview(a, 3);
      KV.NG_P[a.co.boss] = ng;
      demoDone();
    },
    async news() {
      demoSetup();
      const a = S.apps[1]; a.state = 'out'; a.failAt = 2;
      const [r1, r2] = [S.rivals[2], S.rivals[1]];
      r1.co = KV.COMPANIES.find((c) => c.id === 'maruhiro'); r2.co = a.co; S.rivals[0].co = KV.COMPANIES[0];
      show('s-month'); setStep('board'); renderTop();
      await wait(700);
      const hurt = await peerNews([
        { r: r1, text: KV.pick(KV.TALK.offer).replace('{co}', r1.co.name), stab: false, hurt: 5 },
        { r: r2, text: KV.pick(KV.TALK.offer).replace('{co}', r2.co.name), stab: true, hurt: 10 },
      ]);
      setMental(-hurt);
      await wait(2600);
      demoDone();
    },
    async gd() {
      demoSetup(); S.month = 4; renderTop();
      await gd(S.apps[1]);
      demoDone();
    },
    async offer() {
      demoSetup();
      const a = S.apps[0];
      Object.assign(a, { state: 'naitei', passed: ST.length, deadline: S.month, month: S.month });
      S.rivals.slice(0, 3).forEach((r, i) => { r.co = KV.COMPANIES[i + 3]; r.month = 4 + i; });
      show('s-month'); setStep('board'); renderTop();
      await wait(600);
      openOffer(a);
      await wait(13000);
      demoDone();
    },
    async lose() {
      demoSetup(); S.mental = 8;
      S.apps.forEach((a, i) => { a.state = 'out'; a.failAt = [0, 2, 3, 1][i]; if (!i) a.silent = true; });
      S.apps[3].busted = 1;
      S.ng = 2; S.month = 10;
      S.rivals.slice(0, 5).forEach((r, i) => { r.co = KV.COMPANIES[i + 2]; r.month = 4 + i; });
      renderTop(); result();
      await wait(9000);
      demoDone();
    },
  };
  if (location.hash === '#demo') {
    S.demo = true;
    demoMenu();
  }
  $('demo-sex').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { S.demoSex = b.dataset.s; demoMenu(); } });
  $('demo-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    KV.sound.unlock();
    $('demo').hidden = true;
    demoDrive();
    DEMO_RUN[b.dataset.d]();
  });
  $('demo-back').addEventListener('click', () => { ['news', 'offer', 'enc', 'mail', 'es'].forEach((id) => ($(id).hidden = true)); demoMenu(); });

  // テスト用
  KV.game = { S, selfIntro, newSeason, startMonth, setStep, interview, gd, webTest, result, judgeAll, renderTop, setMental };
})();
