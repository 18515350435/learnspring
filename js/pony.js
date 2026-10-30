/**
 * 小马形象渲染引擎
 * 全部用 SVG 图形拼装，不依赖任何图片资源。
 * 坐标系 viewBox: 0 0 260 300（正面 Q 版半身像）
 */
(function () {
  'use strict';

  var VB = '0 0 260 300';

  /* ---------- 通用图形助手 ---------- */

  function star(cx, cy, r, fill) {
    var d = '', i, rr, a, x, y;
    for (i = 0; i < 10; i++) {
      rr = i % 2 ? r * 0.45 : r;
      a = -Math.PI / 2 + i * Math.PI / 5;
      x = cx + rr * Math.cos(a);
      y = cy + rr * Math.sin(a);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return '<path d="' + d + 'Z" fill="' + fill + '"/>';
  }

  function flower(cx, cy, r, petal, core) {
    var s = '', i, a, px, py;
    for (i = 0; i < 5; i++) {
      a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      px = cx + r * Math.cos(a);
      py = cy + r * Math.sin(a);
      s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (r * 0.72).toFixed(1) + '" fill="' + petal + '"/>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55).toFixed(1) + '" fill="' + core + '"/>';
    return s;
  }

  function heartPath(cx, cy, s, fill, stroke) {
    return '<path d="M ' + cx + ',' + (cy + s * 0.85) +
      ' C ' + (cx - s) + ',' + (cy + s * 0.05) + ' ' + (cx - s * 0.5) + ',' + (cy - s * 0.65) + ' ' + cx + ',' + (cy - s * 0.2) +
      ' C ' + (cx + s * 0.5) + ',' + (cy - s * 0.65) + ' ' + (cx + s) + ',' + (cy + s * 0.05) + ' ' + cx + ',' + (cy + s * 0.85) +
      ' Z" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="2"' : '') + '/>';
  }

  /* 鬃毛/刘海支持彩条：取到的值是数组则按索引轮换 */
  function tone(c, i) {
    return Array.isArray(c) ? c[i % c.length] : c;
  }

  /* ---------- 基础身体 ---------- */

  var MANE_BACK = [
    [130, 50, 33], [96, 62, 29], [166, 62, 29],
    [66, 88, 27], [196, 88, 27], [56, 122, 25], [204, 122, 25],
    [60, 156, 22], [200, 156, 22],
    [70, 190, 20], [66, 216, 17], [62, 242, 14], [60, 266, 11]
  ];

  var BANGS = [
    [100, 74, 24], [130, 66, 26], [160, 74, 24],
    [112, 88, 17], [148, 88, 17], [130, 84, 20], [78, 94, 15], [182, 94, 15]
  ];

  function maneBack(c) {
    var s = '<g>', i, p;
    for (i = 0; i < MANE_BACK.length; i++) {
      p = MANE_BACK[i];
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="' + tone(c.mane, i) + '"/>';
    }
    return s + '</g>';
  }

  function bangs(c) {
    var s = '<g>', i, p;
    for (i = 0; i < BANGS.length; i++) {
      p = BANGS[i];
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="' + tone(c.mane, i) + '"/>';
    }
    s += '<ellipse cx="152" cy="76" rx="7" ry="18" transform="rotate(24 152 76)" fill="' + c.mane2 + '" opacity=".9"/>';
    s += '<ellipse cx="106" cy="84" rx="6" ry="16" transform="rotate(-22 106 84)" fill="' + c.mane2 + '" opacity=".9"/>';
    return s + '</g>';
  }

  function body(c) {
    return '<path d="M 98,176 C 84,206 74,244 72,300 L 188,300 C 186,244 176,206 162,176 Z" fill="' + c.body + '"/>' +
      '<path d="M 98,176 C 84,206 74,244 72,300 L 104,300 C 100,252 108,212 122,180 Z" fill="#000" opacity=".05"/>' +
      '<path d="M 158,190 C 172,220 178,258 180,300 L 150,300 C 146,254 142,214 132,186 Z" fill="#fff" opacity=".25"/>';
  }

  function head(c) {
    return '<ellipse cx="130" cy="122" rx="70" ry="64" fill="' + c.body + '"/>';
  }

  function ears(c) {
    return '<g>' +
      '<ellipse cx="86" cy="58" rx="14" ry="27" transform="rotate(-26 86 58)" fill="' + c.body + '"/>' +
      '<ellipse cx="89" cy="60" rx="8" ry="20" transform="rotate(-26 89 60)" fill="' + c.inner + '" opacity=".85"/>' +
      '<ellipse cx="174" cy="58" rx="14" ry="27" transform="rotate(26 174 58)" fill="' + c.body + '"/>' +
      '<ellipse cx="171" cy="60" rx="8" ry="20" transform="rotate(26 171 60)" fill="' + c.inner + '" opacity=".85"/>' +
      '</g>';
  }

  function horn() {
    return '<g>' +
      '<path d="M 119,80 C 121,58 125,36 130,14 C 135,36 139,58 141,80 Z" fill="#F6EBFF" stroke="#D9BFF5" stroke-width="2"/>' +
      '<g stroke="#C79BE8" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M 122,68 L 138,64"/><path d="M 125,54 L 136,50"/><path d="M 127,40 L 133,37"/>' +
      '</g></g>';
  }

  function eyesOf(c) {
    function one(cx, mirror) {
      return '<g>' +
        '<ellipse cx="' + cx + '" cy="124" rx="14" ry="16" fill="#FFFFFF"/>' +
        '<ellipse cx="' + cx + '" cy="125" rx="10.5" ry="12.5" fill="' + c.eye + '"/>' +
        '<ellipse cx="' + cx + '" cy="126" rx="5" ry="7" fill="#241A33"/>' +
        '<circle cx="' + (cx - 4) + '" cy="119" r="3.6" fill="#FFFFFF"/>' +
        '<circle cx="' + (cx + 4) + '" cy="132" r="1.8" fill="#FFFFFF" opacity=".8"/>' +
        '<path d="' + (mirror ? 'M ' + (cx - 12) + ',118 Q ' + cx + ',107 ' + (cx + 12) + ',119' :
          'M ' + (cx - 12) + ',119 Q ' + cx + ',107 ' + (cx + 12) + ',118') +
        '" stroke="#3A2A4E" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        '</g>';
    }
    return one(104, false) + one(156, true);
  }

  function muzzle(c) {
    return '<g>' +
      '<ellipse cx="130" cy="164" rx="44" ry="30" fill="' + c.muzzle + '"/>' +
      '<ellipse cx="117" cy="157" rx="3.4" ry="5" transform="rotate(-22 117 157)" fill="#C98AA8" opacity=".75"/>' +
      '<ellipse cx="143" cy="157" rx="3.4" ry="5" transform="rotate(22 143 157)" fill="#C98AA8" opacity=".75"/>' +
      '<path d="M 119,172 Q 130,181 141,171" stroke="#B9708F" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }

  /* ---------- 饰品：按 slot 分组，id -> 返回 SVG 片段 ---------- */

  var DECOR = {
    /* 翅膀（画在身体之前，会被身体挡住内侧） */
    wing: {
      'wing-butterfly': function () {
        function side(dir) {
          return '<g transform="translate(130,196) scale(' + dir + ',1)">' +
            '<ellipse cx="88" cy="-8" rx="52" ry="30" fill="#8FD8F0" stroke="#4BA3C9" stroke-width="2" transform="rotate(-10 88 -8)"/>' +
            '<ellipse cx="80" cy="24" rx="46" ry="26" fill="#A9E4F7" stroke="#4BA3C9" stroke-width="2" transform="rotate(12 80 24)"/>' +
            '<circle cx="112" cy="-16" r="11" fill="#FFD75E" opacity=".9"/>' +
            '<circle cx="104" cy="30" r="8" fill="#FF9BC6" opacity=".9"/>' +
            '</g>';
        }
        return side(1) + side(-1);
      },
      'wing-angel': function () {
        function side(dir) {
          var s = '<g transform="translate(130,196) scale(' + dir + ',1)">', i, x, y;
          for (i = 0; i < 6; i++) {
            x = 46 + i * 15;
            y = -26 + i * 11;
            s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (20 - i) + '" ry="' + (10 - i * 0.6).toFixed(1) +
              '" transform="rotate(' + (-32 + i * 9) + ' ' + x + ' ' + y + ')" fill="#FFFFFF" stroke="#DCE6F5" stroke-width="1.5"/>';
          }
          return s + '</g>';
        }
        return side(1) + side(-1);
      },
      'wing-rainbow': function () {
        var colors = ['#E8467C', '#F7A623', '#F7E023', '#7FC86F', '#4BA3E8', '#A56BE8'];
        function side(dir) {
          var s = '<g transform="translate(130,196) scale(' + dir + ',1)">', i;
          for (i = 0; i < colors.length; i++) {
            s += '<ellipse cx="80" cy="' + (6 + i * 3) + '" rx="' + (58 - i * 8) + '" ry="' + (34 - i * 5) +
              '" fill="none" stroke="' + colors[i] + '" stroke-width="7" opacity="' + (0.9 - i * 0.08).toFixed(2) + '"/>';
          }
          return s + '</g>';
        }
        return side(1) + side(-1);
      }
    },

    hair: {
      'hair-flower': function () {
        return '<g>' + flower(48, 112, 9, '#FF9BC6', '#FFD75E') +
          flower(54, 142, 8, '#C8A2E8', '#FFD75E') +
          flower(66, 98, 7, '#FFF0A8', '#FF8FB4') + '</g>';
      },
      'hair-ribbon': function () {
        return '<g>' +
          '<path d="M 62,110 C 78,78 182,78 198,110" fill="none" stroke="#FF8CBB" stroke-width="8" stroke-linecap="round"/>' +
          '<path d="M 62,110 C 78,84 182,84 198,110" fill="none" stroke="#FFC2DC" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M 196,106 C 208,94 220,98 216,110 C 213,120 202,116 196,110 Z" fill="#FF69A6"/>' +
          '<path d="M 196,110 C 208,114 216,122 212,132 C 208,140 196,130 196,116 Z" fill="#FF69A6"/>' +
          '<circle cx="197" cy="112" r="5" fill="#FF3F86"/>' +
          '</g>';
      },
      'hair-star': function () {
        return '<g>' + star(196, 112, 10, '#FFD75E') + star(180, 94, 7, '#FFEFA8') +
          star(206, 142, 6, '#FFF7C4') + '</g>';
      }
    },

    forehead: {
      'fd-star': function () {
        return '<g>' + star(130, 92, 14, '#FFD75E') + star(130, 92, 7, '#FFF3B8') + '</g>';
      },
      'fd-gem': function () {
        return '<g>' +
          '<path d="M 116,92 L 130,68 L 144,92 L 130,114 Z" fill="#7FD8F7" stroke="#2F9FCB" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="M 116,92 L 144,92 M 130,68 L 130,114" stroke="#BFF0FF" stroke-width="1.5"/>' +
          '<path d="M 121,88 L 128,74" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
          '</g>';
      },
      'fd-moon': function () {
        return '<path d="M 124.6,69.3 A 22,22 0 1 0 141.9,109.7 A 26,26 0 0 1 124.6,69.3 Z" fill="#FFE27A" stroke="#E9BE3A" stroke-width="1.8" stroke-linejoin="round"/>';
      }
    },

    headwear: {
      'hw-bow': function () {
        return '<g>' +
          '<path d="M 130,52 C 110,24 82,32 89,53 C 95,72 118,66 130,56 Z" fill="#FF8CBB"/>' +
          '<path d="M 130,52 C 150,24 178,32 171,53 C 165,72 142,66 130,56 Z" fill="#FF8CBB"/>' +
          '<path d="M 96,40 C 104,32 118,34 124,44" stroke="#FFC2DC" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<circle cx="130" cy="54" r="9" fill="#FF4A91"/>' +
          '<circle cx="127" cy="51" r="3" fill="#FFC2DC"/>' +
          '</g>';
      },
      'hw-headphone': function () {
        return '<g>' +
          '<path d="M 64,124 C 64,58 92,36 130,36 C 168,36 196,58 196,124" fill="none" stroke="#5A4A86" stroke-width="9" stroke-linecap="round"/>' +
          '<rect x="48" y="106" width="31" height="48" rx="15" fill="#7C63C9" stroke="#5A4A86" stroke-width="2"/>' +
          '<rect x="181" y="106" width="31" height="48" rx="15" fill="#7C63C9" stroke="#5A4A86" stroke-width="2"/>' +
          '<rect x="55" y="115" width="17" height="30" rx="8.5" fill="#C3B2F5" opacity=".75"/>' +
          '<rect x="188" y="115" width="17" height="30" rx="8.5" fill="#C3B2F5" opacity=".75"/>' +
          star(66, 56, 7, '#FFD75E') + star(194, 56, 7, '#FFD75E') +
          '</g>';
      },
      'hw-hat': function () {
        return '<g>' +
          '<path d="M 92,54 C 94,20 166,20 168,54 Z" fill="#E9C583" stroke="#C79A46" stroke-width="2"/>' +
          '<path d="M 96,44 L 164,44 L 164,54 L 96,54 Z" fill="#F07FA8"/>' +
          '<ellipse cx="130" cy="56" rx="72" ry="15" fill="#F2D79A" stroke="#C79A46" stroke-width="2"/>' +
          '<circle cx="130" cy="46" r="6" fill="#FF4A91"/>' +
          '</g>';
      },
      'hw-crown': function () {
        return '<g>' +
          '<path d="M 94,60 L 98,26 L 114,44 L 130,16 L 146,44 L 162,26 L 166,60 Z" fill="#FFD75E" stroke="#E0A81A" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="M 94,60 L 166,60 L 162,70 L 98,70 Z" fill="#FFC83D" stroke="#E0A81A" stroke-width="2" stroke-linejoin="round"/>' +
          '<circle cx="130" cy="54" r="5" fill="#FF6FA5"/>' +
          '<circle cx="110" cy="55" r="3.6" fill="#7FD8F7"/>' +
          '<circle cx="150" cy="55" r="3.6" fill="#B98CE0"/>' +
          '</g>';
      },
      'hw-wreath': function () {
        var pts = [[94, 68], [110, 50], [130, 42], [152, 50], [168, 68]];
        var s = '<g>', i;
        for (i = 0; i < pts.length; i++) {
          s += flower(pts[i][0], pts[i][1], i === 2 ? 11 : 9,
            ['#FF9BC6', '#FFD1E8', '#FFD75E', '#C8A2E8', '#A8E6A8'][i],
            ['#FFD75E', '#FF8FB4', '#FFB34D', '#FFF0A8', '#FFD75E'][i]);
        }
        return s + '</g>';
      }
    },

    glasses: {
      'gl-round': function () {
        return '<g fill="#FFFFFF" fill-opacity=".3" stroke="#C08A4A" stroke-width="3.5" stroke-linecap="round">' +
          '<circle cx="104" cy="124" r="23"/>' +
          '<circle cx="156" cy="124" r="23"/>' +
          '<path d="M 127,124 L 133,124" fill="none"/>' +
          '<path d="M 82,119 L 62,110" fill="none"/>' +
          '<path d="M 178,119 L 198,110" fill="none"/>' +
          '</g>';
      },
      'gl-heart': function () {
        function lens(cx) {
          return '<path d="M ' + cx + ',142.7 C ' + (cx - 22) + ',124.1 ' + (cx - 11) + ',109.6 ' + cx + ',119.6' +
            ' C ' + (cx + 11) + ',109.6 ' + (cx + 22) + ',124.1 ' + cx + ',142.7 Z" fill="#FFFFFF" fill-opacity=".45" stroke="#E8557F" stroke-width="3"/>';
        }
        return '<g>' + lens(104) + lens(156) +
          '<path d="M 126,122 L 134,122" stroke="#E8557F" stroke-width="3" fill="none"/>' +
          '</g>';
      },
      'gl-sun': function () {
        return '<g>' +
          '<path d="M 84,110 L 62,103" stroke="#3B2A55" stroke-width="5" stroke-linecap="round"/>' +
          '<path d="M 176,110 L 198,103" stroke="#3B2A55" stroke-width="5" stroke-linecap="round"/>' +
          '<rect x="80" y="105" width="48" height="37" rx="13" fill="#3B2A55"/>' +
          '<rect x="132" y="105" width="48" height="37" rx="13" fill="#3B2A55"/>' +
          '<path d="M 128,119 L 132,119" stroke="#3B2A55" stroke-width="5"/>' +
          '<path d="M 89,116 L 118,116" stroke="#FFFFFF" stroke-width="3.5" opacity=".35" stroke-linecap="round"/>' +
          '<path d="M 142,116 L 171,116" stroke="#FFFFFF" stroke-width="3.5" opacity=".35" stroke-linecap="round"/>' +
          '</g>';
      }
    },

    eyes: {
      'ey-lash': function () {
        return '<g stroke="#3A2A4E" stroke-width="2.8" fill="none" stroke-linecap="round">' +
          '<path d="M 91,113 L 77,104"/><path d="M 89,121 L 72,117"/><path d="M 92,131 L 80,136"/>' +
          '<path d="M 169,113 L 183,104"/><path d="M 171,121 L 188,117"/><path d="M 168,131 L 180,136"/>' +
          '</g>';
      },
      'ey-sparkle': function () {
        return '<g>' +
          star(100, 119, 5, '#FFFFFF') + star(152, 119, 5, '#FFFFFF') +
          star(118, 108, 4, '#FFEFA8') + star(142, 108, 4, '#FFEFA8') +
          '<circle cx="108" cy="133" r="2.2" fill="#FFFFFF" opacity=".85"/>' +
          '<circle cx="160" cy="133" r="2.2" fill="#FFFFFF" opacity=".85"/>' +
          '</g>';
      }
    },

    cheek: {
      'ck-blush': function () {
        return '<g>' +
          '<ellipse cx="86" cy="152" rx="18" ry="10.5" fill="#FF8FB4" opacity=".45"/>' +
          '<ellipse cx="174" cy="152" rx="18" ry="10.5" fill="#FF8FB4" opacity=".45"/>' +
          '</g>';
      },
      'ck-glitter': function () {
        return '<g>' +
          '<ellipse cx="86" cy="152" rx="18" ry="10.5" fill="#FF8FB4" opacity=".45"/>' +
          '<ellipse cx="174" cy="152" rx="18" ry="10.5" fill="#FF8FB4" opacity=".45"/>' +
          star(80, 150, 4, '#FFFFFF') + star(94, 155, 3, '#FFEFA8') +
          star(168, 155, 3, '#FFFFFF') + star(180, 149, 4, '#FFEFA8') +
          '</g>';
      },
      'ck-gloss': function () {
        return '<g>' +
          '<ellipse cx="130" cy="177" rx="15" ry="8" fill="#FF7BA8" opacity=".55"/>' +
          '<ellipse cx="125" cy="174" rx="4.5" ry="2.6" fill="#FFFFFF" opacity=".75"/>' +
          '<ellipse cx="86" cy="152" rx="16" ry="9" fill="#FF8FB4" opacity=".35"/>' +
          '<ellipse cx="174" cy="152" rx="16" ry="9" fill="#FF8FB4" opacity=".35"/>' +
          '</g>';
      }
    },

    neck: {
      'nk-pearl': function () {
        var s = '<g>', i, a, x, y;
        s += '<path d="M 86,196 C 106,246 154,246 174,196" fill="none" stroke="#E8CF9A" stroke-width="2.5"/>';
        for (i = 0; i <= 12; i++) {
          a = Math.PI * (0.12 + i * 0.76 / 12);
          x = 130 + 50 * Math.cos(a);
          y = 200 + 40 * Math.sin(a);
          s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="#FFFBF2" stroke="#E8CF9A" stroke-width="1.5"/>';
          s += '<circle cx="' + (x - 2).toFixed(1) + '" cy="' + (y - 2).toFixed(1) + '" r="1.8" fill="#FFFFFF"/>';
        }
        return s + '</g>';
      },
      'nk-bell': function () {
        return '<g>' +
          '<path d="M 88,196 C 112,224 148,224 172,196" fill="none" stroke="#FF6FA5" stroke-width="12" stroke-linecap="round"/>' +
          '<path d="M 90,193 C 113,218 147,218 170,193" fill="none" stroke="#FFB3D1" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="130" cy="226" r="12" fill="#FFD75E" stroke="#E0A81A" stroke-width="2"/>' +
          '<path d="M 121,224 L 139,224" stroke="#E0A81A" stroke-width="2"/>' +
          '<circle cx="130" cy="230" r="3.4" fill="#E0A81A"/>' +
          '</g>';
      },
      'nk-scarf': function () {
        var colors = ['#FF6FA5', '#FFB34D', '#FFE066', '#7FC86F'], s = '<g>', i;
        for (i = 0; i < colors.length; i++) {
          s += '<path d="M ' + (84 + i * 3) + ',' + (192 + i * 9) +
            ' C 112,' + (224 + i * 9) + ' 148,' + (224 + i * 9) + ' ' + (176 - i * 3) + ',' + (192 + i * 9) +
            ' L ' + (176 - i * 3) + ',' + (206 + i * 9) +
            ' C 148,' + (238 + i * 9) + ' 112,' + (238 + i * 9) + ' ' + (84 + i * 3) + ',' + (206 + i * 9) + ' Z" fill="' + colors[i] + '"/>';
        }
        s += '<path d="M 150,238 C 156,258 148,276 138,288 L 156,288 C 166,274 172,254 164,238 Z" fill="#7FC86F"/>';
        return s + '</g>';
      },
      'nk-heart': function () {
        return '<g>' +
          '<path d="M 92,196 C 114,232 146,232 168,196" fill="none" stroke="#D8B6E8" stroke-width="3"/>' +
          heartPath(130, 236, 17, '#FF6FA5', '#E8467C') +
          '<path d="M 124,229 C 127,225 132,225 135,228" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>' +
          '</g>';
      }
    }
  };

  /* ---------- 主渲染 ---------- */

  function layers(c, race, outfit) {
    var out = [];
    function push(v) { if (v) out.push(v); }

    if (outfit.wing && DECOR.wing[outfit.wing]) push(DECOR.wing[outfit.wing]());
    push(maneBack(c));
    push(body(c));
    push(head(c));
    if (race === '独角兽') push(horn());
    push(ears(c));
    push(bangs(c));
    push(eyesOf(c));
    push(muzzle(c));
    if (outfit.cheek && DECOR.cheek[outfit.cheek]) push(DECOR.cheek[outfit.cheek]());
    if (outfit.eyes && DECOR.eyes[outfit.eyes]) push(DECOR.eyes[outfit.eyes]());
    if (outfit.hair && DECOR.hair[outfit.hair]) push(DECOR.hair[outfit.hair]());
    if (outfit.forehead && DECOR.forehead[outfit.forehead]) push(DECOR.forehead[outfit.forehead]());
    if (outfit.headwear && DECOR.headwear[outfit.headwear]) push(DECOR.headwear[outfit.headwear]());
    if (outfit.glasses && DECOR.glasses[outfit.glasses]) push(DECOR.glasses[outfit.glasses]());
    if (outfit.neck && DECOR.neck[outfit.neck]) push(DECOR.neck[outfit.neck]());
    return out.join('');
  }

  /**
   * 渲染完整形象
   * @param {object} o {ponyId, outfit, width}
   * @returns {string} SVG 字符串
   */
  function render(o) {
    var p = window.DATA.pony(o.ponyId) || window.DATA.PONIES[0];
    var outfit = o.outfit || {};
    var w = o.width || 300;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VB + '" width="' + w + '" height="' + Math.round(w * 300 / 260) + '" role="img" aria-label="' + p.name + '的形象">' +
      '<g>' + layers(p.colors, p.race, outfit) + '</g></svg>';
  }

  window.Avatar = { render: render, star: star, flower: flower, heartPath: heartPath };
})();
