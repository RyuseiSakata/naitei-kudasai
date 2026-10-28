// 結果カード: シェア用の縦長画像(1080×1350)を canvas で描く
(function () {
  const W = 1080, H = 1350;
  const root = getComputedStyle(document.documentElement);
  const tok = (n) => root.getPropertyValue(n).trim();
  const DISPLAY = '"Dela Gothic One", "Hiragino Sans", "Yu Gothic", sans-serif';
  const BODY = '"M PLUS 1p", "Hiragino Sans", "Yu Gothic", sans-serif';

  // 顔のSVGを画像にする。色はCSSのクラスで付いているので、その規則をSVGの中に写す
  let faceCss = null;
  function charaCss() {
    if (faceCss != null) return faceCss;
    const out = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; } // 外部のフォントCSSは読めない
      for (const r of rules) if (r.selectorText && /(^|[\s,])\.(chara|k-|t-(taiiku|atsu|yurui|kira|kenjitsu|me-))/.test(r.selectorText)) out.push(r.cssText);
    }
    faceCss = out.join('\n').replace(/var\((--[\w-]+)\)/g, (_, n) => tok(n));
    return faceCss;
  }
  function faceImg(type, expr) {
    const svg = KV.chara.face(type, expr).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="444" `).replace('>', `><style>${charaCss()}</style>`);
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  // 1文字ずつ折り返す(日本語用)。最大行数を超えたら「…」
  function wrap(ctx, text, maxW, maxLines) {
    const lines = []; let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch === ' ' ? '' : ch; } else cur += ch;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'; }
    return lines;
  }
  // 太いフチどりの文字(マンガの見出し)
  function bigText(ctx, text, x, y, size, fill, maxW, stroke = size * 0.14) {
    ctx.font = `${size}px ${DISPLAY}`;
    const w = ctx.measureText(text).width;
    if (w > maxW) { size = Math.floor(size * maxW / w); ctx.font = `${size}px ${DISPLAY}`; stroke = size * 0.14; }
    ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = tok('--c-ink');
    ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
    return size;
  }
  function box(ctx, x, y, w, h, fill, r = 18, shadow = 10) {
    const path = () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    if (shadow) { ctx.save(); ctx.translate(shadow, shadow); path(); ctx.fillStyle = tok('--c-ink'); ctx.fill(); ctx.restore(); }
    path(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = tok('--c-ink'); ctx.stroke();
  }

  // d: { title, win, rank, of, nums: [[数, ラベル]...], best, extras: [文...], profile, face, expr, url }
  async function make(d) {
    await Promise.all([
      document.fonts.load(`100px ${DISPLAY}`, d.title + d.rank + '位0123456789内定くださいあなたは何？'),
      document.fonts.load(`800 40px ${BODY}`, [d.best || '', d.profile, ...d.extras, 'ゼミ人中就活の結果シミュレーター'].join('')),
    ]).catch(() => {});
    const face = await faceImg(d.face, d.expr);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    // 背景: 黄色に網点
    ctx.fillStyle = tok('--c-yellow'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = tok('--c-dot');
    for (let y = 12; y < H; y += 26) for (let x = (y / 26) % 2 ? 25 : 12; x < W; x += 26) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    box(ctx, 48, 48, W - 112, H - 200, tok('--c-paper'), 22, 16);

    // 見出し
    ctx.font = `800 34px ${BODY}`;
    const kick = '就活シミュレーター『内定ください』の結果';
    const kw = ctx.measureText(kick).width + 44;
    ctx.save(); ctx.translate(96, 96); ctx.rotate(-0.03);
    ctx.fillStyle = tok('--c-ink'); ctx.beginPath(); ctx.roundRect(0, 0, kw, 58, 8); ctx.fill();
    ctx.fillStyle = tok('--c-paper'); ctx.fillText(kick, 22, 41);
    ctx.restore();

    // 称号(いちばん大きく)
    ctx.save(); ctx.translate(W / 2 - 8, 300); ctx.rotate(-0.04); ctx.textAlign = 'center';
    bigText(ctx, d.title, 0, 0, 150, d.win ? tok('--c-red') : tok('--c-gray'), W - 220);
    ctx.restore();

    // 顔と順位
    if (face) ctx.drawImage(face, 120, 344, 300, 333);
    ctx.textAlign = 'center';
    ctx.font = `800 46px ${BODY}`; ctx.fillStyle = tok('--c-ink');
    ctx.fillText(`ゼミ${d.of}人中`, 720, 430);
    bigText(ctx, `${d.rank}位`, 720, 600, 190, d.rank <= 3 ? tok('--c-red') : tok('--c-paper'), 460);
    if (d.score) { ctx.font = `800 40px ${BODY}`; ctx.fillStyle = tok('--c-ink'); ctx.fillText(d.score, 720, 672); }
    ctx.textAlign = 'left';

    // 数字4つ
    const bw = 200, gap = 22, bx = (W - 16 - (bw * 4 + gap * 3)) / 2;
    d.nums.forEach(([n, l], i) => {
      const x = bx + i * (bw + gap);
      box(ctx, x, 712, bw, 140, i === 0 && d.win ? tok('--c-yellow') : tok('--c-paper-2'), 14, 6);
      ctx.textAlign = 'center';
      ctx.font = `86px ${DISPLAY}`; ctx.fillStyle = tok('--c-ink');
      const nw = ctx.measureText(String(n)).width;
      if (nw > bw - 30) ctx.font = `${Math.floor(86 * (bw - 30) / nw)}px ${DISPLAY}`;
      ctx.fillText(String(n), x + bw / 2, 798);
      ctx.font = `800 30px ${BODY}`; ctx.fillText(l, x + bw / 2, 836);
      ctx.textAlign = 'left';
    });

    // 内定先・やらかし・スペック
    let y = 922;
    ctx.font = `800 42px ${BODY}`; ctx.fillStyle = d.best ? tok('--c-red-deep') : tok('--c-ink-2');
    for (const l of wrap(ctx, d.best ? `内定先: ${d.best}` : '内定先: なし', W - 240, 1)) { ctx.fillText(l, 110, y); y += 56; }
    ctx.font = `800 34px ${BODY}`; ctx.fillStyle = tok('--c-ink');
    for (const e of d.extras.slice(0, 3)) for (const l of wrap(ctx, '・' + e, W - 240, 1)) { ctx.fillText(l, 110, y); y += 46; }
    // スペックは枠の下のほうに(内容が少なくても位置をそろえる)
    ctx.font = `800 27px ${BODY}`; ctx.fillStyle = tok('--c-ink-2');
    y = Math.max(y + 4, 1124);
    for (const l of wrap(ctx, d.profile, W - 240, 2)) { ctx.fillText(l, 110, y); y += 36; }

    // 下の帯: 遊んだ人を呼びこむ
    ctx.fillStyle = tok('--c-red'); ctx.fillRect(0, H - 118, W, 118);
    ctx.fillStyle = tok('--c-ink'); ctx.fillRect(0, H - 124, W, 8);
    ctx.textAlign = 'center';
    bigText(ctx, 'あなたは何位？ #内定ください', W / 2, H - 52, 54, tok('--c-paper'), W - 120, 10);
    if (d.url) { ctx.font = `800 24px ${BODY}`; ctx.fillStyle = tok('--c-paper'); ctx.fillText(d.url, W / 2, H - 14); }

    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  KV.card = { make };
})();
