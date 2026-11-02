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
/* 手机适配样式与多文件版共用同一份文件，改一处两边同步 */
const MOBILE_CSS = read('css/mobile.css');

/* ---------------- 2. 脚本 ---------------- */

const order = ['data', 'pony', 'cloud', 'store', 'home', 'shop', 'games', 'app'];
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
  '      <div id="lockBox"></div>\n' +
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
