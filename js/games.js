/**
 * 小游戏：抓星星（练反应）和记忆翻牌（练记性）
 * 玩完按成绩给星星币，成绩会记进存档。
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store, A = window.Avatar;
  var view = 'menu';
  var timers = [];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { if (window.App && window.App.toast) window.App.toast(m); }
  function clearTimers() {
    timers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    timers = [];
  }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }

  /* ---------------- 菜单 ---------------- */

  function menuHTML() {
    var best = S.state().gameBest;
    return '' +
      '<div class="games">' +
      '  <div class="games-head">' +
      '    <h3 class="sec-title">小游戏</h3>' +
      '    <p class="muted">玩一局换点星星币，累了就回来照顾小马～</p>' +
      '  </div>' +
      '  <div class="game-pick">' +
      '    <button class="gp" data-game="star" type="button">' +
      '      <span class="gp-icon">⭐</span>' +
      '      <b>抓星星</b>' +
      '      <i>30 秒内点掉落的星星，金色星星值 3 分</i>' +
      '      <em>最好成绩 ' + (best.star || 0) + ' 分</em>' +
      '    </button>' +
      '    <button class="gp" data-game="memory" type="button">' +
      '      <span class="gp-icon">🃏</span>' +
      '      <b>记忆翻牌</b>' +
      '      <i>翻开两两相同的小马，步数越少奖励越多</i>' +
      '      <em>最少步数 ' + (best.memory || '—') + '</em>' +
      '    </button>' +
      '  </div>' +
      '</div>';
  }

  /* ---------------- 抓星星 ---------------- */

  function startStar(panel) {
    var score = 0, left = 30;
    panel.innerHTML = '' +
      '<div class="game-wrap">' +
      '  <div class="game-bar">' +
      '    <button class="btn ghost sm" data-quit type="button">← 返回</button>' +
      '    <span class="gscore">得分 <b id="gScore">0</b></span>' +
      '    <span class="gtime">剩余 <b id="gTime">30</b> 秒</span>' +
      '  </div>' +
      '  <div class="star-field" id="field"><span class="game-tip">准备…点星星！</span></div>' +
      '</div>';

    var field = panel.querySelector('#field');
    var sEl = panel.querySelector('#gScore');
    var tEl = panel.querySelector('#gTime');

    function spawn() {
      if (!field.isConnected) return;
      var gold = Math.random() < 0.22;
      var s = document.createElement('span');
      s.className = 'fall-star' + (gold ? ' gold' : '');
      s.textContent = gold ? '🌟' : '⭐';
      s.style.left = (6 + Math.random() * 84).toFixed(1) + '%';
      var dur = (gold ? 2.1 : 2.8) + Math.random() * 0.9;
      s.style.animationDuration = dur.toFixed(2) + 's';
      s.addEventListener('pointerdown', function () {
        score += gold ? 3 : 1;
        sEl.textContent = score;
        var pop = document.createElement('span');
        pop.className = 'star-pop';
        pop.textContent = '+' + (gold ? 3 : 1);
        pop.style.left = s.style.left;
        pop.style.top = (parseFloat(s.style.top) || 40) + '%';
        field.appendChild(pop);
        later(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 700);
        if (s.parentNode) s.parentNode.removeChild(s);
      });
      field.appendChild(s);
      later(function () { if (s.parentNode) s.parentNode.removeChild(s); }, dur * 1000);
    }

    later(function () {
      var tip = field.querySelector('.game-tip');
      if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
      every(spawn, 420);
      every(function () {
        left -= 1;
        tEl.textContent = left;
        if (left <= 0) {
          clearTimers();
          var gain = Math.round(score / 3) + 2;
          S.setGameBest('star', score);
          panel.innerHTML = '' +
            '<div class="game-over">' +
            '  <h3>时间到！</h3>' +
            '  <p class="big-score">' + score + ' 分</p>' +
            '  <p class="muted">抓到 ' + score + ' 分，换成 <b>⭐ ' + gain + '</b> 星星币</p>' +
            '  <div class="row">' +
            '    <button class="btn primary" data-again="star" type="button">再来一局</button>' +
            '    <button class="btn ghost" data-quit type="button">返回</button>' +
            '  </div>' +
            '</div>';
        }
      }, 1000);
    }, 700);
  }

  /* ---------------- 记忆翻牌 ---------------- */

  var mem = null;   /* 翻牌状态放在模块级，事件走统一委托 */

  function startMemory(panel) {
    var pool = D.PONIES.slice(0, 6);
    var cards = [];
    pool.forEach(function (p) { cards.push(p.id); cards.push(p.id); });
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    mem = { cards: cards, open: [], done: [], steps: 0, lock: false };
    renderMem(panel);
  }

  function renderMem(panel) {
    panel.innerHTML = '' +
      '<div class="game-wrap">' +
      '  <div class="game-bar">' +
      '    <button class="btn ghost sm" data-quit type="button">← 返回</button>' +
      '    <span class="gscore">步数 <b id="mSteps">' + mem.steps + '</b></span>' +
      '    <span class="gtime">配对 <b id="mDone">' + (mem.done.length / 2) + '</b> / 6</span>' +
      '  </div>' +
      '  <div class="mem-grid">' + mem.cards.map(function (id, k) {
        var shown = mem.open.indexOf(k) >= 0 || mem.done.indexOf(k) >= 0;
        var p = D.pony(id);
        return '<button class="mem-card' + (shown ? ' open' : '') + (mem.done.indexOf(k) >= 0 ? ' done' : '') +
          '" data-card="' + k + '" type="button">' +
          (shown ? '<span class="mc-art">' + A.render({ ponyId: id, outfit: {}, width: 76 }) + '</span>' +
            '<span class="mc-name">' + esc(p.name) + '</span>' : '<span class="mc-back">?</span>') +
          '</button>';
      }).join('') + '</div>' +
      '  <p class="muted sm">翻开两张一样的小马就能配对，全配完就通关啦。</p>' +
      '</div>';
  }

  function flipCard(panel, k) {
    if (!mem || mem.lock) return;
    if (mem.open.indexOf(k) >= 0 || mem.done.indexOf(k) >= 0) return;
    mem.open.push(k);
    renderMem(panel);
    if (mem.open.length < 2) return;

    mem.steps += 1;
    var sEl = panel.querySelector('#mSteps');
    if (sEl) sEl.textContent = mem.steps;

    if (mem.cards[mem.open[0]] === mem.cards[mem.open[1]]) {
      mem.done = mem.done.concat(mem.open);
      mem.open = [];
      renderMem(panel);
      if (mem.done.length === mem.cards.length) {
        clearTimers();
        var steps = mem.steps;
        var gain = Math.max(5, 24 - steps);
        S.setGameBest('memory', steps);
        mem = null;
        panel.innerHTML = '' +
          '<div class="game-over">' +
          '  <h3>全部配对成功！</h3>' +
          '  <p class="big-score">' + steps + ' 步</p>' +
          '  <p class="muted">用了 ' + steps + ' 步，获得 <b>⭐ ' + gain + '</b> 星星币（步数越少越多）</p>' +
          '  <div class="row">' +
          '    <button class="btn primary" data-again="memory" type="button">再来一局</button>' +
          '    <button class="btn ghost" data-quit type="button">返回</button>' +
          '  </div>' +
          '</div>';
      }
    } else {
      mem.lock = true;
      later(function () {
        if (!mem) return;
        mem.open = []; mem.lock = false;
        renderMem(panel);
      }, 900);
    }
  }

  /* ---------------- 装配 ---------------- */

  function mount(panel) {
    clearTimers();
    if (view === 'star') { startStar(panel); return; }
    if (view === 'memory') { startMemory(panel); return; }
    panel.innerHTML = menuHTML();
  }

  function bind(panel) {
    panel.addEventListener('click', function (e) {
      var t = e.target;
      var c = t.closest ? t.closest('[data-card]') : null;
      if (c) { flipCard(panel, parseInt(c.getAttribute('data-card'), 10)); return; }
      var g = t.closest ? t.closest('[data-game]') : null;
      if (g) { view = g.getAttribute('data-game'); mount(panel); return; }
      var ag = t.closest ? t.closest('[data-again]') : null;
      if (ag) { view = ag.getAttribute('data-again'); mount(panel); return; }
      var q = t.closest ? t.closest('[data-quit]') : null;
      if (q) { view = 'menu'; clearTimers(); mount(panel); }
    });
  }

  window.Games = {
    mount: function (panel) {
      if (!panel.__gamesBound) { bind(panel); panel.__gamesBound = true; }
      mount(panel);
    },
    stop: function () { clearTimers(); view = 'menu'; mem = null; }
  };
})();
