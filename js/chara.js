// 内定ください: 面接官の顔(SVG)。expr = normal / happy / angry / shock
(function () {
  const HAIR = {
    // 体育会系: 短いツンツン
    taiiku: '<path class="k-hair" d="M52 78 L56 44 L70 56 L78 32 L92 50 L102 26 L114 48 L128 30 L134 54 L148 44 L150 80 Q140 60 100 58 Q62 60 52 78Z"/>',
    // 圧迫: 七三でぴったり
    atsu: '<path class="k-hair" d="M50 84 Q48 36 100 34 Q154 36 150 84 Q146 62 120 56 L84 60 Q60 64 50 84Z"/><path class="k-line" d="M84 60 Q90 44 104 38"/>',
    // ゆるい: もじゃもじゃ
    yurui: '<g class="k-hair"><circle cx="62" cy="62" r="18"/><circle cx="82" cy="44" r="20"/><circle cx="108" cy="40" r="21"/><circle cx="132" cy="50" r="19"/><circle cx="146" cy="70" r="15"/><circle cx="54" cy="80" r="12"/></g>',
    // キラキラ: リーゼントとサングラス
    kira: '<path class="k-hair" d="M50 84 Q44 30 96 22 Q150 14 162 46 Q150 40 140 48 Q152 60 150 84 Q140 58 100 56 Q64 58 50 84Z"/><g class="k-sun"><rect x="70" y="44" width="26" height="14" rx="6"/><rect x="104" y="44" width="26" height="14" rx="6"/><path d="M96 50 L104 50"/></g>',
    // 主人公(就活生): 男は短髪、女はボブ
    'me-m': '<path class="k-hair" d="M50 88 Q46 36 100 34 Q154 36 150 88 Q142 62 116 58 Q98 68 80 60 Q60 66 50 88Z"/>',
    'me-f': '<path class="k-hair" d="M46 124 Q36 34 100 32 Q164 34 154 124 L140 126 Q150 74 122 60 Q100 72 72 62 Q50 76 60 126Z"/>',
    // 堅実: 白髪まじりで後退ぎみ
    kenjitsu: '<path class="k-hair gray" d="M50 92 Q46 50 70 46 Q64 60 66 76 Q58 80 50 92Z M150 92 Q154 50 130 46 Q136 60 134 76 Q142 80 150 92Z"/><path class="k-line" d="M80 50 Q100 44 120 50"/>',
  };
  const EYES = {
    normal: '<ellipse class="k-ink" cx="82" cy="94" rx="5" ry="6.5"/><ellipse class="k-ink" cx="118" cy="94" rx="5" ry="6.5"/>',
    happy: '<path class="k-stroke" d="M73 96 Q82 84 91 96"/><path class="k-stroke" d="M109 96 Q118 84 127 96"/>',
    angry: '<ellipse class="k-ink" cx="83" cy="96" rx="4.5" ry="5"/><ellipse class="k-ink" cx="117" cy="96" rx="4.5" ry="5"/>',
    cry: '<path class="k-stroke" d="M73 92 Q82 100 91 92"/><path class="k-stroke" d="M109 92 Q118 100 127 92"/>',
    shock: '<circle class="k-white" cx="82" cy="94" r="10"/><circle class="k-white" cx="118" cy="94" r="10"/><circle class="k-ink" cx="82" cy="94" r="2.5"/><circle class="k-ink" cx="118" cy="94" r="2.5"/>',
  };
  const BROWS = {
    normal: '<path class="k-brow" d="M70 78 Q82 74 92 78"/><path class="k-brow" d="M108 78 Q118 74 130 78"/>',
    happy: '<path class="k-brow" d="M70 76 Q82 70 92 76"/><path class="k-brow" d="M108 76 Q118 70 130 76"/>',
    angry: '<path class="k-brow" d="M70 74 L94 86"/><path class="k-brow" d="M130 74 L106 86"/>',
    cry: '<path class="k-brow" d="M70 82 L92 74"/><path class="k-brow" d="M130 82 L108 74"/>',
    shock: '<path class="k-brow" d="M70 72 Q82 64 92 72"/><path class="k-brow" d="M108 72 Q118 64 130 72"/>',
  };
  const MOUTH = {
    normal: '<path class="k-stroke" d="M88 124 Q100 128 112 124"/>',
    happy: '<path class="k-mouth" d="M82 116 Q100 146 118 116Z"/>',
    angry: '<path class="k-stroke" d="M86 130 Q100 118 114 130"/>',
    shock: '<ellipse class="k-mouth" cx="100" cy="126" rx="9" ry="12"/>',
    cry: '<path class="k-stroke" d="M84 128 q4 -6 8 0 q4 6 8 0 q4 -6 8 0 q4 6 8 0"/>',
  };
  // 漫画の記号: 怒りマーク、青ざめ線、汗、キラキラ
  const MARK = {
    normal: '',
    happy: '<g class="k-spark"><path d="M160 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4Z"/><path d="M36 60 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3Z"/></g>',
    angry: '<g class="k-vein"><path d="M136 56 q6 -2 6 -8 M150 56 q-6 -2 -6 -8 M136 62 q6 2 6 8 M150 62 q-6 2 -6 8"/></g>',
    shock: '<g class="k-gloom"><path d="M74 64 v14 M84 62 v16 M94 62 v14 M106 62 v14 M116 62 v16 M126 64 v14"/></g><path class="k-sweat" d="M150 86 q6 10 0 14 q-6 -4 0 -14Z"/>',
  };
  // 涙と青ざめ線
  MARK.cry = '<path class="k-tear" d="M80 100 q-4 20 0 40 q6 -20 0 -40Z M120 100 q-4 20 0 40 q6 -20 0 -40Z"/><g class="k-gloom"><path d="M74 60 v14 M86 58 v16 M100 58 v14 M114 58 v16 M126 60 v14"/></g>';
  const BODY = {
    // リクルートスーツ
    'recruit-m': '<path class="k-recruit" d="M14 222 Q22 162 100 152 Q178 162 186 222Z"/><path class="k-shirt" d="M80 154 L100 196 L120 154Z"/><path class="k-tie2" d="M95 160 L105 160 L109 202 L100 212 L91 202Z"/>',
    'recruit-f': '<path class="k-recruit" d="M14 222 Q22 162 100 152 Q178 162 186 222Z"/><path class="k-shirt" d="M78 154 L100 200 L122 154Z"/><path class="k-shirt" d="M78 154 L92 174 L100 160Z M122 154 L108 174 L100 160Z"/>',
    suit: '<path class="k-suit" d="M14 222 Q22 162 100 152 Q178 162 186 222Z"/><path class="k-shirt" d="M80 154 L100 196 L120 154Z"/><path class="k-tie" d="M95 160 L105 160 L109 202 L100 212 L91 202Z"/>',
    hood: '<path class="k-hood" d="M14 222 Q22 162 100 152 Q178 162 186 222Z"/><path class="k-stroke" d="M86 160 L84 200 M114 160 L116 200"/><circle class="k-ink" cx="84" cy="202" r="3"/><circle class="k-ink" cx="116" cy="202" r="3"/>',
    pink: '<path class="k-pink" d="M14 222 Q22 162 100 152 Q178 162 186 222Z"/><path class="k-shirt" d="M80 154 L100 196 L120 154Z"/>',
  };
  const BODY_OF = { taiiku: 'suit', atsu: 'suit', yurui: 'hood', kira: 'pink', kenjitsu: 'suit', 'me-m': 'recruit-m', 'me-f': 'recruit-f' };

  function face(type, expr = 'normal') {
    const glasses = type === 'atsu'
      ? `<g class="k-glass${expr === 'angry' ? ' glint' : ''}"><rect x="68" y="84" width="28" height="20" rx="3"/><rect x="104" y="84" width="28" height="20" rx="3"/><path d="M96 92 L104 92"/></g>`
      : '';
    const mus = type === 'kenjitsu' ? '<path class="k-ink" d="M84 116 Q92 110 100 114 Q108 110 116 116 Q108 120 100 117 Q92 120 84 116Z"/>' : '';
    const brows = type === 'taiiku' ? BROWS[expr].replace(/k-brow/g, 'k-brow thick') : BROWS[expr];
    return `<svg class="chara t-${type}" viewBox="0 0 200 222" aria-hidden="true">
      ${BODY[BODY_OF[type]]}
      <rect class="k-skin" x="86" y="130" width="28" height="26"/>
      <circle class="k-skin" cx="52" cy="96" r="9"/><circle class="k-skin" cx="148" cy="96" r="9"/>
      <ellipse class="k-skin" cx="100" cy="92" rx="48" ry="54"/>
      ${HAIR[type]}${brows}${EYES[expr]}${glasses}${mus}${MOUTH[expr]}
      ${expr === 'angry' || expr === 'shock' || expr === 'cry' ? '' : '<ellipse class="k-cheek" cx="72" cy="112" rx="8" ry="4"/><ellipse class="k-cheek" cx="128" cy="112" rx="8" ry="4"/>'}
      ${MARK[expr]}
    </svg>`;
  }

  KV.chara = { face };
})();
