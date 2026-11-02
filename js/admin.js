/**
 * 家长管理端：审核任务、管理解锁、自定义任务、数据维护
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store;
  var tab = 'review';
  var unlockedUI = false;
  /* 锁屏流程：quiz0（没设密码，先答题）→ setup → 进入；已设密码：pin → quiz → 进入 */
  var lockStage = S.pinReady() ? 'pin' : 'quiz0';
  var quiz = null;

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
          (t.custom
            ? '<button class="btn ghost xs" data-editcustom="' + t.id + '" type="button">编辑</button>' +
              '<button class="btn danger xs" data-delcustom="' + t.id + '" type="button">删除</button>'
            : '<button class="btn ghost xs" data-clonetask="' + t.id + '" type="button">改成我的</button>') +
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
      '  <input id="pinInput" class="ipt" type="password" maxlength="8" inputmode="numeric" placeholder="4～8 位数字，留空表示不修改">' +
      '  <button class="btn primary sm" id="savePin" type="button">保存</button>' +
      '</div>' +
      '<div class="form-row">' +
      '  <label>孩子年级</label>' +
      '  <select id="gradeSelect" class="ipt">' + gradeOptions(st.grade) + '</select>' +
      '  <button class="btn primary sm" id="saveGrade" type="button">保存</button>' +
      '</div>' +
      '<p class="muted sm">年级决定进管理端那道口算题的难度：1-2 年级表内乘除，3-4 年级两位数×一位数，5-6 年级两位数×两位数。</p>' +
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
          '<span class="tname">' + esc(t.title) + '<i>' + esc(t.tag || '自定义') + '</i>' +
            (t.desc ? '<em class="tdesc">' + esc(t.desc) + '</em>' : '') + '</span>' +
          '<span class="trw">' + rewardNames(t).map(function (n) { return esc(n); }).join('、') +
            '<em class="tdesc">+' + ((t.star || 1) * 10) + '⭐</em></span>' +
          '<span><span class="badge ' + S.taskStatus(t.id) + '">' + STATUS_TEXT[S.taskStatus(t.id)] + '</span></span>' +
          '<span class="tops">' +
            '<button class="btn ghost xs" data-editcustom="' + t.id + '" type="button">编辑</button>' +
            '<button class="btn danger xs" data-delcustom="' + t.id + '" type="button">删除</button>' +
          '</span>' +
          '</div>';
      }).join('') + '</div>' : '<p class="muted">还没有自定义任务。可以点下面新增，比如「自己叠被子」「练琴 20 分钟」。</p>') +
      '<div class="form-row"><button class="btn primary sm" id="newTask" type="button">新增自定义任务</button>' +
      '<span class="muted sm">自定义任务可以反复修改名称、说明、奖励和星星币数量</span></div>' +
      '<h3 class="sec-title">数据维护</h3>' +
      '<div class="form-row wrap">' +
      '  <button class="btn ghost sm" id="exportBtn" type="button">导出存档</button>' +
      '  <button class="btn ghost sm" id="importBtn" type="button">导入存档</button>' +
      '  <button class="btn danger sm" id="resetBtn" type="button">恢复出厂</button>' +
      '</div>' +
      '<textarea id="ioBox" class="ta mono" rows="4" placeholder="导出的存档会显示在这里，也可以把存档文本粘贴进来再点导入。"></textarea>' +
      cloudSection() +
      '<h3 class="sec-title">最近操作</h3>' +
      '<div class="log">' + (st.log.length ? st.log.slice(0, 12).map(function (l) {
        return '<div class="log-row"><span class="log-act">' + esc(l.action) + '</span>' +
          '<span class="log-detail">' + esc(l.detail) + '</span>' +
          '<span class="log-time">' + time(l.at) + '</span></div>';
      }).join('') : '<p class="muted">暂无记录</p>') + '</div>';
  }

  /* ---------- 云同步（Supabase） ---------- */

  function cloudSection() {
    var C = window.Cloud;
    if (!C) return '';
    var cfg = C.cfg();
    var info = C.info();
    var stateText = {
      off: '未开启',
      ok: info.msg || '已同步',
      syncing: info.msg || '同步中…',
      err: info.msg || '同步失败'
    }[info.state] || '';
    var stateCls = info.state === 'err' ? 'cloud-err' : (info.state === 'ok' ? 'cloud-ok' : '');

    if (!cfg) {
      return '<h3 class="sec-title">云同步（Supabase）</h3>' +
        '<p class="muted">换手机 / 换电脑 / 清了浏览器缓存，存档也能找回来。配置一次即可，详见 README 的「云同步」章节。</p>' +
        '<div class="form-col cloud-form">' +
        '  <input id="clUrl" class="ipt" placeholder="项目 URL，形如 https://xxxxx.supabase.co">' +
        '  <input id="clKey" class="ipt" placeholder="anon key（Settings → API 里复制）">' +
        '  <div class="form-row">' +
        '    <input id="clCode" class="ipt" placeholder="同步码（6~16 位字母数字）">' +
        '    <button class="btn ghost sm" id="clGen" type="button">帮我生成</button>' +
        '  </div>' +
        '  <div class="form-row wrap">' +
        '    <button class="btn primary sm" id="clSave" type="button">保存并开启</button>' +
        '  </div>' +
        '</div>';
    }
    return '<h3 class="sec-title">云同步（Supabase）· 已开启</h3>' +
      '<p class="muted">同步码：<b class="cloud-code">' + esc(cfg.code) + '</b>（记到备忘录里，新设备上输入同一个码即可恢复）</p>' +
      '<p class="cloud-state ' + stateCls + '">状态：' + esc(stateText) + '</p>' +
      '<div class="form-row wrap">' +
      '  <button class="btn ghost sm" id="clPush" type="button">立即上传</button>' +
      '  <button class="btn ghost sm" id="clPull" type="button">从云端恢复</button>' +
      '  <button class="btn danger sm" id="clOff" type="button">关闭云同步</button>' +
      '</div>' +
      '<details><summary class="muted sm">修改配置</summary>' +
      '<div class="form-col cloud-form">' +
      '  <input id="clUrl" class="ipt" placeholder="项目 URL" value="' + esc(cfg.url) + '">' +
      '  <input id="clKey" class="ipt" placeholder="anon key（留空表示不修改）">' +
      '  <div class="form-row">' +
      '    <input id="clCode" class="ipt" value="' + esc(cfg.code) + '">' +
      '  </div>' +
      '  <div class="form-row wrap">' +
      '    <button class="btn primary sm" id="clSave" type="button">保存修改</button>' +
      '  </div>' +
      '</div></details>';
  }

  function cloudRefresh() {
    /* 只刷新状态行，避免整页重渲染打断输入 */
    var box = el('.cloud-state');
    if (!box || !window.Cloud) return;
    var info = window.Cloud.info();
    var stateText = { off: '未开启', ok: info.msg || '已同步', syncing: info.msg || '同步中…', err: info.msg || '同步失败' }[info.state] || '';
    box.className = 'cloud-state ' + (info.state === 'err' ? 'cloud-err' : (info.state === 'ok' ? 'cloud-ok' : ''));
    box.textContent = '状态：' + stateText;
  }

  /* ---------- 破解开关 ---------- */

  function renderCheatBtn() {
    var b = el('#cheatBtn');
    if (!b) return;
    var on = S.cheatOn();
    b.classList.toggle('on', on);
    b.textContent = on ? '🔓 破解中' : '🔒 破解开关';
    b.title = on ? '点击关闭破解，恢复到开启前的解锁状态' : '点击解锁全部小马和饰品';
  }

  function toggleCheat() {
    var on = !S.cheatOn();
    if (!on && !confirm('关闭破解后，会收回靠破解解锁的内容，恢复到开启破解前的状态。确定吗？')) return;
    S.setCheat(on);
    renderCheatBtn();
    toast(on ? '破解已开启：全部小马和饰品已解锁' : '破解已关闭，已恢复原状');
    if (unlockedUI) render();
  }

  /* ---------- 自定义任务弹层 ---------- */

  function rwPicked() {
    return Array.prototype.slice.call(document.querySelectorAll('.rw-picker input:checked')).map(function (i) { return i.value; });
  }

  function rwCount() {
    var b = el('#rwCount');
    if (b) b.textContent = rwPicked().length;
  }

  /* t 为空 = 新增；传入任务对象 = 修改 */
  function openTaskForm(t) {
    var edit = !!t;
    var picked = (t && t.rewards) ? t.rewards.slice() : [];
    var star = (t && t.star) ? t.star : 1;

    var groups = D.CATS.map(function (c) {
      return '<div class="rw-group"><h5>' + esc(c.name) + '</h5>' + D.bySlot(c.id).map(function (i) {
        return '<label class="ck"><input type="checkbox" value="' + i.id + '"' + (picked.indexOf(i.id) >= 0 ? ' checked' : '') + '><span>' + esc(i.name) + '</span></label>';
      }).join('') + '</div>';
    }).join('');
    var ponies = '<div class="rw-group"><h5>小马伙伴</h5>' + D.PONIES.filter(function (p) { return !p.initial; }).map(function (p) {
      var v = 'pony:' + p.id;
      return '<label class="ck"><input type="checkbox" value="' + v + '"' + (picked.indexOf(v) >= 0 ? ' checked' : '') + '><span>' + esc(p.name) + '</span></label>';
    }).join('') + '</div>';

    openModal('<h3>' + (edit ? '修改自定义任务' : '新增自定义任务') + '</h3>' +
      '<div class="form-col">' +
      '  <input type="hidden" id="ntId" value="' + (edit ? esc(t.id) : '') + '">' +
      '  <input id="ntTitle" class="ipt" maxlength="30" placeholder="任务名称，例如：整理自己的玩具柜" value="' + (edit ? esc(t.title) : '') + '">' +
      '  <input id="ntDesc" class="ipt" maxlength="60" placeholder="任务要求说明（可选）" value="' + (edit ? esc(t.desc || '') : '') + '">' +
      '  <label class="form-row"><span class="fr-label">完成后奖励星星币</span>' +
      '    <input id="ntStar" class="ipt sm-ipt" type="number" min="1" max="10" step="1" value="' + star + '">' +
      '    <span class="muted sm">× 10 = ' + '<b id="ntStarNum">' + (star * 10) + '</b>' + ' ⭐</span>' +
      '  </label>' +
      '  <div class="rw-bar">' +
      '    <p class="muted sm">勾选完成后要发放的奖励：</p>' +
      '    <span class="rw-tools"><span class="muted sm">已选 <b id="rwCount">' + picked.length + '</b> 项</span>' +
      '      <button class="btn ghost xs" id="rwClear" type="button">清空</button></span>' +
      '  </div>' +
      '  <div class="rw-picker">' + groups + ponies + '</div>' +
      '</div>' +
      '<div class="modal-actions">' +
      '  <button class="btn ghost" data-close type="button">取消</button>' +
      '  <button class="btn primary" id="doNewTask" type="button">' + (edit ? '保存修改' : '创建任务') + '</button>' +
      '</div>');
  }

  function openNewTask() { openTaskForm(null); }

  /* ---------- 事件 ---------- */

  function bind() {
    document.addEventListener('click', function (e) {
      var n, t = e.target;
      function hit(sel) { return t.closest ? t.closest(sel) : null; }

      if ((n = hit('[data-cheat]'))) { toggleCheat(); return; }
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
      if ((n = hit('[data-editcustom]'))) {
        var et = S.findTask(n.getAttribute('data-editcustom'));
        if (et) openTaskForm(et); else toast('这个任务已经不存在了');
        return;
      }
      if ((n = hit('[data-clonetask]'))) {
        var src = S.findTask(n.getAttribute('data-clonetask'));
        if (!src) { toast('任务不存在'); return; }
        var nid = S.addCustomTask(src.title, src.desc || '', (src.rewards || []).slice(), src.star || 1);
        var nt = S.findTask(nid);
        render();
        toast('已复制成你的自定义任务，接着改吧');
        if (nt) openTaskForm(nt);
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

      /* 下面这些按 id 命中，必须重新取一次：上面的 hit() 已经把 n 置空了 */
      if ((n = hit('#rwClear'))) {
        Array.prototype.slice.call(document.querySelectorAll('.rw-picker input')).forEach(function (i) { i.checked = false; });
        rwCount();
        return;
      }
      if ((n = hit('#newTask'))) { openNewTask(); return; }
      if ((n = hit('#doNewTask'))) {
        var ttl = el('#ntTitle'), dsc = el('#ntDesc'), tid = el('#ntId'), str = el('#ntStar');
        var rw = rwPicked();
        if (!ttl || !ttl.value.trim()) { toast('请先填写任务名称'); return; }
        var sstar = str ? parseInt(str.value, 10) : 1;
        if (isNaN(sstar) || sstar < 1) sstar = 1;
        if (sstar > 10) sstar = 10;
        var eid = tid && tid.value ? tid.value : '';
        if (eid) {
          if (!S.updateCustomTask(eid, ttl.value.trim(), dsc ? dsc.value.trim() : '', rw, sstar)) {
            toast('这个任务已经不存在了');
            return;
          }
          closeModal();
          toast('任务已更新');
          render();
          return;
        }
        S.addCustomTask(ttl.value.trim(), dsc ? dsc.value.trim() : '', rw, sstar);
        closeModal();
        toast('自定义任务已创建');
        render();
        return;
      }
      if ((n = hit('#saveName'))) {
        var ni = el('#nameInput');
        if (ni) { S.state().player = ni.value.trim() || '小朋友'; S.save(); toast('已保存'); }
        return;
      }
      if ((n = hit('#savePin'))) {
        var pi = el('#pinInput');
        if (!pi) return;
        var pv = pi.value.trim();
        if (!pv) { toast('没改密码'); return; }
        if (S.setPin(pv)) { pi.value = ''; toast('密码已更新'); }
        else toast('密码要 4～8 位数字');
        return;
      }
      if ((n = hit('#exportBtn'))) {
        var box = el('#ioBox');
        if (box) { box.value = S.exportJSON(); box.select(); toast('存档已生成，可直接复制保存'); }
        return;
      }
      if ((n = hit('#importBtn'))) {
        var box2 = el('#ioBox');
        if (box2 && box2.value.trim()) {
          if (S.importJSON(box2.value)) { toast('导入成功'); render(); }
          else toast('存档格式不对，导入失败');
        }
        return;
      }
      if ((n = hit('#resetBtn'))) {
        if (confirm('会清空所有任务和解锁记录，确定吗？')) {
          S.resetAll();
          toast('已恢复出厂设置');
          render();
        }
        return;
      }

      /* ---------- 云同步 ---------- */
      if ((n = hit('#clGen'))) {
        var gc = el('#clCode');
        if (gc) { gc.value = window.Cloud.newCode(); gc.focus(); }
        return;
      }
      if ((n = hit('#clSave'))) {
        var cu = el('#clUrl'), ck = el('#clKey'), cc = el('#clCode');
        var r = window.Cloud.setCfg(cu ? cu.value : '', ck ? ck.value.trim() : '', cc ? cc.value : '');
        if (r !== true) { toast(r); return; }
        toast('云同步已开启');
        render();
        /* 首次配置：云端有就恢复，没有就把当前存档推上去 */
        window.Cloud.pullNow().then(function (got) {
          if (!got) return window.Cloud.pushNow().catch(function () {});
        }).catch(function () { /* 状态行已显示错误 */ });
        return;
      }
      if ((n = hit('#clPush'))) {
        window.Cloud.pushNow().then(function () {
          toast('已上传到云端');
          cloudRefresh();
        }).catch(function (e) { toast('上传失败：' + (e.message || e)); cloudRefresh(); });
        return;
      }
      if ((n = hit('#clPull'))) {
        if (!confirm('用云端的存档覆盖本机吗？本机未同步的改动会丢失。')) return;
        window.Cloud.pullNow().then(function (got) {
          toast(got ? '已从云端恢复' : '云端没有存档');
          render();
        }).catch(function (e) { toast('恢复失败：' + (e.message || e)); cloudRefresh(); });
        return;
      }
      if ((n = hit('#clOff'))) {
        if (confirm('关闭后本机不再自动备份（云端数据保留）。确定吗？')) {
          window.Cloud.clearCfg();
          toast('云同步已关闭');
          render();
        }
        return;
      }
      if ((n = hit('#saveGrade'))) {
        var gsel = el('#gradeSelect');
        if (gsel && S.setGrade(gsel.value)) toast('已更新年级，口算题难度同步调整');
        return;
      }
    });

    /* 表单联动：勾选奖励实时计数、星星币实时换算 */
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.rw-picker')) rwCount();
      if (t && t.id === 'ntStar') syncStarNum();
    });
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.id === 'ntStar') syncStarNum();
    });
  }

  function syncStarNum() {
    var s = el('#ntStar'), b = el('#ntStarNum');
    if (!s || !b) return;
    var v = parseInt(s.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 10) v = 10;
    b.textContent = v * 10;
  }

  /* ---------- 口算题 ---------- */

  function rnd(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  /* 按年级出一道乘除题，除法保证整除 */
  function makeQuiz(grade) {
    var g = grade || S.grade();
    var a, b, hi1, hi2;
    if (g <= 2) { hi1 = [2, 9]; hi2 = [2, 9]; }        /* 表内乘除 */
    else if (g <= 4) { hi1 = [11, 39]; hi2 = [2, 9]; } /* 两位数 × 一位数 */
    else { hi1 = [11, 25]; hi2 = [11, 19]; }           /* 两位数 × 两位数 */
    a = rnd(hi1[0], hi1[1]);
    b = rnd(hi2[0], hi2[1]);
    if (Math.random() < 0.5) return { q: a + ' × ' + b + ' = ?', a: a * b };
    return { q: (a * b) + ' ÷ ' + b + ' = ?', a: a };
  }

  function gradeOptions(cur) {
    var names = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
    return names.map(function (n, i) {
      return '<option value="' + (i + 1) + '"' + (cur === i + 1 ? ' selected' : '') + '>' + n + '</option>';
    }).join('');
  }

  /* ---------- 锁屏 ---------- */

  function renderLock() {
    var box = el('#lockBox');
    if (!box) return;
    var h = '';
    if (lockStage === 'quiz0' || lockStage === 'quiz') {
      if (!quiz) quiz = makeQuiz(lockStage === 'quiz0' ? 3 : S.grade());
      h = '<h2>家长验证 · 口算</h2>' +
        '<p class="muted">' + (lockStage === 'quiz0'
          ? '还没设置过管理端密码。请先答对这道题，再设置密码。'
          : '答对这道题才能进入管理端（题目难度按孩子年级来）。') + '</p>' +
        '<p class="quiz-q" id="quizText">' + quiz.q + '</p>' +
        '<input id="lkInput" class="ipt big" type="text" inputmode="numeric" maxlength="6" placeholder="答案" autocomplete="off">' +
        '<p class="pin-err" id="lkErr"></p>' +
        '<button class="btn primary" id="lkOk" type="button">确定</button>' +
        '<button class="btn ghost sm" id="lkNew" type="button">换一题</button>';
    } else if (lockStage === 'setup') {
      h = '<h2>设置管理端密码</h2>' +
        '<p class="muted">4～8 位数字。设置后只有答对口算题 + 输对密码才能进管理端。</p>' +
        '<input id="lkPin" class="ipt big" type="password" inputmode="numeric" maxlength="8" placeholder="新密码" autocomplete="off">' +
        '<input id="lkPin2" class="ipt big" type="password" inputmode="numeric" maxlength="8" placeholder="再输一次" autocomplete="off">' +
        '<div class="form-row"><label>孩子年级</label>' +
        '<select id="lkGrade" class="ipt">' + gradeOptions(S.grade()) + '</select></div>' +
        '<p class="pin-err" id="lkErr"></p>' +
        '<button class="btn primary" id="lkOk" type="button">保存并进入</button>';
    } else {
      h = '<h2>家长验证</h2>' +
        '<p class="muted">请输入管理端密码。</p>' +
        '<input id="lkInput" class="ipt big" type="password" inputmode="numeric" maxlength="8" placeholder="管理端密码">' +
        '<p class="pin-err" id="lkErr"></p>' +
        '<button class="btn primary" id="lkOk" type="button">下一步</button>';
    }
    box.innerHTML = h;
  }

  function lockErr(msg) {
    var e = el('#lkErr');
    if (e) e.textContent = msg;
  }

  function unlock() {
    unlockedUI = true;
    var s = el('#lockScreen');
    if (s) s.style.display = 'none';
    var b = el('#adminBody');
    if (b) b.style.display = '';
    render();
  }

  function lockNext() {
    if (lockStage === 'pin') {
      var v = el('#lkInput') ? el('#lkInput').value.trim() : '';
      if (v !== S.state().pin) { lockErr('密码不对，再想想～'); return; }
      lockStage = 'quiz'; quiz = null; renderLock(); return;
    }
    if (lockStage === 'quiz0' || lockStage === 'quiz') {
      var s = el('#lkInput') ? el('#lkInput').value.trim() : '';
      if (!quiz) quiz = makeQuiz(S.grade());
      if (s === '' || parseInt(s, 10) !== quiz.a) {
        lockErr('算错了，再试一道～');
        quiz = makeQuiz(lockStage === 'quiz0' ? 3 : S.grade());
        renderLock();
        return;
      }
      if (lockStage === 'quiz0') { lockStage = 'setup'; renderLock(); }
      else unlock();
      return;
    }
    if (lockStage === 'setup') {
      var p1 = el('#lkPin') ? el('#lkPin').value.trim() : '';
      var p2 = el('#lkPin2') ? el('#lkPin2').value.trim() : '';
      if (!/^\d{4,8}$/.test(p1)) { lockErr('密码要 4～8 位数字'); return; }
      if (p1 !== p2) { lockErr('两次输入的密码不一样'); return; }
      var gEl = el('#lkGrade');
      if (gEl) S.setGrade(gEl.value);
      S.setPin(p1);
      unlock();
    }
  }

  function render() {
    renderCheatBtn();
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
    renderCheatBtn();
    renderLock();
    if (window.Cloud) window.Cloud.onChange(function () { cloudRefresh(); });

    /* 锁屏上的按钮：确定 / 换一题 */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'lkOk') lockNext();
      else if (t.id === 'lkNew') { quiz = makeQuiz(lockStage === 'quiz0' ? 3 : S.grade()); renderLock(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var a = document.activeElement;
      if (a && (a.id === 'lkInput' || a.id === 'lkPin' || a.id === 'lkPin2')) lockNext();
    });

    S.onChange(function (_, external) { if (external && unlockedUI) render(); });
  });
})();
