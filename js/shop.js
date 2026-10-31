/**
 * 星星商店：用星星币买美食、玩具、家具、墙纸和地板
 * 买到的家具会直接出现在家园里（可以拖着摆位置），墙纸地板在这里切换。
 */
(function () {
  'use strict';

  var D = window.DATA, S = window.Store;
  var cat = 'food';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function effectText(g) {
    if (g.desc) return g.desc;
    if (!g.need) return '';
    var parts = [];
    D.NEEDS.forEach(function (k) {
      if (g.need[k.id] == null) return;
      var v = g.need[k.id];
      parts.push(k.name + (v > 0 ? ' +' : ' ') + v);
    });
    return parts.join(' · ');
  }

  function goodsCard(g) {
    var owned = S.owns(g.id);
    var lvLock = S.level() < g.lv;
    var poor = S.stars() < g.price;
    var using = (g.cat === 'wall' && S.state().room.wall === g.id) ||
                (g.cat === 'floor' && S.state().room.floor === g.id);

    var btn;
    if (using) btn = '<button class="btn ghost xs" disabled type="button">使用中</button>';
    else if (owned) {
      btn = '<button class="btn primary xs" data-apply="' + g.id + '" type="button">换上</button>';
    } else if (lvLock) {
      btn = '<button class="btn ghost xs" disabled type="button">Lv.' + g.lv + ' 解锁</button>';
    } else if (poor) {
      btn = '<button class="btn ghost xs" disabled type="button">⭐不足</button>';
    } else {
      btn = '<button class="btn primary xs" data-buy="' + g.id + '" type="button">买下</button>';
    }

    return '<div class="goods' + (owned ? ' owned' : '') + (lvLock ? ' lock' : '') + '">' +
      '<span class="g-icon"' + (g.swatch ? ' style="background:' + g.swatch + '"' : '') + '>' +
      (g.swatch ? '' : g.icon) + '</span>' +
      '<span class="g-name">' + esc(g.name) + (owned ? '<i class="have">已有</i>' : '') + '</span>' +
      '<span class="g-eff">' + esc(effectText(g) || (g.cat === 'furni' ? '摆进家园的小家具' : '可以换上的新样式')) + '</span>' +
      '<span class="g-foot"><b class="price">⭐ ' + g.price + '</b>' + btn + '</span>' +
      '</div>';
  }

  function bagHTML() {
    var bag = S.bagList().filter(function (b) { return b.goods.cat === 'food' || b.goods.cat === 'toy'; });
    if (!bag.length) return '<p class="muted">背包还是空的，先去上面买点吃的吧～</p>';
    return '<div class="bag-row">' + bag.map(function (b) {
      return '<span class="bag-item">' + b.goods.icon + ' ' + esc(b.goods.name) + '<b>×' + b.count + '</b></span>';
    }).join('') + '</div>';
  }

  function roomHTML() {
    var st = S.state();
    var walls = D.goodsBy('wall').filter(function (g) { return S.owns(g.id); });
    var floors = D.goodsBy('floor').filter(function (g) { return S.owns(g.id); });
    var furnis = S.bagList().filter(function (b) { return b.goods.cat === 'furni'; });
    return '<div class="decor-box">' +
      '<div class="decor-line"><span>墙纸</span>' + walls.map(function (g) {
        return '<button class="swatch' + (st.room.wall === g.id ? ' on' : '') + '" data-apply="' + g.id +
          '" style="background:' + g.swatch + '" title="' + esc(g.name) + '" type="button"></button>';
      }).join('') + '</div>' +
      '<div class="decor-line"><span>地板</span>' + floors.map(function (g) {
        return '<button class="swatch' + (st.room.floor === g.id ? ' on' : '') + '" data-apply="' + g.id +
          '" style="background:' + g.swatch + '" title="' + esc(g.name) + '" type="button"></button>';
      }).join('') + '</div>' +
      '<div class="decor-line"><span>家具</span>' + (furnis.length ? furnis.map(function (b) {
        return '<span class="bag-item">' + b.goods.icon + ' ' + esc(b.goods.name) + '</span>';
      }).join('') : '<span class="muted">还没有家具，买一件摆进房间吧</span>') + '</div>' +
      '</div>';
  }

  function render(panel) {
    var st = S.state();
    var cats = ['food', 'toy', 'furni', 'wall', 'floor'];
    panel.innerHTML = '' +
      '<div class="shop">' +
      '  <div class="shop-head">' +
      '    <div>' +
      '      <h3 class="sec-title">星星商店</h3>' +
      '      <p class="muted">做任务、打卡、照顾小马都能赚星星币，攒够了就来这里买买买。</p>' +
      '    </div>' +
      '    <div class="shop-wallet">' +
      '      <span class="wallet">⭐ <b>' + st.stars + '</b></span>' +
      '      <span class="wallet lv">Lv.' + st.level + '</span>' +
      '      <span class="wallet">🔥 连续 ' + st.checkin.streak + ' 天</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="cat-tabs">' + cats.map(function (c) {
        return '<button class="cat' + (cat === c ? ' on' : '') + '" data-scat="' + c + '" type="button">' +
          D.CAT_NAMES[c] + '</button>';
      }).join('') + '</div>' +
      '  <div class="goods-grid">' + D.goodsBy(cat).map(goodsCard).join('') + '</div>' +
      '  <h3 class="sec-title">我的背包</h3>' + bagHTML() +
      '  <h3 class="sec-title">房间装扮</h3>' + roomHTML() +
      '  <p class="muted sm">买到的家具会自动摆进家园，进家园后按住家具就能拖到喜欢的位置。</p>' +
      '</div>';
  }

  function bind(panel) {
    panel.addEventListener('click', function (e) {
      var t = e.target;
      var c = t.closest ? t.closest('[data-scat]') : null;
      if (c) { cat = c.getAttribute('data-scat'); render(panel); return; }

      var b = t.closest ? t.closest('[data-buy]') : null;
      if (b) {
        var r = S.buy(b.getAttribute('data-buy'));
        if (window.App && window.App.toast) window.App.toast(r.msg);
        render(panel);
        return;
      }
      var a = t.closest ? t.closest('[data-apply]') : null;
      if (a) {
        var id = a.getAttribute('data-apply');
        var g = D.goods(id);
        if (g && g.cat === 'wall') S.setWall(id);
        else if (g && g.cat === 'floor') S.setFloor(id);
        if (window.App && window.App.toast) window.App.toast('已经换上「' + g.name + '」啦');
        render(panel);
      }
    });
  }

  function mount(panel) {
    render(panel);
    if (!panel.__shopBound) {
      bind(panel);
      panel.__shopBound = true;
    }
  }

  window.Shop = {
    mount: mount,
    focus: function (c) { cat = c || 'food'; }
  };
})();
