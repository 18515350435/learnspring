/**
 * 把整个站点打包成一个「单文件 HTML」，可以直接发到手机上用浏览器打开。
 *
 *   node build-single.js
 *
 * 产物：星光小马-手机版.html（样式与脚本全部内联，无任何外部依赖）
 * - 玩家端与家长端都在同一个文件里，右上角/导航里一键切换
 * - 两端原本都监听 [data-cheat]，合并后会重复触发，这里按 #playerView / #adminView 做了区域隔离
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, '星光小马-手机版.html');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------------- 1. 样式 ---------------- */

const css = read('css/style.css');

const MOBILE_CSS = `
/* ============================================================
   手机版增强（仅单文件版注入）
   ============================================================ */
html { -webkit-text-size-adjust: 100%; }
body { -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
[hidden] { display: none !important; }

/* 触摸：按钮不做双击缩放；拖家具 / 抓星星时不带动页面滚动 */
button, a, .nav-btn, .btn, .mem-card { touch-action: manipulation; }
.furni-layer, .furni, .star-field, .fall-star { touch-action: none; }
/* iOS 聚焦输入框时不要自动放大页面 */
input, select, textarea, .ipt { font-size: 16px; }

@media (max-width: 720px) {
  .wrap { padding: 0 12px; }
  .head-wrap { gap: 8px; padding-top: 8px; padding-bottom: 8px; }
  .brand-text i { display: none; }
  .brand-text b { font-size: 15px; }

  /* 8 个页签在手机上排不开，改成横向滑动 */
  .nav {
    width: 100%; margin-left: 0;
    flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;
    gap: 6px; padding: 2px 2px 8px; scrollbar-width: none;
  }
  .nav::-webkit-scrollbar { display: none; }
  .nav-btn {
    flex: 0 0 auto; white-space: nowrap;
    font-size: 13px; padding: 9px 13px; min-height: 40px;
    border-radius: 999px; border-color: var(--c-line); background: #fff;
  }
  .nav-btn.on { border-color: #ffc9e0; }
  .who { width: 100%; justify-content: flex-end; margin-left: 0; font-size: 12px; }

  /* 触摸目标放大到手指够得着 */
  .btn { min-height: 44px; padding: 10px 16px; }
  .btn.xs, .btn.sm { min-height: 38px; }
  .pm-btn { min-height: 38px; padding: 8px 14px; font-size: 13px; }
  .swatch { width: 34px; height: 34px; }

  /* 家园 */
  .room { min-height: 230px; border-width: 3px; border-radius: 16px; }
  .hm-pony { width: 15%; min-width: 0; }
  .hm-name { font-size: 10px; }
  .hm-flag { font-size: 13px; }
  .home-bar { gap: 6px 8px; }
  .hstat { font-size: 12px; padding: 3px 10px; }
  .home-tip { display: none; }
  .home-tools { gap: 6px; }
  .home-tools .btn { flex: 1 1 auto; min-height: 42px; font-size: 13px; }
  .home-foot { flex-direction: column; gap: 4px; font-size: 12px; }
  .snack { font-size: 17px; }
  .pony-menu { left: 6px; right: 6px; bottom: 6px; width: auto; padding: 10px; }
  .pony-card { width: 94%; max-height: 88vh; overflow-y: auto; }

  /* 商店 */
  .goods-grid { grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: 10px; }
  .shop-head { flex-direction: column; align-items: flex-start; gap: 8px; }
  .cat-tabs { flex-wrap: nowrap; overflow-x: auto; }
  .cat { flex: 0 0 auto; }

  /* 小游戏 */
  .star-field { height: 320px; }
  .fall-star { font-size: 30px; }
  .mem-grid { grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .gp { min-height: 92px; }

  /* 妆造台 / 图鉴 / 成就 / 相册 */
  .studio { grid-template-columns: 1fr !important; }
  .item-row, .mini-grid, .manage-grid, .stat-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
  .pony-list { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
  .pony-list.big { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .ach-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .album-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .game-pick { grid-template-columns: 1fr; }

  /* 弹窗 / 表格 */
  .modal-card { width: 94%; max-height: 88vh; overflow-y: auto; padding: 16px; }
  .streak-row { flex-wrap: wrap; }
  .tr { grid-template-columns: 1fr auto; }
  .tr.head { display: none; }
  .tops { justify-content: flex-start; }
  .stage-actions .btn { flex: 1; }
}

/* iPhone 刘海与底部横条 */
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.app-footer { padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
.app-header { padding-top: env(safe-area-inset-top); }
`;

/* ---------------- 2. 脚本 ---------------- */

const order = ['data', 'pony', 'store', 'home', 'shop', 'games', 'app'];
const scripts = order.map((n) => ({ name: n, code: read('js/' + n + '.js') }));

/* 家长端：破解按钮改用独立 id，且只在家长端区域内响应 */
let admin = read('js/admin.js');
admin = admin.split("el('#cheatBtn')").join("el('#cheatBtnAdmin')");
admin = admin.replace(
  "if ((n = hit('[data-cheat]'))) { toggleCheat(); return; }",
  "if ((n = hit('[data-cheat]')) && n.closest('#adminView')) { toggleCheat(); return; }"
);

/* 玩家端：同样限定区域；存档提示改成手机友好的说法 */
let app = scripts[scripts.length - 1].code;
app = app.replace(
  "if ((n = hit('[data-cheat]'))) { toggleCheat(); return; }",
  "if ((n = hit('[data-cheat]')) && n.closest('#playerView')) { toggleCheat(); return; }"
);
app = app.replace(
  /warn\.innerHTML = '当前环境无法写入本地存档[\s\S]*?localhost:8000<\/code>。';/,
  "warn.innerHTML = '当前环境读不到本地存档（直接打开文件时会这样），本次游玩的进度关闭后就会丢失。" +
  "想要存档，请把本文件放到网页空间里访问，或让大人帮忙生成一个在线链接。';"
);
scripts[scripts.length - 1].code = app;

/* 两端切换的粘合代码 */
const GLUE = `
(function () {
  'use strict';
  var player = document.getElementById('playerView');
  var adminView = document.getElementById('adminView');

  function setMode(m) {
    var isAdmin = m === 'admin';
    if (window.Home) window.Home.stop();
    if (window.Games) window.Games.stop();
    player.hidden = isAdmin;
    adminView.hidden = !isAdmin;
    var bs = document.querySelectorAll('[data-mode]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-mode') === m);
    }
    try { window.scrollTo(0, 0); } catch (e) { /* 某些环境不支持 */ }
    if (!isAdmin && window.App) window.App.render();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-mode]') : null;
    if (b) setMode(b.getAttribute('data-mode'));
  });

  document.addEventListener('DOMContentLoaded', function () {
    setMode('player');   /* 每次打开都先到玩家端，家长端要输密码才进 */
  });
})();
`;

/* ---------------- 3. 组装 ---------------- */

const header = (isAdmin) => '' +
  '<header class="app-header' + (isAdmin ? ' admin' : '') + '">' +
  '  <div class="wrap head-wrap">' +
  '    <div class="brand">' +
  '      <span class="brand-mark' + (isAdmin ? ' admin' : '') + '"></span>' +
  '      <span class="brand-text">' +
  '        <b>' + (isAdmin ? '家长管理端' : '星光小马妆造馆') + '</b>' +
  '        <i>' + (isAdmin ? '审核任务 · 管理解锁 · 自定义奖励' : '做任务 · 攒饰品 · 打扮自己的小伙伴') + '</i>' +
  '      </span>' +
  '    </div>' +
  (isAdmin
    ? '    <nav class="nav">' +
      '      <button class="nav-btn" data-atab="review" type="button">待审核<em id="adminBadge" class="dot">0</em></button>' +
      '      <button class="nav-btn" data-atab="tasks" type="button">任务总览</button>' +
      '      <button class="nav-btn" data-atab="manage" type="button">解锁管理</button>' +
      '      <button class="nav-btn" data-atab="data" type="button">数据与设置</button>' +
      '      <button class="nav-btn cheat-btn" id="cheatBtnAdmin" data-cheat type="button">🔒 破解开关</button>' +
      '      <button class="nav-btn alt" data-mode="player" type="button">← 返回玩家端</button>' +
      '    </nav>' +
      '    <div class="who"><i>审核身份</i><b>家长</b></div>'
    : '    <nav class="nav">' +
      '      <button class="nav-btn" data-tab="studio" type="button">妆造台</button>' +
      '      <button class="nav-btn" data-tab="tasks" type="button">任务<em id="pendingBadge" class="dot">0</em></button>' +
      '      <button class="nav-btn" data-tab="gallery" type="button">图鉴</button>' +
      '      <button class="nav-btn" data-tab="home" type="button">🏠 家园</button>' +
      '      <button class="nav-btn" data-tab="shop" type="button">⭐ 商店</button>' +
      '      <button class="nav-btn" data-tab="games" type="button">🎮 游戏</button>' +
      '      <button class="nav-btn" data-tab="ach" type="button">🏅 成就</button>' +
      '      <button class="nav-btn" data-tab="album" type="button">📷 相册</button>' +
      '      <button class="nav-btn cheat-btn" id="cheatBtn" data-cheat type="button">🔒 破解开关</button>' +
      '      <button class="nav-btn alt" data-mode="admin" type="button">👨‍👩‍👧 家长端</button>' +
      '    </nav>' +
      '    <div class="who">' +
      '      <span class="wallet-chip">⭐ <b id="topStar">0</b></span>' +
      '      <span class="wallet-chip lv" id="topLevel">Lv.1</span>' +
      '      <span class="who-name"><i>你好，</i><b id="playerName">小朋友</b></span>' +
      '    </div>') +
  '  </div>' +
  '</header>';

const html = '<!DOCTYPE html>\n' +
  '<html lang="zh-CN">\n' +
  '<head>\n' +
  '<meta charset="UTF-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="mobile-web-app-capable" content="yes">\n' +
  '<meta name="theme-color" content="#e0519c">\n' +
  '<title>星光小马妆造馆</title>\n' +
  '<style>\n' + css + '\n</style>\n' +
  '<style>\n' + MOBILE_CSS + '\n</style>\n' +
  '</head>\n' +
  '<body>\n\n' +
  '<!-- 玩家端 -->\n' +
  '<section id="playerView">\n' +
  header(false) + '\n' +
  '  <main class="wrap main">\n' +
  '    <div id="panel"></div>\n' +
  '  </main>\n' +
  '</section>\n\n' +
  '<!-- 家长端 -->\n' +
  '<section id="adminView" hidden>\n' +
  header(true) + '\n' +
  '  <div class="wrap lock" id="lockScreen">\n' +
  '    <div class="lock-card">\n' +
  '      <h2>家长验证</h2>\n' +
  '      <p class="muted">请输入管理端密码后进入（初始密码 1234，可在「数据与设置」里修改）。</p>\n' +
  '      <input id="pinField" class="ipt big" type="password" inputmode="numeric" maxlength="8" placeholder="管理端密码">\n' +
  '      <p class="pin-err" id="pinErr"></p>\n' +
  '      <button class="btn primary" id="pinBtn" data-lockbtn type="button">进入</button>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '  <main class="wrap main" id="adminBody" style="display:none">\n' +
  '    <div id="adminPanel"></div>\n' +
  '  </main>\n' +
  '</section>\n\n' +
  '<footer class="app-footer">\n' +
  '  <p>玩家端与家长端都在本文件里，导航里可一键切换。存档保存在本机浏览器（localStorage）。' +
  '本页为个人学习用途的同人小游戏，小马宝莉（My Little Pony）相关形象版权归 Hasbro 所有。</p>\n' +
  '</footer>\n\n' +
  scripts.map((s) => '<script>\n/* ===== js/' + s.name + '.js ===== */\n' + s.code + '\n</script>').join('\n') + '\n' +
  '<script>\n/* ===== js/admin.js（家长端，已做区域隔离） ===== */\n' + admin + '\n</script>\n' +
  '<script>\n/* ===== 两端切换 ===== */\n' + GLUE + '\n</script>\n' +
  '</body>\n' +
  '</html>\n';

fs.writeFileSync(OUT, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('已生成 ' + path.basename(OUT) + '（' + kb + ' KB）');
console.log('包含：' + order.join(' / ') + ' / admin + 手机版样式');
