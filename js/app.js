/**
 * 玩家端逻辑：妆造台 / 任务中心 / 收集图鉴
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store, A = window.Avatar;
  var tab = 'studio';
  var catFilter = 'all';
  var taskFilter = 'all';
  var focusTask = null;

  var STATUS_TEXT = { todo: '未开始', pending: '待家长审核', approved: '已完成', rejected: '被打回' };

  function el(sel) { return document.querySelector(sel); }
  function pick(obj, keys) {
    var o = {}, k;
    for (k in obj) if (obj.hasOwnProperty(k) && keys.indexOf(k) >= 0) o[k] = obj[k];
    return o;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 弹层 ---------- */

  var modal = null;
  function openModal(html) {
    closeModal();
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-card">' + html + '</div>';
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.hasAttribute('data-close')) closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  }
  function closeModal() {
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.className = 'toast out'; }, 1600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }

  /* ---------- 片段 ---------- */

  function previewHTML(item) {
    var st = S.state();
    var o = pick(st.outfit, ['wing', 'hair', 'forehead', 'headwear', 'glasses', 'eyes', 'cheek', 'neck']);
    o[item.slot] = item.id;
    return A.render({ ponyId: st.activePony, outfit: o, width: 116 });
  }

  function ponyChipHTML(p, active, unlocked, size) {
    var o = unlocked
      ? pick(S.state().outfit, ['wing', 'hair', 'forehead', 'headwear', 'glasses', 'eyes', 'cheek', 'neck'])
      : {};
    return '<button class="pony-chip' + (active ? ' on' : '') + (unlocked ? '' : ' locked') +
      '" data-pony="' + p.id + '" type="button">' +
      '<span class="pony-chip-art">' + (unlocked
        ? A.render({ ponyId: p.id, outfit: o, width: size || 88 })
        : '<span class="lock-q">?</span>') + '</span>' +
      '<span class="pony-chip-name">' + p.name + '</span>' +
      '<span class="pony-chip-race">' + p.race + '</span>' +
      '</button>';
  }

  function rewardNames(t) {
    return (t.rewards || []).map(function (r) {
      if (r.indexOf('pony:') === 0) {
        var p = D.pony(r.slice(5));
        return p ? '小马 ' + p.name : r;
      }
      var i = D.item(r);
      return i ? i.name : r;
    });
  }

  /* ---------- 妆造台 ---------- */

  function renderStudio() {
    var st = S.state();
    var p = D.pony(st.activePony);

    el('#panel').innerHTML = '' +
      '<div class="studio">' +
      '  <div class="stage">' +
      '    <div class="stage-card ' + (st.outfit.bg || '') + '">' +
      A.render({ ponyId: st.activePony, outfit: st.outfit, width: 320 }) +
      '      <div class="stage-name">' + p.name + '<span>' + p.race + '</span></div>' +
      '      <div class="stage-desc">' + p.desc + '</div>' +
      '    </div>' +
      '    <div class="stage-actions">' +
      '      <button class="btn ghost" data-act="random">随机搭配</button>' +
      '      <button class="btn ghost" data-act="clear">全部脱下</button>' +
      '      <button class="btn ghost" data-act="save-look">保存造型</button>' +
      '      <button class="btn ghost" data-act="download">下载形象</button>' +
      '    </div>' +
      '    <div class="looks">' + (st.looks.length
        ? st.looks.map(function (l, i) {
            return '<span class="look-chip"><button class="look-load" data-look="' + i + '" type="button">' + esc(l.name) + '</button>' +
              '<button class="look-del" data-lookdel="' + i + '" type="button" title="删除">×</button></span>';
          }).join('')
        : '<span class="muted">还没有保存的造型</span>') +
      '    </div>' +
      '  </div>' +

      '  <div class="wardrobe">' +
      '    <h3 class="sec-title">选择小伙伴</h3>' +
      '    <div class="pony-list">' + D.PONIES.map(function (pp) {
            return ponyChipHTML(pp, pp.id === st.activePony, S.hasPony(pp.id), 84);
          }).join('') + '</div>' +
      '    <h3 class="sec-title">装扮衣柜</h3>' +
      '    <div class="cat-tabs">' +
      '      <button class="cat' + (catFilter === 'all' ? ' on' : '') + '" data-cat="all" type="button">全部</button>' +
      D.CATS.map(function (c) {
        return '<button class="cat' + (catFilter === c.id ? ' on' : '') + '" data-cat="' + c.id + '" type="button">' + c.name + '</button>';
      }).join('') +
      '    </div>' +
      '    <div class="item-tip" id="itemTip"></div>' +
      '    <div class="item-grid">' + itemCells() + '</div>' +
      '  </div>' +
      '</div>';
  }

  function itemCells() {
    var st = S.state();
    if (catFilter === 'all') {
      return D.CATS.map(function (c) {
        return '<div class="item-group"><h4>' + c.name + '</h4><div class="item-row">' +
          groupCells(c.id) + '</div></div>';
      }).join('');
    }
    return '<div class="item-row">' + groupCells(catFilter) + '</div>';
  }

  function groupCells(slot) {
    var st = S.state();
    if (slot === 'bg') return D.bySlot('bg').map(bgCellHTML).join('');
    return D.bySlot(slot).map(function (it) {
      var owned = S.hasItem(it.id);
      var on = st.outfit[it.slot] === it.id;
      return '<button class="item-cell' + (owned ? '' : ' locked') + (on ? ' on' : '') +
        '" data-item="' + it.id + '" type="button">' +
        '<span class="cell-art">' + (owned ? previewHTML(it) : '<span class="lock-q">?</span>') + '</span>' +
        '<span class="cell-name">' + it.name + '</span>' +
        (owned ? '' : '<span class="cell-lock">未解锁</span>') +
        '</button>';
    }).join('');
  }

  function bgCellHTML(it) {
    var st = S.state();
    var owned = S.hasItem(it.id);
    var on = st.outfit.bg === it.id;
    return '<button class="item-cell bg-cell' + (owned ? '' : ' locked') + (on ? ' on' : '') +
      '" data-item="' + it.id + '" type="button">' +
      '<span class="cell-bg ' + it.id + '"></span>' +
      '<span class="cell-name">' + it.name + '</span>' +
      (owned ? '' : '<span class="cell-lock">未解锁</span>') +
      '</button>';
  }

  /* ---------- 任务中心 ---------- */

  function renderTasks() {
    var list = S.allTasks().filter(function (t) {
      var s = S.taskStatus(t.id);
      if (taskFilter === 'all') return true;
      if (taskFilter === 'doing') return s === 'todo' || s === 'rejected';
      return s === taskFilter;
    });

    var st = S.state();
    el('#panel').innerHTML = '' +
      '<div class="tasks">' +
      '  <div class="task-head">' +
      '    <div>' +
      '      <h3 class="sec-title">任务清单</h3>' +
      '      <p class="muted">完成任务后点「我完成啦」，家长审核通过就能领奖励。</p>' +
      '    </div>' +
      '    <div class="chips">' +
      ['all:全部', 'doing:待完成', 'pending:待审核', 'approved:已完成'].map(function (x) {
        var k = x.split(':')[0], n = x.split(':')[1];
        return '<button class="chip' + (taskFilter === k ? ' on' : '') + '" data-tfilter="' + k + '" type="button">' + n + '</button>';
      }).join('') +
      '    </div>' +
      '  </div>' +
      '  <div class="task-list">' + (list.length ? list.map(taskCardHTML).join('') :
        '<div class="empty">这里暂时没有任务～</div>') + '</div>' +
      '</div>';

    if (focusTask) {
      var node = el('[data-task="' + focusTask + '"]');
      if (node) {
        node.classList.add('focus');
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(function () { focusTask = null; }, 50);
    }
  }

  function taskCardHTML(t) {
    var status = S.taskStatus(t.id);
    var rec = S.state().tasks[t.id] || {};
    var rw = rewardNames(t).map(function (n) { return '<span class="rw">' + esc(n) + '</span>'; }).join('');
    var foot = '';
    if (status === 'todo') {
      foot = '<button class="btn primary sm" data-submit="' + t.id + '" type="button">我完成啦</button>';
    } else if (status === 'pending') {
      foot = '<button class="btn ghost sm" data-cancel="' + t.id + '" type="button">撤回一下</button>';
    } else if (status === 'rejected') {
      foot = '<button class="btn primary sm" data-submit="' + t.id + '" type="button">再做一次</button>';
    } else {
      foot = '<span class="ok">奖励已到手</span>';
    }
    return '<div class="task-card ' + status + (focusTask === t.id ? ' focus' : '') + '" data-task="' + t.id + '">' +
      '<div class="task-top">' +
      '  <span class="tag">' + esc(t.tag || '任务') + '</span>' +
      '  <span class="badge ' + status + '">' + STATUS_TEXT[status] + '</span>' +
      '</div>' +
      '<h4 class="task-title">' + esc(t.title) + '</h4>' +
      '<p class="task-desc">' + esc(t.desc) + '</p>' +
      (rec.note ? '<p class="task-note">我的留言：' + esc(rec.note) + '</p>' : '') +
      (rec.reason ? '<p class="task-reason">家长说：' + esc(rec.reason) + '</p>' : '') +
      '<div class="task-rewards">' + rw + '</div>' +
      '<div class="task-foot">' + foot + '</div>' +
      '</div>';
  }

  /* ---------- 图鉴 ---------- */

  function renderGallery() {
    var st = S.state();
    var s = S.stats();
    el('#panel').innerHTML = '' +
      '<div class="gallery">' +
      '  <div class="progress-box">' +
      '    <div class="pg"><span>饰品收集</span><b>' + s.items + ' / ' + s.itemsTotal + '</b></div>' +
      '    <div class="bar"><i style="width:' + (s.items / s.itemsTotal * 100).toFixed(1) + '%"></i></div>' +
      '    <div class="pg"><span>小马伙伴</span><b>' + s.ponies + ' / ' + s.poniesTotal + '</b></div>' +
      '    <div class="bar"><i style="width:' + (s.ponies / s.poniesTotal * 100).toFixed(1) + '%"></i></div>' +
      '    <div class="pg"><span>任务完成</span><b>' + s.approved + ' / ' + s.total + '</b></div>' +
      '    <div class="bar"><i style="width:' + (s.approved / Math.max(1, s.total) * 100).toFixed(1) + '%"></i></div>' +
      '  </div>' +
      '  <h3 class="sec-title">小马伙伴</h3>' +
      '  <div class="pony-list big">' + D.PONIES.map(function (p) {
          return ponyChipHTML(p, false, S.hasPony(p.id), 108);
        }).join('') + '</div>' +
      D.CATS.map(function (c) {
        return '<h3 class="sec-title">' + c.name + '<em>' +
          D.bySlot(c.id).filter(function (i) { return S.hasItem(i.id); }).length + '/' + D.bySlot(c.id).length +
          '</em></h3><div class="mini-grid">' + D.bySlot(c.id).map(miniCell).join('') + '</div>';
      }).join('') +
      '</div>';
  }

  function miniCell(it) {
    var owned = S.hasItem(it.id);
    if (it.slot === 'bg') {
      return '<div class="mini ' + (owned ? '' : 'locked') + '"><span class="cell-bg ' + it.id + '"></span>' +
        '<span>' + it.name + '</span></div>';
    }
    return '<div class="mini ' + (owned ? '' : 'locked') + '">' +
      (owned ? '<span class="mini-art">' + previewHTML(it) + '</span>' : '<span class="lock-q">?</span>') +
      '<span>' + it.name + '</span></div>';
  }

  /* ---------- 交互 ---------- */

  function equip(it) {
    var st = S.state();
    if (!S.hasItem(it.id)) return openLockedModal(it);
    if (it.slot === 'bg') {
      st.outfit.bg = it.id;
    } else {
      st.outfit[it.slot] = st.outfit[it.slot] === it.id ? null : it.id;
    }
    S.save();
    render();
  }

  function openLockedModal(it) {
    var t = D.taskOf(it.id) || D.taskOf('pony:' + it.id);
    var body;
    if (t) {
      body = '<h3>还差一步就能拿到啦</h3>' +
        '<div class="lock-task">' +
        '  <span class="tag">' + esc(t.tag || '任务') + '</span>' +
        '  <h4>' + esc(t.title) + '</h4>' +
        '  <p>' + esc(t.desc) + '</p>' +
        '  <div class="task-rewards">' + rewardNames(t).map(function (n) { return '<span class="rw">' + esc(n) + '</span>'; }).join('') + '</div>' +
        '</div>' +
        '<p class="muted sm">完成后点「我完成啦」，等爸爸妈妈审核通过就会自动解锁。</p>' +
        '<div class="modal-actions">' +
        '  <button class="btn ghost" data-close type="button">知道啦</button>' +
        '  <button class="btn primary" data-gotask="' + t.id + '" type="button">去做这个任务</button>' +
        '</div>';
    } else {
      body = '<h3>这件还没有解锁</h3><p class="muted">请爸爸妈妈在管理端帮你解锁。</p>' +
        '<div class="modal-actions"><button class="btn primary" data-close type="button">好的</button></div>';
    }
    openModal(body);
  }

  function askSubmit(t) {
    openModal('<h3>' + esc(t.title) + '</h3>' +
      '<p class="muted">完成了就和爸爸妈妈说一声，写点什么让他们放心吧。</p>' +
      '<textarea id="noteBox" class="ta" rows="3" placeholder="例如：今天我把《小马过河》读完了，还讲了结局给妈妈听。"></textarea>' +
      '<div class="modal-actions">' +
      '  <button class="btn ghost" data-close type="button">再等等</button>' +
      '  <button class="btn primary" data-dosubmit="' + t.id + '" type="button">提交给家长审核</button>' +
      '</div>');
  }

  function randomize() {
    var st = S.state();
    D.CATS.forEach(function (c) {
      if (c.id === 'bg') return;
      var pool = D.bySlot(c.id).filter(function (i) { return S.hasItem(i.id); });
      st.outfit[c.id] = pool.length && Math.random() < 0.65
        ? pool[Math.floor(Math.random() * pool.length)].id : null;
    });
    var bgs = D.bySlot('bg').filter(function (i) { return S.hasItem(i.id); });
    st.outfit.bg = bgs.length ? bgs[Math.floor(Math.random() * bgs.length)].id : st.outfit.bg;
    S.save();
    render();
    toast('换了一套新造型');
  }

  function downloadSVG() {
    var st = S.state();
    var svg = A.render({ ponyId: st.activePony, outfit: st.outfit, width: 520 })
      .replace('<g>', '<g>').replace('<g>', '<g>');
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pony-' + st.activePony + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('已保存到下载文件夹');
  }

  /* ---------- 事件 ---------- */

  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var hit = function (sel) {
        var n = t.closest ? t.closest(sel) : null;
        return n;
      };
      var n;

      if ((n = hit('[data-tab]'))) { tab = n.getAttribute('data-tab'); render(); return; }
      if ((n = hit('[data-cat]'))) { catFilter = n.getAttribute('data-cat'); render(); return; }
      if ((n = hit('[data-tfilter]'))) { taskFilter = n.getAttribute('data-tfilter'); render(); return; }
      if ((n = hit('[data-close]'))) { closeModal(); return; }

      if ((n = hit('[data-pony]'))) {
        var pid = n.getAttribute('data-pony');
        if (!S.hasPony(pid)) {
          var p = D.pony(pid);
          var tk = D.taskOf('pony:' + pid);
          openModal('<h3>' + p.name + '还没有来到小马谷</h3>' +
            '<p class="muted">' + esc(p.desc) + '</p>' +
            (tk ? '<p>完成这个任务就能请它回家：<b>' + esc(tk.title) + '</b></p>' +
                  '<div class="modal-actions"><button class="btn ghost" data-close type="button">知道啦</button>' +
                  '<button class="btn primary" data-gotask="' + tk.id + '" type="button">去看看任务</button></div>'
                : '<div class="modal-actions"><button class="btn primary" data-close type="button">好的</button></div>'));
          return;
        }
        S.state().activePony = pid;
        S.save();
        render();
        return;
      }

      if ((n = hit('[data-item]'))) {
        var it = D.item(n.getAttribute('data-item'));
        if (it) equip(it);
        return;
      }

      if ((n = hit('[data-submit]'))) {
        var tk2 = S.findTask(n.getAttribute('data-submit'));
        if (tk2) askSubmit(tk2);
        return;
      }
      if ((n = hit('[data-dosubmit]'))) {
        var id = n.getAttribute('data-dosubmit');
        var box = el('#noteBox');
        S.submitTask(id, box ? box.value.trim() : '');
        closeModal();
        toast('已提交，等爸爸妈妈审核');
        render();
        return;
      }
      if ((n = hit('[data-cancel]'))) {
        S.cancelSubmit(n.getAttribute('data-cancel'));
        toast('已撤回');
        render();
        return;
      }
      if ((n = hit('[data-gotask]'))) {
        focusTask = n.getAttribute('data-gotask');
        closeModal();
        tab = 'tasks';
        taskFilter = 'all';
        render();
        return;
      }
      if ((n = hit('[data-act]'))) {
        var act = n.getAttribute('data-act');
        if (act === 'random') return randomize();
        if (act === 'clear') {
          D.CATS.forEach(function (c) { if (c.id !== 'bg') S.state().outfit[c.id] = null; });
          S.save(); render(); return;
        }
        if (act === 'save-look') {
          var name = prompt('给这套造型起个名字吧', '造型 ' + (S.state().looks.length + 1));
          if (name) { S.saveLook(name.trim()); render(); toast('造型已保存'); }
          return;
        }
        if (act === 'download') return downloadSVG();
      }
      if ((n = hit('[data-look]'))) {
        S.loadLook(parseInt(n.getAttribute('data-look'), 10));
        toast('造型已切换');
        render();
        return;
      }
      if ((n = hit('[data-lookdel]'))) {
        S.removeLook(parseInt(n.getAttribute('data-lookdel'), 10));
        render();
        return;
      }
      if ((n = hit('[data-reload]'))) { render(); return; }
    });
  }

  /* ---------- 主渲染 ---------- */

  function renderNav() {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === tab);
    });
  }

  function render() {
    renderNav();
    if (tab === 'studio') renderStudio();
    else if (tab === 'tasks') renderTasks();
    else renderGallery();
    var st = S.state();
    var badge = el('#pendingBadge');
    if (badge) {
      var n = S.stats().pending;
      badge.textContent = n ? String(n) : '';
      badge.style.display = n ? '' : 'none';
    }
    var nameNode = el('#playerName');
    if (nameNode) nameNode.textContent = st.player;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!S.ok()) {
      var warn = document.createElement('div');
      warn.className = 'warnbar';
      warn.innerHTML = '当前环境无法写入本地存档（可能是 Safari 直接双击打开文件导致）。' +
        '请在项目根目录执行 <code>python3 -m http.server 8000</code> 后访问 <code>http://localhost:8000</code>。';
      document.body.insertBefore(warn, document.body.firstChild);
    }
    bind();
    render();
    S.onChange(function (_, external) { if (external) render(); });
  });
})();
