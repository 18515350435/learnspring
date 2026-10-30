/**
 * 家长管理端：审核任务、管理解锁、自定义任务、数据维护
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store;
  var tab = 'review';
  var unlockedUI = false;

  var STATUS_TEXT = { todo: '未开始', pending: '待审核', approved: '已通过', rejected: '已驳回' };

  function el(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function time(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : n; }
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function rewardNames(t) {
    return (t.rewards || []).map(function (r) {
      if (r.indexOf('pony:') === 0) {
        var p = D.pony(r.slice(5));
        return '小马 · ' + (p ? p.name : r.slice(5));
      }
      var i = D.item(r);
      return i ? i.name : r;
    });
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

  /* ---------- 页面 ---------- */

  function renderReview() {
    var list = S.allTasks().filter(function (t) { return S.taskStatus(t.id) === 'pending'; });
    list.sort(function (a, b) { return (S.state().tasks[b.id].submitAt || 0) - (S.state().tasks[a.id].submitAt || 0); });

    el('#adminPanel').innerHTML = '' +
      '<div class="adm-head"><h2 class="sec-title">待审核 <em>' + list.length + '</em></h2>' +
      '<p class="muted">审核通过后，对应的饰品或小马会立刻出现在孩子的衣柜里。</p></div>' +
      (list.length ? '<div class="rev-list">' + list.map(function (t) {
        var rec = S.state().tasks[t.id] || {};
        return '<div class="rev-card">' +
          '<div class="rev-main">' +
          '  <span class="tag">' + esc(t.tag || '任务') + '</span>' +
          '  <h4>' + esc(t.title) + '</h4>' +
          '  <p class="rev-desc">' + esc(t.desc) + '</p>' +
          (rec.note ? '<p class="rev-note">孩子说：' + esc(rec.note) + '</p>' : '<p class="rev-note muted">孩子没有留言</p>') +
          '  <p class="rev-time">提交于 ' + time(rec.submitAt) + '</p>' +
          '</div>' +
          '<div class="rev-side">' +
          '  <div class="rev-rw">' + rewardNames(t).map(function (n) { return '<span class="rw">' + esc(n) + '</span>'; }).join('') + '</div>' +
          '  <button class="btn primary sm" data-approve="' + t.id + '" type="button">通过</button>' +
          '  <button class="btn danger sm" data-reject="' + t.id + '" type="button">驳回</button>' +
          '</div>' +
          '</div>';
      }).join('') + '</div>' : '<div class="empty">暂时没有需要审核的任务，休息一下吧。</div>');
  }

  function renderAllTasks() {
    var list = S.allTasks();
    el('#adminPanel').innerHTML = '' +
      '<div class="adm-head"><h2 class="sec-title">任务总览 <em>' + list.length + '</em></h2>' +
      '<p class="muted">可以直接代孩子通过，或者把已通过的任务重置回未开始。</p></div>' +
      '<div class="table">' +
      '<div class="tr head"><span>任务</span><span>奖励</span><span>状态</span><span>操作</span></div>' +
      list.map(function (t) {
        var s = S.taskStatus(t.id);
        return '<div class="tr">' +
          '<span class="tname">' + esc(t.title) + '<i>' + esc(t.tag || '') + '</i></span>' +
          '<span class="trw">' + rewardNames(t).map(function (n) { return esc(n); }).join('、') + '</span>' +
          '<span><span class="badge ' + s + '">' + STATUS_TEXT[s] + '</span></span>' +
          '<span class="tops">' +
          (s !== 'approved' ? '<button class="btn primary xs" data-approve="' + t.id + '" type="button">通过</button>' : '') +
          (s !== 'todo' ? '<button class="btn ghost xs" data-reopen="' + t.id + '" type="button">重置</button>' : '') +
          (t.custom ? '<button class="btn danger xs" data-delcustom="' + t.id + '" type="button">删除</button>' : '') +
          '</span>' +
          '</div>';
      }).join('') +
      '</div>';
  }

  function renderManage() {
    var st = S.state();
    el('#adminPanel').innerHTML = '' +
      '<div class="adm-head"><h2 class="sec-title">解锁管理</h2>' +
      '<p class="muted">除了做任务，也可以手动给孩子打赏或收回。</p></div>' +
      '<h3 class="sec-title">小马伙伴</h3>' +
      '<div class="manage-grid">' + D.PONIES.map(function (p) {
        var has = S.hasPony(p.id);
        return '<div class="mg ' + (has ? 'on' : '') + '">' +
          '<span class="mg-art">' + (has ? '<svg viewBox="0 0 260 300" width="72">' +
            window.Avatar.render({ ponyId: p.id, outfit: {}, width: 72 }).replace(/^<svg[^>]*>/, '') : '<span class="lock-q">?</span>') + '</span>' +
          '<span class="mg-name">' + p.name + '</span>' +
          '<button class="btn ' + (has ? 'ghost' : 'primary') + ' xs" data-ponylock="' + p.id + '" data-to="' + (has ? 0 : 1) + '" type="button">' +
          (has ? '收回' : '解锁') + '</button>' +
          '</div>';
      }).join('') + '</div>' +
      D.CATS.map(function (c) {
        return '<h3 class="sec-title">' + c.name + '</h3><div class="manage-grid">' +
          D.bySlot(c.id).map(function (i) {
            var has = S.hasItem(i.id);
            return '<div class="mg ' + (has ? 'on' : '') + '">' +
              '<span class="mg-art ' + (i.slot === 'bg' ? 'cell-bg ' + i.id : '') + '">' +
              (i.slot === 'bg' ? '' : (has ? '<svg viewBox="0 0 260 300" width="72">' +
                window.Avatar.render({ ponyId: st.activePony, outfit: (function () { var o = {}; o[i.slot] = i.id; return o; })(), width: 72 }).replace(/^<svg[^>]*>/, '') : '<span class="lock-q">?</span>')) +
              '</span>' +
              '<span class="mg-name">' + i.name + '</span>' +
              '<button class="btn ' + (has ? 'ghost' : 'primary') + ' xs" data-itemlock="' + i.id + '" data-to="' + (has ? 0 : 1) + '" type="button">' +
              (has ? '收回' : '解锁') + '</button>' +
              '</div>';
          }).join('') + '</div>';
      }).join('');
  }

  function renderData() {
    var st = S.state();
    var s = S.stats();
    el('#adminPanel').innerHTML = '' +
      '<div class="adm-head"><h2 class="sec-title">数据与设置</h2></div>' +
      '<div class="form-row">' +
      '  <label>孩子的名字</label>' +
      '  <input id="nameInput" class="ipt" value="' + esc(st.player) + '" maxlength="12">' +
      '  <button class="btn primary sm" id="saveName" type="button">保存</button>' +
      '</div>' +
      '<div class="form-row">' +
      '  <label>管理端密码</label>' +
      '  <input id="pinInput" class="ipt" value="' + esc(st.pin) + '" maxlength="8" inputmode="numeric">' +
      '  <button class="btn primary sm" id="savePin" type="button">保存</button>' +
      '</div>' +
      '<h3 class="sec-title">统计</h3>' +
      '<div class="stat-grid">' +
      [['待完成', s.todo], ['待审核', s.pending], ['已通过', s.approved], ['已驳回', s.rejected],
       ['饰品', s.items + '/' + s.itemsTotal], ['小马', s.ponies + '/' + s.poniesTotal]].map(function (x) {
        return '<div class="stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>';
      }).join('') +
      '</div>' +
      '<h3 class="sec-title">自定义任务</h3>' +
      (st.customTasks.length ? '<div class="table">' + st.customTasks.map(function (t) {
        return '<div class="tr">' +
          '<span class="tname">' + esc(t.title) + '<i>自定义</i></span>' +
          '<span class="trw">' + rewardNames(t).map(function (n) { return esc(n); }).join('、') + '</span>' +
          '<span><span class="badge ' + S.taskStatus(t.id) + '">' + STATUS_TEXT[S.taskStatus(t.id)] + '</span></span>' +
          '<span class="tops"><button class="btn danger xs" data-delcustom="' + t.id + '" type="button">删除</button></span>' +
          '</div>';
      }).join('') + '</div>' : '<p class="muted">还没有自定义任务。</p>') +
      '<div class="form-row"><button class="btn primary sm" id="newTask" type="button">新增自定义任务</button></div>' +
      '<h3 class="sec-title">数据维护</h3>' +
      '<div class="form-row wrap">' +
      '  <button class="btn ghost sm" id="exportBtn" type="button">导出存档</button>' +
      '  <button class="btn ghost sm" id="importBtn" type="button">导入存档</button>' +
      '  <button class="btn danger sm" id="resetBtn" type="button">恢复出厂</button>' +
      '</div>' +
      '<textarea id="ioBox" class="ta mono" rows="4" placeholder="导出的存档会显示在这里，也可以把存档文本粘贴进来再点导入。"></textarea>' +
      '<h3 class="sec-title">最近操作</h3>' +
      '<div class="log">' + (st.log.length ? st.log.slice(0, 12).map(function (l) {
        return '<div class="log-row"><span class="log-act">' + esc(l.action) + '</span>' +
          '<span class="log-detail">' + esc(l.detail) + '</span>' +
          '<span class="log-time">' + time(l.at) + '</span></div>';
      }).join('') : '<p class="muted">暂无记录</p>') + '</div>';
  }

  /* ---------- 自定义任务弹层 ---------- */

  function openNewTask() {
    var groups = D.CATS.map(function (c) {
      return '<div class="rw-group"><h5>' + c.name + '</h5>' + D.bySlot(c.id).map(function (i) {
        return '<label class="ck"><input type="checkbox" value="' + i.id + '"><span>' + i.name + '</span></label>';
      }).join('') + '</div>';
    }).join('');
    var ponies = '<div class="rw-group"><h5>小马伙伴</h5>' + D.PONIES.filter(function (p) { return !p.initial; }).map(function (p) {
      return '<label class="ck"><input type="checkbox" value="pony:' + p.id + '"><span>' + p.name + '</span></label>';
    }).join('') + '</div>';

    openModal('<h3>新增自定义任务</h3>' +
      '<div class="form-col">' +
      '  <input id="ntTitle" class="ipt" placeholder="任务名称，例如：整理自己的玩具柜">' +
      '  <input id="ntDesc" class="ipt" placeholder="任务要求说明（可选）">' +
      '  <p class="muted sm">勾选完成后要发放的奖励：</p>' +
      '  <div class="rw-picker">' + groups + ponies + '</div>' +
      '</div>' +
      '<div class="modal-actions">' +
      '  <button class="btn ghost" data-close type="button">取消</button>' +
      '  <button class="btn primary" id="doNewTask" type="button">创建</button>' +
      '</div>');
  }

  /* ---------- 事件 ---------- */

  function bind() {
    document.addEventListener('click', function (e) {
      var n, t = e.target;
      function hit(sel) { return t.closest ? t.closest(sel) : null; }

      if ((n = hit('[data-atab]'))) { tab = n.getAttribute('data-atab'); render(); return; }
      if ((n = hit('[data-close]'))) { closeModal(); return; }

      if ((n = hit('[data-approve]'))) {
        S.approve(n.getAttribute('data-approve'));
        toast('已通过，奖励已发放');
        render();
        return;
      }
      if ((n = hit('[data-reject]'))) {
        var id = n.getAttribute('data-reject');
        openModal('<h3>驳回原因</h3>' +
          '<p class="muted">写一句话，孩子能在任务卡上看到。</p>' +
          '<textarea id="reasonBox" class="ta" rows="3" placeholder="例如：这次只练了 10 分钟，明天补上就算完成。"></textarea>' +
          '<div class="modal-actions">' +
          '  <button class="btn ghost" data-close type="button">取消</button>' +
          '  <button class="btn danger" id="doReject" data-id="' + id + '" type="button">确认驳回</button>' +
          '</div>');
        return;
      }
      if ((n = hit('#doReject'))) {
        var rb = el('#reasonBox');
        S.reject(n.getAttribute('data-id'), rb ? rb.value.trim() : '这次还没有达到要求，再试一次吧');
        closeModal();
        toast('已驳回');
        render();
        return;
      }
      if ((n = hit('[data-reopen]'))) {
        S.reopen(n.getAttribute('data-reopen'));
        toast('已重置为未开始');
        render();
        return;
      }
      if ((n = hit('[data-delcustom]'))) {
        if (confirm('确定删除这个自定义任务吗？')) {
          S.removeCustomTask(n.getAttribute('data-delcustom'));
          render();
        }
        return;
      }
      if ((n = hit('[data-ponylock]'))) {
        S.setPonyLock(n.getAttribute('data-ponylock'), n.getAttribute('data-to') === '1');
        render();
        return;
      }
      if ((n = hit('[data-itemlock]'))) {
        S.setItemLock(n.getAttribute('data-itemlock'), n.getAttribute('data-to') === '1');
        render();
        return;
      }

      if (n && n.id === 'newTask') { openNewTask(); return; }
      if (n && n.id === 'doNewTask') {
        var ttl = el('#ntTitle'), dsc = el('#ntDesc');
        var rw = Array.prototype.slice.call(document.querySelectorAll('.rw-picker input:checked')).map(function (i) { return i.value; });
        if (!ttl || !ttl.value.trim()) { toast('请先填写任务名称'); return; }
        S.addCustomTask(ttl.value.trim(), dsc ? dsc.value.trim() : '', rw);
        closeModal();
        toast('自定义任务已创建');
        render();
        return;
      }
      if (n && n.id === 'saveName') {
        var ni = el('#nameInput');
        if (ni) { S.state().player = ni.value.trim() || '小朋友'; S.save(); toast('已保存'); }
        return;
      }
      if (n && n.id === 'savePin') {
        var pi = el('#pinInput');
        if (pi) { S.state().pin = pi.value.trim() || '1234'; S.save(); toast('密码已更新'); }
        return;
      }
      if (n && n.id === 'exportBtn') {
        var box = el('#ioBox');
        if (box) { box.value = S.exportJSON(); box.select(); toast('存档已生成，可直接复制保存'); }
        return;
      }
      if (n && n.id === 'importBtn') {
        var box2 = el('#ioBox');
        if (box2 && box2.value.trim()) {
          if (S.importJSON(box2.value)) { toast('导入成功'); render(); }
          else toast('存档格式不对，导入失败');
        }
        return;
      }
      if (n && n.id === 'resetBtn') {
        if (confirm('会清空所有任务和解锁记录，确定吗？')) {
          S.resetAll();
          toast('已恢复出厂设置');
          render();
        }
        return;
      }
      if ((n = hit('[data-lockbtn]'))) { checkPin(); return; }
    });
  }

  function checkPin() {
    var v = el('#pinField').value.trim();
    if (v === S.state().pin) {
      unlockedUI = true;
      el('#lockScreen').style.display = 'none';
      el('#adminBody').style.display = '';
      render();
    } else {
      var err = el('#pinErr');
      if (err) err.textContent = '密码不对，再想想～';
    }
  }

  function render() {
    if (!unlockedUI) return;
    document.querySelectorAll('[data-atab]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-atab') === tab);
    });
    if (tab === 'review') renderReview();
    else if (tab === 'tasks') renderAllTasks();
    else if (tab === 'manage') renderManage();
    else renderData();
    var badge = el('#adminBadge');
    if (badge) {
      var n = S.stats().pending;
      badge.textContent = n ? String(n) : '';
      badge.style.display = n ? '' : 'none';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    var btn = el('#pinBtn');
    if (btn) btn.addEventListener('click', checkPin);
    var f = el('#pinField');
    if (f) f.addEventListener('keydown', function (e) { if (e.key === 'Enter') checkPin(); });
    S.onChange(function (_, external) { if (external && unlockedUI) render(); });
  });
})();
