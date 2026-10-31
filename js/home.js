/**
 * 小马家园 · 云上城堡
 * 已解锁的小马住在云上的房间里：会自己走动、聊天、表达需求；
 * 可以摸摸、喂食、洗澡、玩耍、哄睡，还可以买家具摆进房间。
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store, A = window.Avatar;

  /* ---------------- 台词 ---------------- */

  var LINES = {
    twilight: ['今天读了一本很棒的书！', '要不要一起学魔法？', '这里的阳光真暖和～', '我给故事想了个新结局！'],
    rainbowdash: ['我是飞得最快的！', '来比赛跑步吧！', '嗖——我刚才绕了一圈！', '今天天气太适合飞了～'],
    pinkie: ['要开派对吗？！', '哈哈哈哈哈～', '我藏了一块蛋糕！', '笑一个嘛～'],
    fluttershy: ['这里好安静呀……', '小花今天也长大了。', '要不要一起照顾小鸟？', '谢谢你陪着我。'],
    rarity: ['这身搭配还不错吧？', '亮闪闪的最棒了！', '我给你设计一条围巾好吗？', '时尚，就是细节。'],
    applejack: ['干活去咯！', '要不要来个苹果？', '我说到做到！', '今天的收获真不错～']
  };
  var PET_LINES = ['嘿嘿～', '好痒呀！', '再摸一下～', '我喜欢你！', '今天也要开心哦！', '嘻嘻，谢谢你～'];
  var EAT_LINES = ['好好吃！', '再来一口～', '谢谢招待！', '我最喜欢这个啦！', '吧唧吧唧～'];
  var BATH_LINES = ['洗得香香的～', '泡泡好多呀！', '搓搓背～', '清爽多了！'];
  var PLAY_LINES = ['好好玩！', '再来一次！', '我赢啦～', '哈哈太开心了！'];
  var SLEEP_LINES = ['Zzz…', '好困呀…', 'Zzz…梦里也有苹果…'];
  var HUNGRY = ['肚子咕咕叫了…', '有没有吃的呀…', '我好想吃苹果～'];
  var DIRTY = ['身上脏脏的…', '想洗个香喷喷的澡…', '毛毛打结了…'];
  var TIRED = ['好累呀…', '想睡一会儿…', '哈啊——好困…'];
  var SAD = ['有点无聊…', '陪我玩一会儿好吗？', '今天不太开心…'];
  var SNACKS = ['🍎', '🥕', '🍪', '🍬', '🍉', '🌰', '🧁', '🍓'];
  var POTTY_LINES = ['想去卫生间～', '嗯……憋不住啦！', '厕所厕所在哪里～', '我先去一下下！'];
  var POTTY_NONE = ['想上厕所…可是没有马桶…', '嗯……有卫生间就好啦…'];
  var WASH_LINES = ['搓搓手～', '要讲卫生！', '洗得干干净净～'];

  /* 便意：每秒涨多少，涨到多少会自己找马桶 */
  var POTTY_RATE = 0.85;
  var POTTY_URGE = 78;
  var POTTY_FLAG = 70;

  /* ---------------- 音效 ---------------- */

  var actx = null;
  function beep(freq, dur, type, vol, delay) {
    if (!S.soundOn()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var t0 = actx.currentTime + (delay || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    } catch (e) { /* 不支持就静音 */ }
  }
  function sfxPet() { beep(660, 0.16, 'sine', 0.12); beep(990, 0.22, 'sine', 0.1, 0.09); }
  function sfxEat() { beep(523, 0.12, 'triangle', 0.1); beep(659, 0.12, 'triangle', 0.1, 0.1); beep(784, 0.2, 'triangle', 0.1, 0.2); }
  function sfxCall() { beep(880, 0.18, 'sine', 0.1); beep(1175, 0.26, 'sine', 0.09, 0.14); }
  function sfxDrop() { beep(392, 0.1, 'sine', 0.1); beep(523, 0.14, 'sine', 0.09, 0.08); }
  function sfxBath() { [700, 820, 940, 1050].forEach(function (f, i) { beep(f, 0.14, 'sine', 0.08, i * 0.11); }); }
  function sfxPlay() { [523, 659, 784, 659, 784].forEach(function (f, i) { beep(f, 0.13, 'triangle', 0.09, i * 0.1); }); }
  function sfxSleep() { beep(330, 0.3, 'sine', 0.09); beep(262, 0.4, 'sine', 0.08, 0.22); }
  function sfxDay(isDay) {
    if (isDay) { beep(523, 0.14, 'triangle', 0.1); beep(784, 0.22, 'triangle', 0.1, 0.12); }
    else { beep(392, 0.2, 'sine', 0.1); beep(294, 0.3, 'sine', 0.1, 0.16); }
  }
  function sfxCheer() { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.18, 'sine', 0.1, i * 0.09); }); }
  /* 冲水：一段向下的滑音 + 水声般的短噪声尾 */
  function sfxPotty() {
    beep(880, 0.1, 'sine', 0.09);
    beep(660, 0.12, 'sine', 0.09, 0.1);
    beep(440, 0.26, 'sine', 0.08, 0.22);
  }
  function sfxWash() { [900, 1050, 1200, 1050].forEach(function (f, i) { beep(f, 0.1, 'sine', 0.07, i * 0.09); }); }
  function sfxCoin() { beep(988, 0.09, 'sine', 0.1); beep(1319, 0.16, 'sine', 0.09, 0.07); }

  /* ---------------- 工具 ---------------- */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function one(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var mounted = false;
  var root = null, room = null, ponyLayer = null, fxLayer = null, snackLayer = null, furniLayer = null;
  var units = [], snacks = [], raf = 0, last = 0, fxTimer = 0, decayTimer = 0, giftTimer = 0;

  function byId(id) {
    for (var i = 0; i < units.length; i++) if (units[i].id === id) return units[i];
    return null;
  }

  /* ---------------- 墙纸 / 地板 ---------------- */

  function wallArt(id) {
    var i, x, y;
    if (id === 'w-star') {
      var st = '';
      for (i = 0; i < 26; i++) {
        st += '<circle cx="' + rnd(20, 780).toFixed(0) + '" cy="' + rnd(30, 300).toFixed(0) +
          '" r="' + rnd(1.6, 3.4).toFixed(1) + '" fill="#fff" opacity=".7"/>';
      }
      return st;
    }
    if (id === 'w-candy') {
      var cd = '';
      for (x = -40; x < 840; x += 56) {
        cd += '<path d="M' + x + ',330 L' + (x + 40) + ',0 L' + (x + 66) + ',0 L' + (x + 26) + ',330 Z" fill="#fff" opacity=".45"/>';
      }
      return cd;
    }
    if (id === 'w-mint') {
      var mn = '';
      for (y = 40; y < 320; y += 62) {
        for (x = 30; x < 800; x += 62) {
          mn += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#fff" opacity=".55"/>' +
            '<circle cx="' + (x + 31) + '" cy="' + (y + 31) + '" r="4" fill="#8ad6c8" opacity=".5"/>';
        }
      }
      return mn;
    }
    /* w-cloud 默认：粉云 */
    var cl = '';
    var pts = [[90, 90], [230, 60], [380, 96], [520, 66], [660, 100], [150, 200], [330, 220], [700, 210]];
    pts.forEach(function (p, k) {
      var s = 0.7 + (k % 3) * 0.22;
      cl += '<g opacity=".5" transform="translate(' + p[0] + ',' + p[1] + ') scale(' + s.toFixed(2) + ')">' +
        '<ellipse cx="0" cy="0" rx="26" ry="15" fill="#fff"/>' +
        '<ellipse cx="-16" cy="4" rx="16" ry="11" fill="#fff"/>' +
        '<ellipse cx="16" cy="4" rx="18" ry="12" fill="#fff"/></g>';
    });
    return cl;
  }

  function floorArt(id) {
    var y, i, g, gx, gy;
    if (id === 'g-wood') {
      var wd = '';
      for (y = 336; y < 450; y += 26) {
        wd += '<rect x="0" y="' + y + '" width="800" height="2.5" fill="#d9a86e" opacity=".55"/>';
      }
      for (i = 0; i < 12; i++) {
        wd += '<rect x="' + (i % 4) * 200 + '" y="' + (342 + i * 9) + '" width="150" height="1.6" fill="#e8bf8c" opacity=".5"/>';
      }
      return wd;
    }
    if (id === 'g-grass') {
      var gs = '';
      for (g = 0; g < 90; g++) {
        gx = rnd(0, 800); gy = rnd(334, 448);
        gs += '<path d="M' + gx.toFixed(0) + ',' + gy.toFixed(0) + ' q3,-9 7,-13 q1,7 -1,13 Z" fill="#a8d97a" opacity=".75"/>';
      }
      return gs;
    }
    /* g-marble 云石 */
    var mb = '';
    for (i = 0; i < 7; i++) {
      mb += '<path d="M' + rnd(-40, 700).toFixed(0) + ',450 q' + rnd(60, 160).toFixed(0) + ',-' + rnd(40, 90).toFixed(0) +
        ' ' + rnd(180, 320).toFixed(0) + ',-' + rnd(60, 120).toFixed(0) + '" stroke="#e3cdf0" stroke-width="2.5" fill="none" opacity=".7"/>';
    }
    return mb;
  }

  function wallTone(id) {
    var g = D.goods(id);
    return (g && g.swatch) || '#ffd9ec';
  }

  /* ---------------- 窗户与窗外 ---------------- */

  function skyStops(isDay) {
    return isDay
      ? '<stop offset="0" stop-color="#8fd9ff"/><stop offset="0.55" stop-color="#c9ecff"/><stop offset="1" stop-color="#ffe6f3"/>'
      : '<stop offset="0" stop-color="#2a2f63"/><stop offset="0.6" stop-color="#4a3f7d"/><stop offset="1" stop-color="#6d4a86"/>';
  }

  function windowArt(isDay, weather) {
    var w = weather.id;
    var sky = '<rect x="524" y="74" width="192" height="152" fill="url(#skyG)"/>';

    if (isDay) {
      sky += '<circle cx="676" cy="112" r="19" fill="#fff3b0"/><circle cx="676" cy="112" r="30" fill="#fff3b0" opacity=".35"/>';
      if (w === 'cloudy') {
        sky += '<g class="cloud"><ellipse cx="580" cy="118" rx="30" ry="16" fill="#fff" opacity=".95"/>' +
          '<ellipse cx="602" cy="110" rx="22" ry="14" fill="#fff" opacity=".95"/></g>' +
          '<g class="cloud c2"><ellipse cx="640" cy="180" rx="26" ry="13" fill="#fff" opacity=".85"/></g>';
      } else if (w === 'rain') {
        sky += '<g class="cloud"><ellipse cx="590" cy="112" rx="32" ry="17" fill="#c9cbe0"/>' +
          '<ellipse cx="616" cy="104" rx="22" ry="13" fill="#d7d9ea"/></g>';
      } else if (w === 'snow') {
        sky += '<g class="cloud"><ellipse cx="596" cy="112" rx="30" ry="16" fill="#eef4ff"/>' +
          '<ellipse cx="620" cy="105" rx="20" ry="12" fill="#f6f9ff"/></g>';
      }
    } else {
      sky += '<circle cx="672" cy="110" r="17" fill="#fdf6c9"/><circle cx="664" cy="104" r="17" fill="#3b3f75"/>' +
        '<g class="tw"><circle cx="556" cy="104" r="2.6" fill="#fff"/></g>' +
        '<g class="tw t2"><circle cx="602" cy="132" r="2.2" fill="#fff"/></g>' +
        '<g class="tw t3"><circle cx="572" cy="180" r="2.4" fill="#fff"/></g>' +
        '<g class="tw t4"><circle cx="646" cy="92" r="2" fill="#fff"/></g>';
    }

    /* 云海 */
    sky += '<g class="cloudsea"><ellipse cx="560" cy="216" rx="52" ry="20" fill="#fff" opacity=".92"/>' +
      '<ellipse cx="620" cy="210" rx="46" ry="18" fill="#fff" opacity=".92"/>' +
      '<ellipse cx="680" cy="218" rx="44" ry="17" fill="#fff" opacity=".9"/>' +
      '<ellipse cx="720" cy="212" rx="30" ry="14" fill="#fff" opacity=".88"/></g>';

    return '' +
      '<defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">' + skyStops(isDay) + '</linearGradient>' +
      '<radialGradient id="lampG"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/>' +
      '<stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>' +
      '<path d="M512,250 L512,120 A108,108 0 0 1 728,120 L728,250 Z" fill="#fff"/>' +
      '<path d="M524,250 L524,124 A96,96 0 0 1 716,124 L716,250 Z" fill="#c9ecff"/>' +
      sky +
      '<path d="M620,60 L620,250 M512,175 L728,175" stroke="#fff" stroke-width="7" opacity=".95"/>' +
      '<path d="M512,250 L512,120 A108,108 0 0 1 728,120 L728,250" fill="none" stroke="#fff" stroke-width="10"/>' +
      '<path d="M512,250 L512,120 A108,108 0 0 1 728,120 L728,250 Z" fill="none" stroke="#f2b8d8" stroke-width="5"/>' +
      '<rect x="494" y="246" width="252" height="15" rx="7" fill="#fff"/>' +
      '<rect x="494" y="258" width="252" height="7" rx="3" fill="#f0dcea"/>' +
      '<path d="M498,56 q26,110 -6,190 l-42,-8 q30,-92 6,-182 Z" fill="#ff9ec4"/>' +
      '<path d="M742,56 q-26,110 6,190 l42,-8 q-30,-92 -6,-182 Z" fill="#ff9ec4"/>' +
      '<path d="M498,56 q26,110 -6,190 l-14,-3 q26,-100 6,-187 Z" fill="#ffc2dc"/>';
  }

  /* ---------------- 家具 ---------------- */

  var FURNI = {
    'u-sofa': function () {
      return '<ellipse cx="65" cy="74" rx="58" ry="7" fill="#000" opacity=".08"/>' +
        '<rect x="6" y="26" width="118" height="46" rx="18" fill="#f0a8c8"/>' +
        '<rect x="6" y="14" width="118" height="30" rx="15" fill="#ffc0d8"/>' +
        '<rect x="14" y="34" width="44" height="30" rx="12" fill="#ffd7e7"/>' +
        '<rect x="64" y="34" width="44" height="30" rx="12" fill="#ffd7e7"/>' +
        '<circle cx="34" cy="46" r="6" fill="#fff" opacity=".7"/>' +
        '<rect x="0" y="30" width="16" height="42" rx="8" fill="#f293bb"/>' +
        '<rect x="114" y="30" width="16" height="42" rx="8" fill="#f293bb"/>';
    },
    'u-shelf': function () {
      var books = ['#ff8fa3', '#6fc8f0', '#ffd166', '#a6c1ff', '#c3a6f0'], b = '', i;
      for (i = 0; i < 5; i++) {
        b += '<rect x="' + (12 + i * 15) + '" y="' + (14 + (i % 2) * 4) + '" width="11" height="26" rx="2" fill="' + books[i] + '"/>';
      }
      for (i = 0; i < 4; i++) {
        b += '<rect x="' + (14 + i * 16) + '" y="54" width="10" height="26" rx="2" fill="' + books[(i + 2) % 5] + '"/>';
      }
      return '<ellipse cx="46" cy="112" rx="42" ry="6" fill="#000" opacity=".08"/>' +
        '<rect x="4" y="8" width="84" height="104" rx="6" fill="#e8b589"/>' +
        '<rect x="9" y="13" width="74" height="94" rx="4" fill="#fbeadb"/>' +
        '<rect x="9" y="46" width="74" height="6" fill="#e8b589"/>' +
        '<rect x="9" y="84" width="74" height="6" fill="#e8b589"/>' + b +
        '<circle cx="46" cy="66" r="8" fill="#ffd166"/>';
    },
    'u-lamp': function () {
      return '<ellipse cx="24" cy="80" rx="18" ry="5" fill="#000" opacity=".08"/>' +
        '<rect x="19" y="46" width="10" height="34" rx="4" fill="#f6e2c8"/>' +
        '<path d="M2,48 A24,24 0 0 1 46,48 Z" fill="#ff8fa3"/>' +
        '<circle cx="12" cy="38" r="4" fill="#fff" opacity=".85"/>' +
        '<circle cx="28" cy="34" r="3" fill="#fff" opacity=".85"/>' +
        '<circle cx="36" cy="42" r="3" fill="#fff" opacity=".7"/>' +
        '<circle cx="24" cy="52" r="26" fill="url(#lampG)" class="lamp-glow"/>';
    },
    'u-tent': function () {
      return '<ellipse cx="68" cy="100" rx="62" ry="7" fill="#000" opacity=".08"/>' +
        '<path d="M68,4 L134,98 L2,98 Z" fill="#a8d8f0"/>' +
        '<path d="M68,4 L134,98 L88,98 Z" fill="#8cc8ea"/>' +
        '<path d="M56,98 q12,-40 24,0 Z" fill="#fff3f8"/>' +
        '<path d="M68,4 L68,-14" stroke="#f293bb" stroke-width="3"/>' +
        '<path d="M68,-14 L86,-8 L68,-2 Z" fill="#ff8fa3"/>';
    },
    'u-bed': function () {
      return '<ellipse cx="72" cy="78" rx="66" ry="7" fill="#000" opacity=".08"/>' +
        '<path d="M6,40 q0,-34 34,-34 h64 q34,0 34,34 v10 H6 Z" fill="#ffd9ec"/>' +
        '<rect x="6" y="50" width="132" height="28" rx="10" fill="#fff"/>' +
        '<rect x="6" y="62" width="132" height="16" rx="8" fill="#c9b6f0"/>' +
        '<rect x="16" y="42" width="46" height="20" rx="10" fill="#fff"/>' +
        '<circle cx="120" cy="52" r="9" fill="#ffd166"/>' +
        '<path d="M100,6 q18,10 0,22" stroke="#f293bb" stroke-width="3" fill="none"/>';
    },
    'u-rug': function () {
      return '<ellipse cx="95" cy="22" rx="92" ry="20" fill="#ffb8d4"/>' +
        '<ellipse cx="95" cy="22" rx="70" ry="14" fill="#ffd0e2"/>' +
        '<ellipse cx="95" cy="22" rx="46" ry="9" fill="#fff0f6"/>' +
        '<ellipse cx="95" cy="22" rx="22" ry="4.5" fill="#ffb8d4"/>';
    },
    'u-horse': function () {
      return '<ellipse cx="42" cy="80" rx="34" ry="6" fill="#000" opacity=".08"/>' +
        '<path d="M4,76 q34,14 76,0" stroke="#c79a6b" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="42" cy="52" rx="30" ry="20" fill="#fff"/>' +
        '<ellipse cx="66" cy="34" rx="14" ry="12" fill="#fff"/>' +
        '<path d="M60,24 q6,-14 16,-8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="70" cy="32" r="2.6" fill="#5e4a63"/>' +
        '<path d="M20,40 q-14,4 -10,18" stroke="#ffb8d4" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<rect x="24" y="62" width="8" height="16" rx="4" fill="#fff"/>' +
        '<rect x="52" y="62" width="8" height="16" rx="4" fill="#fff"/>';
    },
    'u-tub': function () {
      return '<ellipse cx="56" cy="68" rx="52" ry="7" fill="#000" opacity=".08"/>' +
        '<path d="M6,26 h100 a8,8 0 0 1 8,8 v22 a24,24 0 0 1 -24,24 H22 a16,16 0 0 1 -16,-16 Z" fill="#fff"/>' +
        '<path d="M14,34 h92 v18 a18,18 0 0 1 -18,18 H30 a16,16 0 0 1 -16,-16 Z" fill="#bfe6ff"/>' +
        '<g opacity=".95"><circle cx="30" cy="30" r="9" fill="#fff"/><circle cx="48" cy="22" r="7" fill="#fff"/>' +
        '<circle cx="66" cy="30" r="8" fill="#fff"/><circle cx="82" cy="24" r="6" fill="#fff"/></g>' +
        '<rect x="100" y="14" width="8" height="18" rx="4" fill="#d8ecf7"/>';
    },
    'u-toilet': function () {
      return '<ellipse cx="42" cy="82" rx="32" ry="6" fill="#000" opacity=".08"/>' +
        /* 云朵水箱 */
        '<circle cx="26" cy="18" r="9" fill="#fff"/><circle cx="42" cy="11" r="11" fill="#fff"/>' +
        '<circle cx="58" cy="18" r="9" fill="#fff"/>' +
        '<rect x="22" y="16" width="40" height="20" fill="#fff"/>' +
        '<path d="M22,32 h40" stroke="#e7eff9" stroke-width="2"/>' +
        '<circle cx="55" cy="22" r="5.5" fill="#cbe6ff"/><circle cx="55" cy="22" r="2.6" fill="#8dc3f4"/>' +
        /* 马桶圈 */
        '<ellipse cx="42" cy="46" rx="32" ry="10" fill="#fdfdff"/>' +
        '<ellipse cx="42" cy="46" rx="23" ry="6.5" fill="#dff1ff"/>' +
        /* 桶身 */
        '<path d="M16,48 q1,27 26,27 q25,0 26,-27 Z" fill="#fff"/>' +
        '<path d="M23,53 q3,18 19,18 q16,0 19,-18 Z" fill="#f4f9ff"/>' +
        '<path d="M27,56 q-2,12 3,15" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        /* 脚踏 */
        '<rect x="30" y="72" width="24" height="7" rx="3.5" fill="#edf4fc"/>';
    },
    'u-sink': function () {
      return '<ellipse cx="38" cy="80" rx="30" ry="5" fill="#000" opacity=".08"/>' +
        /* 星星镜子 */
        '<path d="M38,3 l6.5,12.5 14,2 -10,9.5 2.4,14 -12.9,-6.5 -12.9,6.5 2.4,-14 -10,-9.5 14,-2 Z" fill="#ffe08a"/>' +
        '<path d="M38,9 l4.6,9 10,1.5 -7,6.5 1.7,10 -9.3,-4.7 -9.3,4.7 1.7,-10 -7,-6.5 10,-1.5 Z" fill="#fff6d8"/>' +
        /* 台面 */
        '<rect x="5" y="42" width="66" height="12" rx="6" fill="#fff"/>' +
        '<rect x="5" y="42" width="66" height="5" rx="2.5" fill="#f2f7ff"/>' +
        /* 水盆 */
        '<path d="M16,54 h44 l-6,17 a6,6 0 0 1 -6,5 H28 a6,6 0 0 1 -6,-5 Z" fill="#e9f3fd"/>' +
        '<ellipse cx="38" cy="55" rx="22" ry="4.2" fill="#cfe6fb"/>' +
        /* 水龙头 */
        '<path d="M38,54 v-13 q0,-9 9,-9" stroke="#c3d7ee" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="47" cy="31" r="3.6" fill="#a9c4e0"/>' +
        /* 支架与毛巾 */
        '<rect x="30" y="70" width="16" height="10" fill="#eef4fb"/>' +
        '<rect x="59" y="57" width="10" height="17" rx="3" fill="#ffb8d4"/>';
    },
    'u-piano': function () {
      var keys = '', i;
      for (i = 0; i < 11; i++) {
        keys += '<rect x="' + (10 + i * 10) + '" y="62" width="9" height="24" rx="2" fill="#fff" stroke="#e5dff0" stroke-width="1"/>';
      }
      return '<ellipse cx="62" cy="90" rx="56" ry="6" fill="#000" opacity=".08"/>' +
        '<rect x="6" y="16" width="112" height="52" rx="8" fill="#8f7bd4"/>' +
        '<rect x="6" y="16" width="112" height="12" rx="6" fill="#a894e6"/>' +
        '<rect x="6" y="60" width="112" height="30" rx="6" fill="#f6f1ff"/>' + keys +
        '<circle cx="20" cy="34" r="6" fill="#ffd166"/><circle cx="100" cy="34" r="6" fill="#ff8fa3"/>';
    },
    'u-plant': function () {
      return '<ellipse cx="26" cy="70" rx="20" ry="5" fill="#000" opacity=".08"/>' +
        '<path d="M14,38 h24 l-4,32 h-16 Z" fill="#e08b6a"/>' +
        '<rect x="11" y="34" width="30" height="8" rx="3" fill="#f0a483"/>' +
        '<path d="M26,34 q-18,-6 -14,-24 q16,2 18,16 Z" fill="#7ecfa8"/>' +
        '<path d="M26,34 q16,-8 12,-26 q-14,4 -16,20 Z" fill="#9adcb8"/>' +
        '<circle cx="26" cy="10" r="5" fill="#ffd166"/>';
    }
  };

  function furniSVG(g) {
    var f = FURNI[g.id];
    var w = g.w || 90, h = g.h || 80;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
      (f ? f(w, h) : '<rect x="2" y="2" width="' + (w - 4) + '" height="' + (h - 4) + '" rx="8" fill="#e8d9f5"/>') +
      '</svg>';
  }

  /* ---------------- 房间 ---------------- */

  function roomArt(isDay) {
    var st = S.state();
    var wall = wallTone(st.room.wall);
    var floor = wallTone(st.room.floor);
    var weather = S.weather();
    return '' +
      '<svg class="room-art" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="800" height="332" fill="' + wall + '"/>' +
      '<g class="wall-pat">' + wallArt(st.room.wall) + '</g>' +
      '<rect x="0" y="318" width="800" height="14" fill="#fff" opacity=".75"/>' +
      '<g fill="#fff" opacity=".85">' +
      '<ellipse cx="60" cy="326" rx="34" ry="10"/><ellipse cx="96" cy="322" rx="24" ry="9"/>' +
      '<ellipse cx="740" cy="326" rx="34" ry="10"/><ellipse cx="704" cy="322" rx="24" ry="9"/>' +
      '<ellipse cx="300" cy="328" rx="26" ry="8"/><ellipse cx="500" cy="328" rx="26" ry="8"/></g>' +
      '<rect x="0" y="332" width="800" height="118" fill="' + floor + '"/>' +
      '<g class="floor-pat">' + floorArt(st.room.floor) + '</g>' +
      '<path class="sun-patch" d="M470,332 L600,332 L660,450 L430,450 Z" fill="#fff6c8" opacity="' + (isDay ? '.32' : '0') + '"/>' +
      windowArt(isDay, weather) +
      '<g class="night-only"><circle cx="150" cy="290" r="98" fill="url(#lampG)"/></g>' +
      '<rect class="night-veil" x="0" y="0" width="800" height="450" fill="#2b2456"/>' +
      '<g class="front-cloud" opacity=".9">' +
      '<ellipse cx="40" cy="446" rx="90" ry="26" fill="#fff"/><ellipse cx="110" cy="436" rx="56" ry="22" fill="#fff"/>' +
      '<ellipse cx="760" cy="446" rx="90" ry="26" fill="#fff"/><ellipse cx="690" cy="436" rx="56" ry="22" fill="#fff"/>' +
      '</g>' +
      '</svg>';
  }

  /* ---------------- 小马 ---------------- */

  function randomOutfit() {
    var o = {};
    D.CATS.forEach(function (c) {
      if (c.id === 'bg') return;
      var pool = D.bySlot(c.id).filter(function (i) { return S.hasItem(i.id); });
      if (pool.length && Math.random() < 0.55) o[c.id] = one(pool).id;
    });
    return o;
  }

  function makeUnit(p) {
    var u = {
      id: p.id,
      outfit: randomOutfit(),
      x: rnd(24, 76), y: rnd(78, 90),
      tx: rnd(24, 76), ty: rnd(78, 90),
      walking: false, wait: rnd(0.4, 2.4),
      bubble: rnd(3, 10), bubbleT: 0, pet: 0,
      target: null, busy: 0, sleep: 0,
      bladder: rnd(0, 22), potty: 0   /* 便意 0~100；potty: 0无 1去马桶 2使用中 3去洗手 */
    };
    var wrap = document.createElement('div');
    wrap.className = 'hm-pony';
    wrap.setAttribute('data-hp', p.id);
    wrap.innerHTML =
      '<span class="hm-shadow"></span>' +
      '<span class="hm-inner">' + A.render({ ponyId: p.id, outfit: u.outfit, width: 104 }) + '</span>' +
      '<span class="hm-name">' + p.name + '<i>♥<b>' + S.heartsOf(p.id) + '</b></i></span>' +
      '<span class="hm-flag"></span>' +
      '<span class="hm-bubble"></span>';
    u.el = wrap;
    return u;
  }

  function draw(u) {
    var s = 0.76 + (u.y - 74) / 21 * 0.4;
    u.el.style.left = u.x.toFixed(2) + '%';
    u.el.style.top = u.y.toFixed(2) + '%';
    u.el.style.zIndex = String(Math.round(u.y * 10));
    u.el.style.transform = 'translate(-50%,-100%) scale(' + s.toFixed(3) + ')';
    u.el.classList.toggle('walk', u.walking);

    var n = S.needsOf(u.id);
    var flag = '', cls = '';
    if (u.potty === 2) { flag = '🚽'; cls = 'potty'; }
    else if (u.bladder >= POTTY_FLAG) { flag = '🚽'; cls = 'potty'; }
    else if (n.food < 40) { flag = '🍎'; cls = 'hung'; }
    else if (n.clean < 40) { flag = '🛁'; cls = 'dirty'; }
    else if (n.energy < 35) { flag = '💤'; cls = 'tired'; }
    else if (n.mood < 40) { flag = '💔'; cls = 'sad'; }
    var fl = u.el.querySelector('.hm-flag');
    if (fl) {
      fl.textContent = u.sleep > 0 ? '💤' : flag;
      fl.className = 'hm-flag ' + (u.sleep > 0 ? 'sleep' : cls) + (flag || u.sleep > 0 ? ' show' : '');
    }
    u.el.classList.toggle('sleeping', u.sleep > 0);
    u.el.classList.toggle('dirty', n.clean < 35 && u.sleep <= 0);
  }

  function say(u, text, dur) {
    var b = u.el.querySelector('.hm-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.add('show');
    u.bubbleT = dur || 2.4;
  }

  function jump(u) {
    u.el.classList.remove('jump');
    void u.el.offsetWidth;
    u.el.classList.add('jump');
    setTimeout(function () { u.el.classList.remove('jump'); }, 560);
  }

  function updateHearts(u) {
    var b = u.el.querySelector('.hm-name b');
    if (b) b.textContent = S.heartsOf(u.id);
    renderStats();
  }

  /* ---------------- 房间里的设施 ---------------- */

  /* 房间是否摆上了某件家具，返回它的摆放位置（百分比） */
  function furniSpot(id) {
    var items = S.state().room.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  /* 小马站到家具前面时的落脚点 */
  function standSpot(it) {
    return { x: clamp(it.x, 18, 84), y: clamp(it.y + 8, 78, 92) };
  }

  /* 家具对应的 DOM 节点，用来打闪光 */
  function furniEl(id) {
    if (!furniLayer) return null;
    var items = S.state().room.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return furniLayer.querySelector('[data-fi="' + i + '"]');
    }
    return null;
  }

  /* 成就达成时立刻弹提示（由 app.js 提供） */
  function popAch() {
    if (window.App && window.App.popAch) window.App.popAch();
  }

  function sparkleFurni(id) {
    var el = furniEl(id);
    if (!el) return;
    el.classList.remove('sparkle');
    void el.offsetWidth;
    el.classList.add('sparkle');
    setTimeout(function () { el.classList.remove('sparkle'); }, 1400);
  }

  /* ---------------- 上厕所 / 洗手 ---------------- */

  /* 让小马走向马桶；没马桶就提示去买。返回是否出发 */
  function gotoPotty(u) {
    if (u.sleep > 0) { say(u, 'Zzz…等一下…', 1.8); return false; }
    if (u.potty === 2) return false;
    var it = furniSpot('u-toilet');
    if (!it) {
      toast('房间里还没有马桶，去星星商店买一个「🚽 云朵马桶」吧～');
      say(u, one(POTTY_NONE), 2.8);
      return false;
    }
    var s = standSpot(it);
    u.tx = s.x; u.ty = s.y;
    u.walking = true; u.wait = 0; u.target = null; u.potty = 1;
    say(u, one(POTTY_LINES), 2.4);
    return true;
  }

  function usePotty(u) {
    u.potty = 2;
    u.walking = false;
    u.busy = 2.8;
    u.bladder = 0;
    u.el.classList.add('pottying');
    sfxPotty();
    say(u, '嗯……好啦！', 2.6);
    popFx('💧', u.x, u.y - 14);
    setTimeout(function () { popFx('✨', u.x + 5, u.y - 22); }, 520);
    setTimeout(function () { popFx('🚽', u.x - 5, u.y - 26); }, 950);
    sparkleFurni('u-toilet');

    S.markPotty();
    S.applyNeed(u.id, { mood: 6, clean: -4, energy: 2 });
    S.addHearts(u.id, 1);
    updateHearts(u);
    popAch();

    setTimeout(function () {
      u.el.classList.remove('pottying');
      u.busy = 0;
      var sink = furniSpot('u-sink');
      if (sink) {
        var s = standSpot(sink);
        u.tx = s.x; u.ty = s.y; u.walking = true; u.potty = 3;
        say(u, '去洗个手～', 2);
      } else {
        u.potty = 0;
        say(u, '舒服多啦！', 2.2);
        u.wait = rnd(0.8, 2);
      }
    }, 2800);
    toast('自己上厕所啦，真棒！+2⭐');
  }

  function washHands(u) {
    u.potty = 0;
    u.walking = false;
    u.busy = 2.2;
    u.el.classList.add('washing');
    sfxWash();
    say(u, one(WASH_LINES), 2.4);
    for (var i = 0; i < 6; i++) {
      (function (k) {
        setTimeout(function () { popFx('🫧', u.x + rnd(-10, 10), u.y - 8 - rnd(0, 26)); }, k * 150);
      })(i);
    }
    sparkleFurni('u-sink');
    S.markWash();
    S.applyNeed(u.id, { clean: 10, mood: 3 }, 'clean');
    popAch();
    setTimeout(function () {
      u.el.classList.remove('washing');
      u.busy = 0;
      u.wait = rnd(0.8, 2);
    }, 2200);
    toast('上完厕所洗手，讲卫生！+1⭐');
  }

  /* ---------------- 互动 ---------------- */

  function pet(u) {
    if (u.sleep > 0) { say(u, 'Zzz…别吵…', 1.8); return; }
    u.pet += 1;
    S.addHearts(u.id, 1);
    S.applyNeed(u.id, { mood: 4 }, 'pet');
    updateHearts(u);
    sfxPet();
    jump(u);
    say(u, one(PET_LINES), 2.2);
    popFx('♥', u.x + rnd(-3, 3), u.y - 22);
    if (u.pet % 5 === 0) {
      sfxCheer();
      say(u, '我们是好朋友！', 3);
      for (var i = 0; i < 6; i++) {
        (function (k) {
          setTimeout(function () { popFx(['🌈', '✨', '💖', '⭐'][k % 4], u.x + rnd(-14, 14), u.y - 24 - k * 4); }, k * 90);
        })(i);
      }
    }
    units.forEach(function (o) {
      if (o === u || Math.random() > 0.45) return;
      o.tx = clamp(u.x + rnd(-9, 9), 18, 84);
      o.ty = clamp(u.y + rnd(-3, 3), 78, 92);
      o.walking = true; o.wait = 0; o.target = null;
    });
  }

  function give(u, goodsId) {
    if (u.sleep > 0) { say(u, 'Zzz…等一下…', 1.8); return; }
    var r = S.useItem(goodsId, u.id);
    if (!r.ok) { toast(r.msg); return; }
    var g = r.goods;
    updateHearts(u);
    jump(u);
    if (g.cat === 'food') {
      sfxEat();
      say(u, one(EAT_LINES), 2.4);
      popFx(g.icon, u.x, u.y - 18);
      popFx('♥', u.x + rnd(-4, 4), u.y - 24);
      u.bladder = Math.min(100, u.bladder + 24);   /* 吃饱喝足，过会儿就该上厕所了 */
    } else {
      sfxPlay();
      say(u, one(PLAY_LINES), 2.4);
      popFx(g.icon, u.x + rnd(-5, 5), u.y - 20);
      popFx('🎵', u.x + rnd(-8, 8), u.y - 26);
      u.busy = 1.4;
    }
    toast(g.name + ' 用掉啦，' + (g.cat === 'food' ? '吃饱饱' : '玩得开心') + ' +' + r.hearts + '♥');
  }

  function bath(u) {
    if (u.sleep > 0) { say(u, 'Zzz…', 1.6); return; }
    S.applyNeed(u.id, { clean: 45, mood: 6 }, 'clean');
    sfxBath();
    u.busy = 2.2;
    u.el.classList.add('bathing');
    say(u, one(BATH_LINES), 2.6);
    for (var i = 0; i < 10; i++) {
      (function (k) {
        setTimeout(function () { popFx('🫧', u.x + rnd(-14, 14), u.y - 10 - rnd(0, 34)); }, k * 170);
      })(i);
    }
    setTimeout(function () { u.el.classList.remove('bathing'); }, 2400);
    toast('洗得香喷喷的✨');
  }

  function sleep(u) {
    if (u.sleep > 0) return;
    u.sleep = 6;
    u.walking = false;
    u.wait = 6;
    S.applyNeed(u.id, { energy: 55, mood: 5 }, 'energy');
    sfxSleep();
    say(u, one(SLEEP_LINES), 3);
    var i = 0;
    var timer = setInterval(function () {
      i += 1;
      if (!mounted || i > 6) { clearInterval(timer); return; }
      popFx('💤', u.x + 6, u.y - 26 - i * 3);
    }, 900);
    setTimeout(function () { u.sleep = 0; u.wait = 0.6; }, 6000);
    toast('哄睡中…（6 秒后精神满满）');
  }

  /* ---------------- 零食 / 特效 / 惊喜 ---------------- */

  function dropSnacks(n) {
    for (var i = 0; i < (n || 3); i++) {
      var x = rnd(24, 76), y = rnd(80, 92);
      var el = document.createElement('span');
      el.className = 'snack';
      el.textContent = one(SNACKS);
      el.style.left = x + '%';
      el.style.top = y + '%';
      snackLayer.appendChild(el);
      snacks.push({ x: x, y: y, el: el });
    }
    units.forEach(function (u) {
      var s = nearestSnack(u);
      if (s && u.sleep <= 0) { u.target = s; u.walking = true; u.wait = 0; }
    });
  }

  function nearestSnack(u) {
    var best = null, bd = 1e9, i, d;
    for (i = 0; i < snacks.length; i++) {
      d = Math.abs(snacks[i].x - u.x) + Math.abs(snacks[i].y - u.y);
      if (d < bd) { bd = d; best = snacks[i]; }
    }
    return best;
  }

  function eat(u, s) {
    var idx = snacks.indexOf(s);
    if (idx < 0) return;
    snacks.splice(idx, 1);
    s.el.classList.add('gone');
    setTimeout(function () { if (s.el.parentNode) s.el.parentNode.removeChild(s.el); }, 400);
    S.addHearts(u.id, 2);
    S.applyNeed(u.id, { food: 18, mood: 5 }, 'food');
    u.bladder = Math.min(100, u.bladder + 18);   /* 吃完东西更容易想上厕所 */
    updateHearts(u);
    sfxEat();
    jump(u);
    say(u, one(EAT_LINES), 2.4);
    popFx('♥', u.x + rnd(-3, 3), u.y - 22);
    popFx('✨', u.x + rnd(-6, 6), u.y - 26);
  }

  function popFx(text, x, y) {
    if (!fxLayer) return;
    var e = document.createElement('span');
    e.className = 'fx';
    e.textContent = text;
    e.style.left = clamp(x, 4, 96) + '%';
    e.style.top = clamp(y, 4, 96) + '%';
    fxLayer.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 2600);
  }

  function ambientFx() {
    var night = !S.isDay();
    var pool = night ? ['⭐', '✨', '💫', '🌙'] : ['🎵', '✨', '🌸', '🦋'];
    popFx(one(pool), rnd(10, 90), rnd(20, 60));
  }

  function spawnGift() {
    if (!fxLayer) return;
    var e = document.createElement('span');
    e.className = 'gift';
    e.textContent = Math.random() < 0.5 ? '⭐' : '🎁';
    e.style.left = rnd(18, 82) + '%';
    e.style.top = rnd(24, 58) + '%';
    e.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var n = 5 + Math.floor(Math.random() * 6);
      S.addStars(n, '捡到惊喜');
      sfxCoin();
      popFx('⭐+' + n, parseFloat(e.style.left), parseFloat(e.style.top));
      toast('捡到惊喜！星星币 +' + n);
      renderStats();
      if (e.parentNode) e.parentNode.removeChild(e);
    });
    fxLayer.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 9000);
  }

  /* ---------------- 菜单 / 档案 ---------------- */

  function closeMenu() {
    if (!root) return;
    var m = root.querySelector('.pony-menu');
    if (m && m.parentNode) m.parentNode.removeChild(m);
    var c = root.querySelector('.pony-card');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }

  function heartLevel(id) { return Math.min(5, 1 + Math.floor(S.heartsOf(id) / 40)); }

  function openMenu(u) {
    closeMenu();
    var bag = S.bagList().filter(function (b) { return b.goods.cat === 'food' || b.goods.cat === 'toy'; });
    var foods = bag.filter(function (b) { return b.goods.cat === 'food'; });
    var toys = bag.filter(function (b) { return b.goods.cat === 'toy'; });

    var m = document.createElement('div');
    m.className = 'pony-menu';
    m.innerHTML =
      '<div class="pm-title">' + esc(D.pony(u.id).name) + '<em>亲密度 Lv.' + heartLevel(u.id) + '</em></div>' +
      '<div class="pm-row">' +
      '  <button class="pm-btn" data-pm="pet" type="button">🫶 摸摸</button>' +
      '  <button class="pm-btn" data-pm="bath" type="button">🛁 洗澡</button>' +
      '  <button class="pm-btn" data-pm="sleep" type="button">💤 哄睡</button>' +
      '  <button class="pm-btn' + (u.bladder >= POTTY_FLAG ? ' warn' : '') + '" data-pm="potty" type="button">🚽 ' +
        (u.bladder >= POTTY_FLAG ? '快憋不住' : '上厕所') + '</button>' +
      '  <button class="pm-btn" data-pm="info" type="button">📋 档案</button>' +
      '</div>' +
      '<div class="pm-label">喂食</div>' +
      '<div class="pm-row">' + (foods.length ? foods.map(function (b) {
        return '<button class="pm-btn food" data-use="' + b.goods.id + '" type="button">' + b.goods.icon + ' ' +
          esc(b.goods.name) + ' ×' + b.count + '</button>';
      }).join('') : '<span class="pm-empty">背包里没有吃的，去星星商店买～</span>') + '</div>' +
      '<div class="pm-label">玩耍</div>' +
      '<div class="pm-row">' + (toys.length ? toys.map(function (b) {
        return '<button class="pm-btn toy" data-use="' + b.goods.id + '" type="button">' + b.goods.icon + ' ' +
          esc(b.goods.name) + ' ×' + b.count + '</button>';
      }).join('') : '<span class="pm-empty">还没有玩具，商店里有皮球和秋千～</span>') + '</div>';

    m.addEventListener('click', function (e) {
      var t = e.target;
      var b = t.closest ? t.closest('[data-use]') : null;
      if (b) { give(u, b.getAttribute('data-use')); closeMenu(); return; }
      var pm = t.closest ? t.closest('[data-pm]') : null;
      if (!pm) return;
      var act = pm.getAttribute('data-pm');
      if (act === 'pet') { pet(u); closeMenu(); }
      else if (act === 'bath') { bath(u); closeMenu(); }
      else if (act === 'sleep') { sleep(u); closeMenu(); }
      else if (act === 'potty') {
        closeMenu();
        if (u.bladder < 18) say(u, '现在还不想上厕所呢～', 2.2);
        else gotoPotty(u);
      }
      else if (act === 'info') { closeMenu(); openCard(u); }
    });
    root.appendChild(m);
  }

  function openCard(u) {
    var n = S.needsOf(u.id);
    var tr = S.traitOf(u.id);
    var trait = tr ? D.TRAITS[tr] : null;
    var c = document.createElement('div');
    c.className = 'pony-card';
    c.innerHTML =
      '<div class="pc-head"><b>' + esc(D.pony(u.id).name) + '</b>' +
      '<span>' + esc(D.pony(u.id).race) + ' · 亲密度 Lv.' + heartLevel(u.id) + '</span>' +
      '<button class="pc-close" data-close type="button">×</button></div>' +
      '<div class="pc-art">' + A.render({ ponyId: u.id, outfit: u.outfit, width: 96 }) + '</div>' +
      '<div class="pc-needs">' + D.NEEDS.map(function (k) {
        var v = Math.round(n[k.id]);
        return '<div class="need ' + S.needLevel(v) + '"><span>' + k.icon + ' ' + k.name + '</span>' +
          '<i><b style="width:' + v + '%"></b></i><em>' + v + '</em></div>';
      }).join('') +
        /* 便意越高越急，颜色按「剩余舒适值」反着算 */
        '<div class="need ' + S.needLevel(100 - Math.round(u.bladder)) + '">' +
        '<span>🚽 便意</span><i><b style="width:' + Math.round(u.bladder) + '%"></b></i>' +
        '<em>' + Math.round(u.bladder) + '</em></div>' +
      '</div>' +
      '<div class="pc-meta">' +
      '  <div>爱心 <b>' + S.heartsOf(u.id) + '</b></div>' +
      '  <div>性格 <b>' + (trait ? trait.name : '还在观察中') + '</b>' +
      (trait ? '<i>' + esc(trait.desc) + '</i>' : '') + '</div>' +
      '</div>';
    c.addEventListener('click', function (e) {
      if ((e.target.closest && e.target.closest('[data-close]')) || e.target === c) {
        if (c.parentNode) c.parentNode.removeChild(c);
      }
    });
    root.appendChild(c);
  }

  /* ---------------- 循环 ---------------- */

  function step(u, dt) {
    var n = S.needsOf(u.id);

    if (u.sleep > 0) {
      u.sleep -= dt;
      if (u.sleep <= 0) { u.sleep = 0; u.wait = 0.5; say(u, '睡饱啦！', 2); }
      draw(u);
      return;
    }
    if (u.busy > 0) u.busy -= dt;

    /* 便意随时间上涨，睡着时涨得慢一点 */
    u.bladder = Math.min(100, u.bladder + dt * POTTY_RATE * (u.sleep > 0 ? 0.45 : 1));

    var speed = 15 * (n.mood < 35 ? 0.6 : 1) * (n.energy < 35 ? 0.7 : 1);

    if (u.walking) {
      var dx = u.tx - u.x, dy = u.ty - u.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var sp = speed * dt;
      if (d <= sp + 0.5) {
        u.x = u.tx; u.y = u.ty;
        u.walking = false;
        u.wait = rnd(0.9, 3.2);
        if (u.potty === 1) usePotty(u);
        else if (u.potty === 3) washHands(u);
        else if (u.target) { var s = u.target; u.target = null; eat(u, s); }
      } else {
        u.x += dx / d * sp;
        u.y += dy / d * sp;
      }
    } else {
      u.wait -= dt;
      if (u.wait <= 0 && u.busy <= 0) {
        var sn = nearestSnack(u);
        if (u.potty === 0 && u.bladder >= POTTY_URGE && furniSpot('u-toilet')) {
          gotoPotty(u);                                  /* 憋不住了，自己跑去厕所 */
        } else if (sn) { u.tx = sn.x; u.ty = sn.y; u.target = sn; }
        else if (n.energy < 25) { u.sleep = 5; say(u, one(TIRED), 2.6); }
        else if (!S.isDay() && Math.random() < 0.4) {
          u.tx = rnd(38, 62); u.ty = rnd(84, 91); say(u, one(SLEEP_LINES), 2.8);
        } else { u.tx = rnd(20, 80); u.ty = rnd(78, 91); }
        u.walking = true;
      }
    }
    u.x = clamp(u.x, 16, 84);
    u.y = clamp(u.y, 76, 93);

    if (u.bubbleT > 0) {
      u.bubbleT -= dt;
      if (u.bubbleT <= 0) {
        var b = u.el.querySelector('.hm-bubble');
        if (b) b.classList.remove('show');
      }
    } else {
      u.bubble -= dt;
      if (u.bubble <= 0) {
        var line;
        if (u.bladder >= 62 && !furniSpot('u-toilet')) line = one(POTTY_NONE);
        else if (u.bladder >= 62) line = one(POTTY_LINES);
        else if (n.food < 35) line = one(HUNGRY);
        else if (n.clean < 35) line = one(DIRTY);
        else if (n.energy < 30) line = one(TIRED);
        else if (n.mood < 35) line = one(SAD);
        else line = one(LINES[u.id] || PET_LINES);
        say(u, line, 2.8);
        u.bubble = rnd(8, 18);
      }
    }
    draw(u);
  }

  function tick(ts) {
    if (!mounted) return;
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;

    fxTimer -= dt;
    if (fxTimer <= 0) {
      fxTimer = rnd(1.0, 2.4);
      if (Math.random() < 0.7) ambientFx();
    }
    giftTimer -= dt;
    if (giftTimer <= 0) { giftTimer = rnd(24, 45); spawnGift(); }
    decayTimer -= dt;
    if (decayTimer <= 0) {
      decayTimer = 20;
      if (S.decayNeeds()) units.forEach(draw);
    }

    units.forEach(function (u) { step(u, dt); });
    raf = requestAnimationFrame(tick);
  }

  /* ---------------- 家具拖放 ---------------- */

  function renderFurni() {
    if (!furniLayer) return;
    furniLayer.innerHTML = '';
    S.state().room.items.forEach(function (it, i) {
      var g = D.goods(it.id);
      if (!g) return;
      var el = document.createElement('div');
      el.className = 'furni' + (g.flat ? ' flat' : '');
      el.setAttribute('data-fi', String(i));
      el.style.left = it.x + '%';
      el.style.top = it.y + '%';
      el.style.width = (g.w / 800 * 100) + '%';
      el.style.zIndex = String(Math.round(it.y * 10) - 1);
      el.innerHTML = furniSVG(g);
      el.title = g.name + '（按住可以拖动）';
      furniLayer.appendChild(el);
    });
  }

  function bindDrag() {
    var dragging = null, moved = false;
    furniLayer.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest('.furni') : null;
      if (!el) return;
      dragging = el; moved = false;
      el.classList.add('drag');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器忽略 */ }
    });
    furniLayer.addEventListener('pointermove', function (e) {
      if (!dragging || !room) return;
      moved = true;
      var r = room.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 100;
      var y = (e.clientY - r.top) / r.height * 100;
      dragging.style.left = clamp(x, 6, 94) + '%';
      dragging.style.top = clamp(y, 72, 96) + '%';
    });
    furniLayer.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      var idx = parseInt(dragging.getAttribute('data-fi'), 10);
      dragging.classList.remove('drag');
      if (moved) {
        S.moveFurni(idx, parseFloat(dragging.style.left), parseFloat(dragging.style.top));
        toast('摆放好啦');
      }
      dragging = null;
    });
  }

  /* ---------------- 顶部状态 ---------------- */

  function renderStats() {
    if (!root) return;
    var st = S.state(), el;
    if ((el = root.querySelector('#hStar'))) el.textContent = st.stars;
    if ((el = root.querySelector('#hLevel'))) el.textContent = 'Lv.' + st.level;
    if ((el = root.querySelector('#hXp'))) {
      el.style.width = Math.min(100, st.xp / D.xpForLevel(st.level) * 100).toFixed(1) + '%';
    }
    if ((el = root.querySelector('#hWeather'))) el.textContent = S.weather().icon + ' ' + S.weather().name;
    if ((el = root.querySelector('#hHeart'))) el.textContent = S.heartsTotal();
    if ((el = root.querySelector('#hStreak'))) el.textContent = st.checkin.streak;
  }

  /* ---------------- 工具按钮 ---------------- */

  function doAct(act) {
    if (act === 'snack') {
      dropSnacks(3); sfxDrop();
      if (units[0]) say(units[0], '有吃的！', 2);
    } else if (act === 'potty') {
      /* 让憋着的小马都去一趟厕所 */
      var went = 0;
      units.forEach(function (u) {
        if (u.potty !== 0 || u.sleep > 0 || u.bladder < 35) return;
        if (gotoPotty(u)) went += 1;
      });
      if (!went) toast('现在没有小马想上厕所～');
    } else if (act === 'call') {
      gather(50, 86); sfxCall();
    } else if (act === 'dress') {
      units.forEach(function (u) {
        u.outfit = randomOutfit();
        var inner = u.el.querySelector('.hm-inner');
        if (inner) inner.innerHTML = A.render({ ponyId: u.id, outfit: u.outfit, width: 104 });
        jump(u);
      });
      sfxPet();
    } else if (act === 'sound') {
      var on = S.toggleSound();
      var sb = root.querySelector('[data-hact="sound"]');
      if (sb) sb.textContent = on ? '🔊 音效开' : '🔇 音效关';
      if (on) sfxPet();
    } else if (act === 'day') {
      var day = S.toggleDay();
      room.classList.toggle('night', !day);
      var sky = room.querySelector('.room-art');
      if (sky) sky.outerHTML = roomArt(day);
      var btn = root.querySelector('[data-hact="day"]');
      if (btn) btn.textContent = day ? '🌙 变成晚上' : '☀️ 变成白天';
      sfxDay(day);
      units.forEach(function (u) { say(u, day ? '早上好！' : one(SLEEP_LINES), 2.2); });
    } else if (act === 'photo') {
      var name = prompt('给这张照片起个名字吧', '家园 ' + (S.state().album.length + 1));
      if (typeof name !== 'string') return renderStats();          /* 取消或环境不支持 prompt */
      name = name.trim() || ('家园 ' + (S.state().album.length + 1));
      S.takePhoto(name); sfxCoin(); toast('咔嚓！照片存进相册了');
    } else if (act === 'checkin') {
      var r = S.doCheckin();
      if (r) {
        sfxCoin();
        toast('打卡成功！连续 ' + r.streak + ' 天，星星币 +' + r.reward + '⭐');
        var cb = root.querySelector('[data-hact="checkin"]');
        if (cb && cb.parentNode) cb.parentNode.removeChild(cb);
      }
    } else if (act === 'decor') {
      window.dispatchEvent(new CustomEvent('home:decor'));
    }
    renderStats();
  }

  function gather(x, y) {
    units.forEach(function (u) {
      if (u.sleep > 0) return;
      u.tx = clamp(x + rnd(-11, 11), 18, 84);
      u.ty = clamp(y + rnd(-3, 4), 78, 92);
      u.walking = true; u.wait = 0; u.target = null;
      say(u, '来啦！', 1.6);
    });
  }

  /* ---------------- 装配 ---------------- */

  function bindClicks() {
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('.pony-menu')) return;
      if (t.closest && t.closest('.gift')) return;

      var hp = t.closest ? t.closest('[data-hp]') : null;
      if (hp) {
        var u = byId(hp.getAttribute('data-hp'));
        if (u) openMenu(u);
        return;
      }
      var act = t.closest ? t.closest('[data-hact]') : null;
      if (act) { doAct(act.getAttribute('data-hact')); return; }
      closeMenu();
      if (!room) return;
      var r = room.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 100;
      var y = (e.clientY - r.top) / r.height * 100;
      if (y > 52 && y < 99) gather(x, y);
    });
  }

  function mount(panel) {
    stop();
    var day = S.isDay();
    var list = D.PONIES.filter(function (p) { return S.hasPony(p.id); });
    if (!list.length) list = [D.PONIES[0]];
    var ci = S.checkinState();

    panel.innerHTML = '' +
      '<div class="home" id="homeRoot">' +
      '  <div class="home-bar">' +
      '    <span class="hstat star">⭐ <b id="hStar">0</b></span>' +
      '    <span class="hstat lv"><b id="hLevel">Lv.1</b><i><u id="hXp"></u></i></span>' +
      '    <span class="hstat" id="hWeather">☀️ 晴天</span>' +
      '    <span class="hstat">🔥 连续 <b id="hStreak">0</b> 天</span>' +
      '    <span class="hstat">总爱心 <b id="hHeart">0</b></span>' +
      '    <span class="home-tip">点小马可以摸摸它、喂它、给它洗澡</span>' +
      '  </div>' +
      '  <div class="room' + (day ? '' : ' night') + '" id="room">' +
      roomArt(day) +
      '    <div class="room-layer" id="fxLayer"></div>' +
      '    <div class="room-layer" id="snackLayer"></div>' +
      '    <div class="room-layer furni-layer" id="furniLayer"></div>' +
      '    <div class="room-layer" id="ponyLayer"></div>' +
      '  </div>' +
      '  <div class="home-tools">' +
      '    <button class="btn ghost sm" data-hact="snack" type="button">🍎 撒零食</button>' +
      '    <button class="btn ghost sm" data-hact="potty" type="button">🚽 去上厕所</button>' +
      '    <button class="btn ghost sm" data-hact="call" type="button">🔔 集合啦</button>' +
      '    <button class="btn ghost sm" data-hact="dress" type="button">🎲 换装扮</button>' +
      '    <button class="btn ghost sm" data-hact="day" type="button">' + (day ? '🌙 变成晚上' : '☀️ 变成白天') + '</button>' +
      '    <button class="btn ghost sm" data-hact="photo" type="button">📷 拍张照</button>' +
      '    <button class="btn ghost sm" data-hact="decor" type="button">🎨 换墙纸地板</button>' +
      '    <button class="btn ghost sm" data-hact="sound" type="button">' + (S.soundOn() ? '🔊 音效开' : '🔇 音效关') + '</button>' +
      (ci.done ? '' : '<button class="btn primary sm" data-hact="checkin" type="button">🎁 今日打卡 +' + ci.next + '⭐</button>') +
      '  </div>' +
      '  <div class="home-foot">' +
      '    <span>🏠 小马会饿、会脏、会犯困，好好照顾它们，爱心涨得更快</span>' +
      '    <span>商店里可以买吃的、玩具、家具；家具能直接拖着摆位置</span>' +
      '  </div>' +
      '</div>';

    root = panel.querySelector('#homeRoot');
    room = panel.querySelector('#room');
    ponyLayer = panel.querySelector('#ponyLayer');
    fxLayer = panel.querySelector('#fxLayer');
    snackLayer = panel.querySelector('#snackLayer');
    furniLayer = panel.querySelector('#furniLayer');

    units = list.map(makeUnit);
    units.forEach(function (u) { ponyLayer.appendChild(u.el); draw(u); });
    renderFurni();
    bindDrag();
    renderStats();
    bindClicks();

    mounted = true;
    last = 0; fxTimer = 1.5; decayTimer = 20; giftTimer = rnd(12, 22);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    mounted = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    units = []; snacks = [];
    root = room = ponyLayer = fxLayer = snackLayer = furniLayer = null;
  }

  function toast(msg) {
    if (window.App && window.App.toast) return window.App.toast(msg);
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.className = 'toast out'; }, 1600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }

  window.Home = { mount: mount, stop: stop, units: function () { return units; } };
})();
