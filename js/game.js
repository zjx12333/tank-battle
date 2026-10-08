/* ============================================================
 * 坦克大战 · Tank Battle
 * 纯前端 Canvas 2D 实现 / 无任何依赖
 * ============================================================ */
(function () {
  'use strict';

  /* ============================================================
   * 一、常量
   * ============================================================ */

  var TILE = 40;                 // 每格像素
  var COLS = 13, ROWS = 13;      // 地图尺寸（格）
  var W = COLS * TILE;           // 520
  var H = ROWS * TILE;           // 520

  // 地形
  var EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, TREE = 4, BASE = 5;

  var BLOCKS_TANK = { 1: 1, 2: 1, 3: 1, 5: 1 };   // 砖 钢 水 基地
  var BLOCKS_BULLET = { 1: 1, 2: 1, 5: 1 };       // 砖 钢 基地

  var DIRS = {
    up:    { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down:  { x: 0, y: 1 },
    left:  { x: -1, y: 0 }
  };
  var DIR_ORDER = ['up', 'right', 'down', 'left'];
  var ROT = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

  var BASE_C = 6, BASE_R = 12;
  var BASE_WALLS = [[5, 11], [6, 11], [7, 11], [5, 12], [7, 12]];
  var PLAYER_SPAWN = { c: 4, r: 12 };
  var ENEMY_SPAWNS = [{ c: 0, r: 0 }, { c: 6, r: 0 }, { c: 12, r: 0 }];

  var TANK_SIZE = 32;            // 坦克碰撞盒边长
  var BULLET_R = 3.5;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  var tileCenter = function (c, r) { return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }; };

  /* ============================================================
   * 二、关卡数据
   *   .  空地    B  砖墙（可破坏）   S  钢墙（需满级火力）
   *   W  河流（坦克不可通行，子弹可过）  T  树林（遮蔽视线）
   *   E  基地（老鹰）
   * ============================================================ */

  var LEVELS = [
    {
      name: '丛林前哨',
      map: [
        '.............',
        '.BB.BB.BB.BB.',
        '.BB.BB.BB.BB.',
        '.BB.BB.BB.BB.',
        '.BB.BBSBB.BB.',
        '.............',
        'BB.BB...BB.BB',
        '.............',
        '.BB.BB.BB.BB.',
        '.BB.BB.BB.BB.',
        '.BB.BB.BB.BB.',
        '.....BBB.....',
        '.....BEB.....'
      ],
      enemies: ['basic', 'basic', 'fast', 'basic', 'armor', 'basic', 'fast',
                'basic', 'power', 'basic', 'armor', 'power'],
      maxOnField: 4
    },
    {
      name: '钢铁防线',
      map: [
        '.............',
        '.SS.......SS.',
        '.SS.BBBBB.SS.',
        '....B...B....',
        '.BB.B.S.B.BB.',
        '.BB.B...B.BB.',
        '....BBBBB....',
        '..BB.....BB..',
        '..BB.WWW.BB..',
        '.....WWW.....',
        '.BB.BBBBB.BB.',
        '.....BBB.....',
        '.....BEB.....'
      ],
      enemies: ['basic', 'fast', 'basic', 'power', 'fast', 'armor', 'basic',
                'power', 'fast', 'armor', 'basic', 'power', 'fast', 'armor',
                'power', 'armor'],
      maxOnField: 5
    },
    {
      name: '死亡峡谷',
      map: [
        '.............',
        '.B.BBBBBBB.B.',
        '.B.........B.',
        '.B.SS...SS.B.',
        '.B.SS...SS.B.',
        '.B...TTT...B.',
        '.BB..TTT..BB.',
        '.....TTT.....',
        '.WWW.....WWW.',
        '.WWW.....WWW.',
        '.BB.BBBBB.BB.',
        '.....BBB.....',
        '.....BEB.....'
      ],
      enemies: ['basic', 'fast', 'armor', 'power', 'fast', 'armor', 'power',
                'fast', 'armor', 'power', 'armor', 'power', 'fast', 'armor',
                'power', 'armor', 'power', 'armor', 'power', 'armor'],
      maxOnField: 6
    }
  ];

  /* 敌军坦克属性 */
  var ENEMY_TYPES = {
    basic: { speed: 72,  hp: 1, fireCd: 1.55, bulletSpeed: 230, score: 100, body: '#c3ccb6', dark: '#79826d', tread: '#4e5445' },
    fast:  { speed: 116, hp: 1, fireCd: 1.90, bulletSpeed: 250, score: 200, body: '#79cbdd', dark: '#3f8595', tread: '#2c5b66' },
    power: { speed: 78,  hp: 1, fireCd: 0.85, bulletSpeed: 350, score: 300, body: '#e3a843', dark: '#a06f1e', tread: '#5f4212' },
    armor: { speed: 64,  hp: 3, fireCd: 1.30, bulletSpeed: 250, score: 400, body: '#b078e6', dark: '#6b3f99', tread: '#3f2459' }
  };
  // 装甲车按剩余血量换色
  var ARMOR_SKINS = [
    null,
    { body: '#c3ccb6', dark: '#79826d', tread: '#4e5445' },  // 1 血
    { body: '#79cbdd', dark: '#3f8595', tread: '#2c5b66' },  // 2 血
    { body: '#b078e6', dark: '#6b3f99', tread: '#3f2459' }   // 3 血
  ];

  /* 玩家按火力等级 */
  var PLAYER_LEVELS = [
    null,
    { bulletSpeed: 330, maxBullets: 1, steel: false },
    { bulletSpeed: 460, maxBullets: 1, steel: false },
    { bulletSpeed: 460, maxBullets: 2, steel: false },
    { bulletSpeed: 520, maxBullets: 2, steel: true }
  ];
  var PLAYER_SPEED = 132;

  /* 道具 */
  var POWERUP_DEFS = {
    star:   { color: '#e8d24a', label: '火力提升' },
    heart:  { color: '#e05c4a', label: '增加生命' },
    bomb:   { color: '#e8894b', label: '全屏轰炸' },
    shield: { color: '#79cbdd', label: '无敌护盾' },
    clock:  { color: '#9fd356', label: '冻结敌军' },
    shovel: { color: '#c3ccb6', label: '基地铁壁' }
  };
  var POWERUP_POOL = ['star', 'star', 'star', 'heart', 'bomb', 'shield', 'clock', 'shovel'];

  /* ============================================================
   * 三、DOM & 画布
   * ============================================================ */

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlayEl = document.getElementById('overlay');
  var stageEl = document.getElementById('stage');
  var ui = {
    level: document.getElementById('stat-level'),
    score: document.getElementById('stat-score'),
    lives: document.getElementById('stat-lives'),
    enemies: document.getElementById('stat-enemies'),
    power: document.getElementById('stat-power')
  };

  function fitCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ============================================================
   * 四、游戏状态
   * ============================================================ */

  var MODE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', CLEAR: 'clear', OVER: 'over', WIN: 'win' };

  var grid = [];               // ROWS x COLS 地形
  var mode = MODE.MENU;
  var levelIndex = 0;
  var score = 0;
  var lives = 3;
  var playerPower = 1;

  var player = null;
  var enemies = [];
  var bullets = [];
  var effects = [];
  var powerups = [];

  var spawnQueue = [];         // 待入场敌军类型
  var spawnIndex = 0;
  var spawnCd = 0;
  var spawnSlot = 0;           // 轮流使用三个出生点

  var baseAlive = true;
  var freezeTimer = 0;
  var shovelTimer = 0;
  var shake = 0;
  var gameTime = 0;
  var respawnTimer = 0;
  var bannerTimer = 0;
  var bannerText = '';

  /* ============================================================
   * 五、输入
   * ============================================================ */

  var input = { dirs: [], fire: false };

  function pressDir(d) { if (input.dirs.indexOf(d) === -1) input.dirs.push(d); }
  function releaseDir(d) { input.dirs = input.dirs.filter(function (x) { return x !== d; }); }
  function activeDir() { return input.dirs.length ? input.dirs[input.dirs.length - 1] : null; }
  function clearInput() { input.dirs = []; input.fire = false; }

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };

  window.addEventListener('keydown', function (e) {
    if (window.Sound) window.Sound.unlock();

    var d = KEYMAP[e.code];
    if (d) { e.preventDefault(); pressDir(d); return; }

    if (e.code === 'Space' || e.code === 'KeyJ') {
      e.preventDefault();
      input.fire = true;
      if (mode === MODE.MENU || mode === MODE.CLEAR || mode === MODE.OVER || mode === MODE.WIN) {
        primaryAction();
      }
      return;
    }
    if (e.code === 'Enter' && mode !== MODE.PLAYING) { e.preventDefault(); primaryAction(); return; }
    if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
    if (e.code === 'KeyM') { toggleMute(); }
  });

  window.addEventListener('keyup', function (e) {
    var d = KEYMAP[e.code];
    if (d) { e.preventDefault(); releaseDir(d); }
    if (e.code === 'Space' || e.code === 'KeyJ') input.fire = false;
  });

  window.addEventListener('blur', function () {
    clearInput();
    if (mode === MODE.PLAYING) setPaused(true);
  });

  // ---- 触屏 ----
  var touchEl = document.getElementById('touch');
  if (touchEl) {
    Array.prototype.forEach.call(touchEl.querySelectorAll('[data-dir]'), function (btn) {
      var dir = btn.getAttribute('data-dir');
      var down = function (e) { e.preventDefault(); if (window.Sound) window.Sound.unlock(); pressDir(dir); };
      var up = function (e) { e.preventDefault(); releaseDir(dir); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
    var fireBtn = document.getElementById('btn-fire');
    if (fireBtn) {
      fireBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (window.Sound) window.Sound.unlock();
        input.fire = true;
        if (mode === MODE.MENU || mode === MODE.CLEAR || mode === MODE.OVER || mode === MODE.WIN) primaryAction();
      });
      fireBtn.addEventListener('pointerup', function (e) { e.preventDefault(); input.fire = false; });
      fireBtn.addEventListener('pointercancel', function () { input.fire = false; });
    }
  }

  var muteBtn = document.getElementById('btn-mute');
  function toggleMute() {
    var m = window.Sound ? window.Sound.toggleMute() : true;
    if (muteBtn) {
      muteBtn.textContent = m ? '♪̸' : '♪';
      muteBtn.classList.toggle('off', m);
    }
  }
  if (muteBtn) {
    muteBtn.addEventListener('click', function () { if (window.Sound) window.Sound.unlock(); toggleMute(); });
  }

  /* ============================================================
   * 六、地图工具
   * ============================================================ */

  function loadLevel(i) {
    var def = LEVELS[i];
    grid = def.map.map(function (row) {
      return row.split('').map(function (ch) {
        if (ch === 'B') return BRICK;
        if (ch === 'S') return STEEL;
        if (ch === 'W') return WATER;
        if (ch === 'T') return TREE;
        if (ch === 'E') return BASE;
        return EMPTY;
      });
    });

    // 防御性检查：地图必须是 ROWS x COLS
    for (var r = 0; r < ROWS; r++) {
      if (!grid[r] || grid[r].length !== COLS) {
        console.warn('地图第 ' + r + ' 行长度异常，已自动补齐');
        grid[r] = grid[r] || [];
        while (grid[r].length < COLS) grid[r].push(EMPTY);
      }
    }

    spawnQueue = def.enemies.slice();
    spawnIndex = 0;
    spawnCd = 0.6;
    spawnSlot = 0;
    baseAlive = true;
    freezeTimer = 0;
    shovelTimer = 0;
    enemies = [];
    bullets = [];
    powerups = [];
    effects = [];
    gameTime = 0;
    respawnTimer = 0;
    playerPower = 1;

    spawnPlayer(true);
    bannerText = '第 ' + (i + 1) + ' 关 · ' + def.name;
    bannerTimer = 2.2;
    syncHud();
  }

  function spawnPlayer(withShield) {
    var p = tileCenter(PLAYER_SPAWN.c, PLAYER_SPAWN.r);
    player = makeTank(p.x, p.y, 'up', {
      isPlayer: true,
      size: TANK_SIZE,
      speed: PLAYER_SPEED,
      hp: 1,
      bulletSpeed: PLAYER_LEVELS[playerPower].bulletSpeed,
      maxBullets: PLAYER_LEVELS[playerPower].maxBullets,
      steel: PLAYER_LEVELS[playerPower].steel,
      cooldown: 0,
      shots: 0,
      shield: withShield ? 3 : 0,
      spawnTimer: 0,
      tread: 0
    });
  }

  function applyPlayerPower() {
    if (!player) return;
    var cfg = PLAYER_LEVELS[clamp(playerPower, 1, 4)];
    player.bulletSpeed = cfg.bulletSpeed;
    player.maxBullets = cfg.maxBullets;
    player.steel = cfg.steel;
  }

  function tileAt(x, y) {
    return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
  }

  function inBounds(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }

  function setBaseWalls(type) {
    for (var i = 0; i < BASE_WALLS.length; i++) {
      var w = BASE_WALLS[i];
      if (grid[w[1]][w[0]] !== BASE) grid[w[1]][w[0]] = type;
    }
  }

  /* ============================================================
   * 七、坦克
   * ============================================================ */

  function makeTank(x, y, dir, extra) {
    var t = {
      x: x, y: y, dir: dir,
      size: TANK_SIZE,
      speed: 80,
      hp: 1, maxHp: 1,
      cooldown: 0, fireCd: 1.5,
      bulletSpeed: 240,
      maxBullets: 1,
      steel: false,
      shots: 0,
      isPlayer: false,
      type: 'basic',
      shield: 0,
      spawnTimer: 0,
      tread: 0,
      thinkTimer: 0,
      blocked: 0,
      flash: 0,
      bonus: false,
      dead: false
    };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) t[k] = extra[k];
    t.maxHp = extra && extra.maxHp != null ? extra.maxHp : t.hp;
    return t;
  }

  function rectBlocked(cx, cy, size) {
    var h = size / 2;
    var c0 = Math.floor((cx - h) / TILE), c1 = Math.floor((cx + h - 0.001) / TILE);
    var r0 = Math.floor((cy - h) / TILE), r1 = Math.floor((cy + h - 0.001) / TILE);
    if (c0 < 0 || r0 < 0 || c1 >= COLS || r1 >= ROWS) return true;
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        if (BLOCKS_TANK[grid[r][c]]) return true;
      }
    }
    return false;
  }

  /** 沿单一方向推进，逐像素细分以获得贴墙效果；返回是否移动过 */
  function stepMove(t, dx, dy) {
    var dist = Math.abs(dx) + Math.abs(dy);
    if (dist <= 0) return false;
    var steps = Math.max(1, Math.ceil(dist / 2));
    var ix = dx / steps, iy = dy / steps;
    var moved = false;
    for (var i = 0; i < steps; i++) {
      if (rectBlocked(t.x + ix, t.y + iy, t.size)) break;
      t.x += ix;
      t.y += iy;
      moved = true;
    }
    return moved;
  }

  function moveTank(t, dt) {
    var d = DIRS[t.dir];
    var delta = t.speed * dt;
    var moved = stepMove(t, d.x * delta, d.y * delta);
    if (moved) t.tread += delta;
    return moved;
  }

  /** 转向：把垂直方向对齐到格中心，可安全穿行窄道 */
  function setDir(t, dir) {
    if (t.dir === dir) return;
    t.dir = dir;
    if (dir === 'left' || dir === 'right') {
      t.y = Math.round((t.y - TILE / 2) / TILE) * TILE + TILE / 2;
    } else {
      t.x = Math.round((t.x - TILE / 2) / TILE) * TILE + TILE / 2;
    }
  }

  function tankRect(t) {
    var h = t.size / 2;
    return { x: t.x - h, y: t.y - h, w: t.size, h: t.size };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function aliveEnemies() {
    return enemies.filter(function (e) { return !e.dead; });
  }

  function tileOccupied(c, r) {
    var p = tileCenter(c, r);
    var all = aliveEnemies();
    if (player && player.spawnTimer <= 0) all = all.concat([player]);
    for (var i = 0; i < all.length; i++) {
      if (Math.abs(all[i].x - p.x) < TILE && Math.abs(all[i].y - p.y) < TILE) return true;
    }
    return false;
  }

  /* ============================================================
   * 八、子弹
   * ============================================================ */

  function fire(t) {
    var active = 0;
    for (var i = 0; i < bullets.length; i++) {
      if (!bullets[i].dead && bullets[i].owner === t) active++;
    }
    if (active >= t.maxBullets) return;

    var d = DIRS[t.dir];
    var muzzle = t.size / 2 + 4;
    bullets.push({
      x: t.x + d.x * muzzle,
      y: t.y + d.y * muzzle,
      dir: t.dir,
      speed: t.bulletSpeed,
      owner: t,
      fromPlayer: !!t.isPlayer,
      steel: !!t.steel,
      dead: false,
      trail: 0
    });

    t.cooldown = t.isPlayer ? 0.28 : t.fireCd * rand(0.75, 1.45);
    t.shots++;

    effects.push({ kind: 'muzzle', x: t.x + d.x * muzzle, y: t.y + d.y * muzzle, t: 0, dur: 0.09, size: 11 });

    if (window.Sound) t.isPlayer ? window.Sound.shoot() : window.Sound.enemyShoot();
  }

  function updateBullets(dt) {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (b.dead) continue;

      var d = DIRS[b.dir];
      var remain = b.speed * dt;
      var stepLen = 5;

      while (remain > 0 && !b.dead) {
        var s = Math.min(stepLen, remain);
        remain -= s;
        b.x += d.x * s;
        b.y += d.y * s;

        // 出界
        if (b.x < -8 || b.y < -8 || b.x > W + 8 || b.y > H + 8) { b.dead = true; break; }

        // 撞地形
        var pt = tileAt(b.x + d.x * BULLET_R, b.y + d.y * BULLET_R);
        if (!inBounds(pt.c, pt.r)) { b.dead = true; break; }

        var cell = grid[pt.r][pt.c];
        if (cell === BRICK) {
          grid[pt.r][pt.c] = EMPTY;
          // 顺带打掉后面紧邻的那块砖，手感更接近原作
          var bc = pt.c + d.x, br = pt.r + d.y;
          if (inBounds(bc, br) && grid[br][bc] === BRICK) grid[br][bc] = EMPTY;
          addSmallBoom(b.x, b.y);
          if (window.Sound) window.Sound.hitWall();
          b.dead = true;
          break;
        }
        if (cell === STEEL) {
          if (b.steel) {
            grid[pt.r][pt.c] = EMPTY;
            addSmallBoom(b.x, b.y);
          } else {
            effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, dur: 0.2, size: 10 });
          }
          if (window.Sound) window.Sound.hitSteel();
          b.dead = true;
          break;
        }
        if (cell === BASE) {
          b.dead = true;
          destroyBase();
          break;
        }

        // 撞坦克
        var br2 = { x: b.x - BULLET_R, y: b.y - BULLET_R, w: BULLET_R * 2, h: BULLET_R * 2 };
        var targets = b.fromPlayer ? aliveEnemies() : (player && player.spawnTimer <= 0 ? [player] : []);

        for (var j = 0; j < targets.length; j++) {
          var tgt = targets[j];
          if (tgt.dead) continue;
          if (!rectsOverlap(br2, tankRect(tgt))) continue;

          b.dead = true;
          if (tgt.isPlayer) {
            if (tgt.shield > 0) {
              effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, dur: 0.25, size: 16 });
            } else {
              killPlayer();
            }
          } else {
            damageEnemy(tgt, b.owner);
          }
          break;
        }

        // 子弹对撞
        if (!b.dead) {
          for (var k = 0; k < bullets.length; k++) {
            var o = bullets[k];
            if (o === b || o.dead || o.fromPlayer === b.fromPlayer) continue;
            var dx = o.x - b.x, dy = o.y - b.y;
            if (dx * dx + dy * dy < 100) {
              o.dead = true;
              b.dead = true;
              effects.push({ kind: 'spark', x: b.x, y: b.y, t: 0, dur: 0.22, size: 14 });
              break;
            }
          }
        }
      }
    }

    bullets = bullets.filter(function (b) { return !b.dead; });
  }

  /* ============================================================
   * 九、伤害与死亡
   * ============================================================ */

  function damageEnemy(e, byPlayer) {
    e.hp--;
    if (e.hp > 0) {
      effects.push({ kind: 'spark', x: e.x, y: e.y, t: 0, dur: 0.22, size: 18 });
      if (window.Sound) window.Sound.hitTank();
      return;
    }
    e.dead = true;
    addBoom(e.x, e.y, 34);
    if (window.Sound) window.Sound.smallBoom();

    var pts = ENEMY_TYPES[e.type] ? ENEMY_TYPES[e.type].score : 100;
    addScore(pts, e.x, e.y);

    if (e.bonus) dropPowerup();
  }

  function killPlayer() {
    if (!player || player.dead) return;
    addBoom(player.x, player.y, 40);
    if (window.Sound) window.Sound.boom();
    player = null;
    lives--;
    syncHud();

    if (lives <= 0) {
      gameOver();
    } else {
      respawnTimer = 1.4;
    }
  }

  function destroyBase() {
    if (!baseAlive) return;
    baseAlive = false;
    var p = tileCenter(BASE_C, BASE_R);
    grid[BASE_R][BASE_C] = EMPTY;
    addBoom(p.x, p.y, 60);
    shake = 22;
    if (window.Sound) window.Sound.boom();
    gameOver();
  }

  function gameOver() {
    if (mode === MODE.OVER) return;
    mode = MODE.OVER;
    if (window.Sound) window.Sound.gameOver();
    showOverlay(
      '<p class="title">游戏结束</p>' +
      '<p class="sub">' + (baseAlive ? '所有坦克都损毁了。' : '基地被摧毁了。') + '</p>' +
      '<p class="big">得分 ' + score + '</p>' +
      '<button class="cta" data-action="restart">再来一局</button>'
    );
  }

  function addScore(pts, x, y) {
    score += pts;
    syncHud();
    effects.push({ kind: 'text', x: x, y: y, t: 0, dur: 0.9, text: '+' + pts, size: 13 });
    flashStat(ui.score);
  }

  /* ============================================================
   * 十、敌军 AI
   * ============================================================ */

  function updateSpawns(dt) {
    if (spawnIndex >= spawnQueue.length) return;
    if (aliveEnemies().length >= LEVELS[levelIndex].maxOnField) return;

    spawnCd -= dt;
    if (spawnCd > 0) return;

    // 找一个没被占用的出生点
    var spawn = null;
    for (var attempt = 0; attempt < ENEMY_SPAWNS.length; attempt++) {
      var s = ENEMY_SPAWNS[(spawnSlot + attempt) % ENEMY_SPAWNS.length];
      if (!tileOccupied(s.c, s.r)) { spawn = s; spawnSlot = (spawnSlot + attempt + 1) % ENEMY_SPAWNS.length; break; }
    }
    if (!spawn) { spawnCd = 0.5; return; }

    var type = spawnQueue[spawnIndex++];
    var def = ENEMY_TYPES[type];
    var pos = tileCenter(spawn.c, spawn.r);

    var e = makeTank(pos.x, pos.y, 'down', {
      isPlayer: false,
      type: type,
      speed: def.speed,
      hp: def.hp,
      maxHp: def.hp,
      fireCd: def.fireCd,
      bulletSpeed: def.bulletSpeed,
      maxBullets: 1,
      cooldown: rand(0.3, 1.0),
      spawnTimer: 0.9,
      thinkTimer: rand(0.4, 1.2),
      bonus: Math.random() < 0.22
    });
    enemies.push(e);
    spawnCd = rand(0.9, 2.2);
    syncHud();
  }

  function chooseDir(e) {
    var basePos = tileCenter(BASE_C, BASE_R);
    var dx = basePos.x - e.x;
    var dy = basePos.y - e.y;

    var candidates = [];
    var towardX = dx > 0 ? 'right' : 'left';
    var towardY = dy > 0 ? 'down' : 'up';

    if (Math.random() < 0.62) {
      // 追向基地：优先水平靠近，再向下压
      if (Math.abs(dx) > TILE * 1.5) candidates.push(towardX);
      candidates.push('down');
      if (Math.abs(dx) > TILE * 1.5) candidates.push(towardX === 'right' ? 'left' : 'right');
    }
    // 随机兜底
    var shuffled = DIR_ORDER.slice().sort(function () { return Math.random() - 0.5; });
    candidates = candidates.concat(shuffled);

    for (var i = 0; i < candidates.length; i++) {
      var d = candidates[i];
      if (d === e.dir) continue;
      var dd = DIRS[d];
      if (!rectBlocked(e.x + dd.x * TILE * 0.75, e.y + dd.y * TILE * 0.75, e.size)) return d;
    }
    return e.dir;
  }

  function playerInSight(e) {
    if (!player || player.spawnTimer > 0) return false;
    var sameCol = Math.abs(player.x - e.x) < TILE * 0.6;
    var sameRow = Math.abs(player.y - e.y) < TILE * 0.6;
    if (sameCol) {
      if (player.y < e.y && e.dir === 'up') return true;
      if (player.y > e.y && e.dir === 'down') return true;
    }
    if (sameRow) {
      if (player.x < e.x && e.dir === 'left') return true;
      if (player.x > e.x && e.dir === 'right') return true;
    }
    return false;
  }

  function updateEnemies(dt) {
    var frozen = freezeTimer > 0;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;

      if (e.spawnTimer > 0) { e.spawnTimer -= dt; continue; }
      if (frozen) continue;

      e.flash = (e.flash + dt) % 1;

      e.thinkTimer -= dt;
      if (e.thinkTimer <= 0 || e.blocked > 0.25) {
        setDir(e, chooseDir(e));
        e.thinkTimer = rand(0.6, 1.9);
        e.blocked = 0;
      }

      var moved = moveTank(e, dt);
      e.blocked = moved ? 0 : e.blocked + dt;

      // 开火
      e.cooldown -= dt;
      if (e.cooldown <= 0) {
        var wants = playerInSight(e) || Math.random() < 0.6;
        // 没瞄到玩家也可能开火；否则稍后再判定
        if (wants) fire(e);
        else e.cooldown = 0.25;
      }
    }

    enemies = enemies.filter(function (en) { return !en.dead; });
  }

  /* ============================================================
   * 十一、道具
   * ============================================================ */

  function dropPowerup() {
    // 找一个空的可站立格子
    for (var tries = 0; tries < 60; tries++) {
      var c = Math.floor(rand(1, COLS - 1));
      var r = Math.floor(rand(1, ROWS - 2));
      if (grid[r][c] !== EMPTY && grid[r][c] !== TREE) continue;
      if (Math.abs(c - BASE_C) + Math.abs(r - BASE_R) < 3) continue;
      var p = tileCenter(c, r);
      powerups.push({
        x: p.x, y: p.y,
        kind: pick(POWERUP_POOL),
        t: 0, life: 16, size: 26
      });
      return;
    }
  }

  function updatePowerups(dt) {
    for (var i = 0; i < powerups.length; i++) {
      var u = powerups[i];
      u.t += dt;
      u.life -= dt;
      if (u.life <= 0) { u.dead = true; continue; }

      if (player && player.spawnTimer <= 0) {
        var a = { x: u.x - u.size / 2, y: u.y - u.size / 2, w: u.size, h: u.size };
        if (rectsOverlap(a, tankRect(player))) {
          applyPowerup(u.kind);
          u.dead = true;
        }
      }
    }
    powerups = powerups.filter(function (u) { return !u.dead; });
  }

  function applyPowerup(kind) {
    if (window.Sound) window.Sound.pickup();
    showBanner(POWERUP_DEFS[kind].label);

    if (kind === 'star') {
      if (playerPower < 4) { playerPower++; applyPlayerPower(); flashStat(ui.power); }
      else addScore(500, player ? player.x : W / 2, player ? player.y : H / 2);
    } else if (kind === 'heart') {
      lives++;
      if (window.Sound) window.Sound.life();
      flashStat(ui.lives);
    } else if (kind === 'bomb') {
      var list = aliveEnemies();
      for (var i = 0; i < list.length; i++) {
        list[i].hp = 0;
        list[i].dead = true;
        addBoom(list[i].x, list[i].y, 34);
      }
      enemies = enemies.filter(function (e) { return !e.dead; });
      shake = 16;
      if (window.Sound) window.Sound.boom();
    } else if (kind === 'shield') {
      if (player) player.shield = Math.max(player.shield, 12);
    } else if (kind === 'clock') {
      freezeTimer = 8;
    } else if (kind === 'shovel') {
      setBaseWalls(STEEL);
      shovelTimer = 18;
    }
    syncHud();
  }

  /* ============================================================
   * 十二、粒子 / 特效
   * ============================================================ */

  function addBoom(x, y, size) {
    effects.push({ kind: 'boom', x: x, y: y, t: 0, dur: 0.55, size: size });
    shake = Math.min(18, shake + 7);
    for (var i = 0; i < 10; i++) {
      var a = rand(0, Math.PI * 2), sp = rand(30, 130);
      effects.push({
        kind: 'particle', x: x, y: y, t: 0, dur: rand(0.25, 0.6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rand(2, 4.5),
        color: Math.random() < 0.5 ? '#ffd166' : '#e07a3c'
      });
    }
  }

  function addSmallBoom(x, y) {
    effects.push({ kind: 'boom', x: x, y: y, t: 0, dur: 0.28, size: 18 });
    shake = Math.min(18, shake + 2.5);
  }

  function updateEffects(dt) {
    for (var i = 0; i < effects.length; i++) {
      var f = effects[i];
      f.t += dt;
      if (f.kind === 'particle') {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= 0.94;
        f.vy *= 0.94;
      } else if (f.kind === 'text') {
        f.y -= 26 * dt;
      }
      if (f.t >= f.dur) f.dead = true;
    }
    effects = effects.filter(function (f) { return !f.dead; });
  }

  /* ============================================================
   * 十三、主更新
   * ============================================================ */

  function updatePlayer(dt) {
    if (!player) return;
    if (player.spawnTimer > 0) { player.spawnTimer -= dt; return; }

    if (player.shield > 0) player.shield -= dt;
    if (player.cooldown > 0) player.cooldown -= dt;

    var dir = activeDir();
    if (dir) {
      setDir(player, dir);
      moveTank(player, dt);
    }

    if (input.fire && player.cooldown <= 0) fire(player);
  }

  function update(dt) {
    if (mode !== MODE.PLAYING) return;

    gameTime += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 55);
    if (bannerTimer > 0) bannerTimer -= dt;
    if (freezeTimer > 0) freezeTimer -= dt;

    if (shovelTimer > 0) {
      shovelTimer -= dt;
      if (shovelTimer <= 0) setBaseWalls(BRICK);
    }

    if (respawnTimer > 0) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) { spawnPlayer(true); }
    }

    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updatePowerups(dt);
    updateSpawns(dt);
    updateEffects(dt);

    // 过关判定
    if (spawnIndex >= spawnQueue.length && aliveEnemies().length === 0) {
      levelClear();
    }
  }

  function levelClear() {
    mode = MODE.CLEAR;
    if (window.Sound) window.Sound.levelUp();

    if (levelIndex >= LEVELS.length - 1) {
      mode = MODE.WIN;
      showOverlay(
        '<p class="title">全线胜利</p>' +
        '<p class="sub">你守住了所有阵地，三关全清。</p>' +
        '<p class="big">最终得分 ' + score + '</p>' +
        '<button class="cta" data-action="restart">再打一次</button>'
      );
      return;
    }
    showOverlay(
      '<p class="title">第 ' + (levelIndex + 1) + ' 关 完成</p>' +
      '<p class="sub">基地完好' + (player ? '，坦克健在' : '') + '。下一关敌人更多。</p>' +
      '<p class="big">得分 ' + score + '</p>' +
      '<button class="cta" data-action="next">进入下一关</button>'
    );
  }

  /* ============================================================
   * 十四、渲染
   * ============================================================ */

  function draw() {
    ctx.save();
    if (shake > 0.2) {
      ctx.translate(rand(-shake, shake) * 0.4, rand(-shake, shake) * 0.4);
    }

    drawField();
    drawTerrain(false);   // 地面层：砖 / 钢 / 水 / 基地
    drawPowerups();
    drawTanks();
    drawBullets();
    drawTerrain(true);    // 树林盖在坦克之上
    drawEffects();
    drawBanner();

    ctx.restore();
  }

  function drawField() {
    ctx.fillStyle = '#0e1109';
    ctx.fillRect(-30, -30, W + 60, H + 60);

    // 细网格
    ctx.strokeStyle = 'rgba(159, 211, 86, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var c = 1; c < COLS; c++) {
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, H);
    }
    for (var r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(W, r * TILE);
    }
    ctx.stroke();
  }

  function drawTerrain(above) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = grid[r][c];
        if (t === EMPTY) continue;

        var x = c * TILE, y = r * TILE;

        if (t === TREE) {
          if (above) drawTree(x, y);
          continue;
        }
        if (above) continue;

        if (t === BRICK) drawBrick(x, y);
        else if (t === STEEL) drawSteel(x, y);
        else if (t === WATER) drawWater(x, y, r, c);
        else if (t === BASE) drawBase(x, y);
      }
    }
  }

  function drawBrick(x, y) {
    var bw = TILE / 2, bh = TILE / 4;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 1, y + 2, TILE, TILE);
    for (var row = 0; row < 4; row++) {
      var offset = (row % 2) * (bw / 2);
      for (var i = -1; i < 3; i++) {
        var bx = x + i * bw + offset;
        if (bx + bw <= x || bx >= x + TILE) continue;
        var cx0 = Math.max(bx, x), cx1 = Math.min(bx + bw, x + TILE);
        ctx.fillStyle = row % 2 ? '#a8492a' : '#c05a33';
        ctx.fillRect(cx0 + 0.5, y + row * bh + 0.5, cx1 - cx0 - 1.5, bh - 1.5);
        ctx.fillStyle = 'rgba(255, 190, 140, 0.16)';
        ctx.fillRect(cx0 + 0.5, y + row * bh + 0.5, cx1 - cx0 - 1.5, 1.5);
      }
    }
  }

  function drawSteel(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 1, y + 2, TILE, TILE);
    var s = TILE / 2;
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 2; c++) {
        var px = x + c * s, py = y + r * s;
        ctx.fillStyle = '#8d9aa6';
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.fillRect(px + 1, py + 1, s - 2, 2.5);
        ctx.fillRect(px + 1, py + 1, 2.5, s - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.fillRect(px + 1, py + s - 3.5, s - 2, 2.5);
        ctx.fillRect(px + s - 3.5, py + 1, 2.5, s - 2);
      }
    }
  }

  function drawWater(x, y, r, c) {
    ctx.fillStyle = '#173a5c';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#245b8c';
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);

    ctx.strokeStyle = 'rgba(140, 205, 255, 0.5)';
    ctx.lineWidth = 1.6;
    var phase = gameTime * 1.6 + (r * 0.7 + c * 1.3);
    for (var i = 0; i < 2; i++) {
      var wy = y + 13 + i * 14;
      ctx.beginPath();
      for (var px = 0; px <= TILE; px += 4) {
        var yy = wy + Math.sin(phase + px * 0.22) * 2.4;
        if (px === 0) ctx.moveTo(x + px, yy);
        else ctx.lineTo(x + px, yy);
      }
      ctx.stroke();
    }
  }

  function drawTree(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y, TILE, TILE);
    var blobs = [
      [10, 12, 11], [28, 10, 12], [16, 27, 13], [32, 29, 10], [7, 30, 9]
    ];
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      ctx.fillStyle = i % 2 ? '#246b2c' : '#2f8a38';
      ctx.beginPath();
      ctx.arc(x + b[0], y + b[1], b[2] * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(150, 230, 140, 0.22)';
    ctx.beginPath();
    ctx.arc(x + 13, y + 12, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBase(x, y) {
    var cx = x + TILE / 2, cy = y + TILE / 2;

    if (!baseAlive) {
      ctx.fillStyle = '#2a2418';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a3a22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 2, cy - 6);
      ctx.moveTo(cx - 2, cy + 9);  ctx.lineTo(cx + 10, cy - 3);
      ctx.stroke();
      return;
    }

    // 底盘
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 15, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 盾徽
    ctx.fillStyle = baseAlive ? '#c8a548' : '#5a4a2a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 13, cy - 8);
    ctx.lineTo(cx + 13, cy + 4);
    ctx.quadraticCurveTo(cx, cy + 16, cx - 13, cy + 4);
    ctx.lineTo(cx - 13, cy - 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 235, 180, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 13, cy - 8);
    ctx.lineTo(cx, cy - 2);
    ctx.closePath();
    ctx.fill();

    // 鹰
    ctx.fillStyle = '#3a2f14';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 7, cy - 1);
    ctx.lineTo(cx + 3, cy + 1);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 7, cy + 8);
    ctx.lineTo(cx - 3, cy + 1);
    ctx.lineTo(cx - 7, cy - 1);
    ctx.closePath();
    ctx.fill();

    // 脉动光晕
    var pulse = 0.22 + 0.16 * Math.sin(gameTime * 2.4);
    ctx.strokeStyle = 'rgba(232, 184, 75, ' + pulse.toFixed(3) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPowerups() {
    for (var i = 0; i < powerups.length; i++) {
      var u = powerups[i];
      var def = POWERUP_DEFS[u.kind];
      var bob = Math.sin(u.t * 4) * 2.5;
      var blink = u.life < 4 && Math.floor(u.life * 8) % 2 === 0;
      if (blink) continue;

      ctx.save();
      ctx.translate(u.x, u.y + bob);

      // 光晕
      var glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      glow.addColorStop(0, def.color + 'cc');
      glow.addColorStop(1, def.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // 底板
      var s = u.size;
      ctx.fillStyle = '#10160c';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      roundRect(-s / 2, -s / 2, s, s, 6);
      ctx.fill();
      ctx.stroke();

      drawPowerupIcon(u.kind, def.color, s);
      ctx.restore();
    }
  }

  function drawPowerupIcon(kind, color, s) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    var h = s * 0.5;

    if (kind === 'star') {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var ang = -Math.PI / 2 + i * Math.PI / 5;
        var rad = i % 2 ? h * 0.34 : h * 0.7;
        var px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.bezierCurveTo(-h * 1.1, -h * 0.25, -h * 0.4, -h * 0.95, 0, -h * 0.32);
      ctx.bezierCurveTo(h * 0.4, -h * 0.95, h * 1.1, -h * 0.25, 0, h * 0.6);
      ctx.fill();
    } else if (kind === 'bomb') {
      ctx.beginPath();
      ctx.arc(0, h * 0.15, h * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(h * 0.28, -h * 0.36);
      ctx.lineTo(h * 0.62, -h * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h * 0.7, -h * 0.82, h * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.75);
      ctx.lineTo(h * 0.68, -h * 0.4);
      ctx.lineTo(h * 0.68, h * 0.12);
      ctx.quadraticCurveTo(0, h * 0.9, -h * 0.68, h * 0.12);
      ctx.lineTo(-h * 0.68, -h * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'clock') {
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -h * 0.45);
      ctx.moveTo(0, 0); ctx.lineTo(h * 0.36, h * 0.12);
      ctx.stroke();
    } else if (kind === 'shovel') {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.8);
      ctx.lineTo(h * 0.4, -h * 0.1);
      ctx.lineTo(-h * 0.4, -h * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-h * 0.11, -h * 0.15, h * 0.22, h * 0.85);
    }
  }

  function drawTanks() {
    if (player) drawTank(player);
    for (var i = 0; i < enemies.length; i++) drawTank(enemies[i]);
  }

  function drawTank(t) {
    var isPlayer = t.isPlayer;

    // 出生动画：旋转的星
    if (t.spawnTimer > 0) {
      var p = 1 - t.spawnTimer / 0.9;
      var ang = p * Math.PI * 6;
      var rad = 6 + 14 * p;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(ang);
      ctx.strokeStyle = isPlayer ? '#e8d24a' : '#79cbdd';
      ctx.lineWidth = 2.2;
      for (var i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rad, rad * 0.45);
        ctx.lineTo(0, rad);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    var skin = tankSkin(t);
    var s = t.size;
    var half = s / 2;

    ctx.save();
    ctx.translate(t.x, t.y);

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(1.5, 3, half * 1.05, half * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(ROT[t.dir]);

    // 履带
    var treadW = s * 0.22;
    ctx.fillStyle = skin.tread;
    ctx.fillRect(-half, -half, treadW, s);
    ctx.fillRect(half - treadW, -half, treadW, s);

    // 履带纹路（滚动）
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    var offset = (t.tread * 0.5) % 6;
    for (var y = -half - 6 + offset; y < half; y += 6) {
      var y0 = Math.max(y, -half), y1 = Math.min(y + 2.4, half);
      if (y1 <= y0) continue;
      ctx.fillRect(-half + 1, y0, treadW - 2, y1 - y0);
      ctx.fillRect(half - treadW + 1, y0, treadW - 2, y1 - y0);
    }

    // 车身
    ctx.fillStyle = skin.body;
    roundRect(-half + treadW * 0.7, -half + 2, s - treadW * 1.4, s - 4, 3);
    ctx.fill();

    // 高光 / 阴影
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-half + treadW * 0.7, -half + 2, s - treadW * 1.4, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-half + treadW * 0.7, half - 5, s - treadW * 1.4, 3);

    // 炮塔
    ctx.fillStyle = skin.dark;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin.body;
    ctx.beginPath();
    ctx.arc(0, -s * 0.03, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 炮管
    ctx.fillStyle = skin.dark;
    roundRect(-s * 0.075, -half - 2, s * 0.15, s * 0.55, 2);
    ctx.fill();

    ctx.restore();

    // 护盾
    if (isPlayer && t.shield > 0) {
      var flick = t.shield < 3 && Math.floor(t.shield * 10) % 2 === 0;
      ctx.strokeStyle = flick ? 'rgba(121, 203, 221, 0.5)' : 'rgba(121, 203, 221, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, half + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200, 245, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, half + 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 携带道具的敌军闪烁
    if (t.bonus && t.spawnTimer <= 0) {
      var a = 0.35 + 0.35 * Math.sin(t.flash * Math.PI * 4);
      ctx.fillStyle = 'rgba(232, 184, 75, ' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(t.x, t.y, half + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 装甲车血条
    if (!isPlayer && t.maxHp > 1 && t.hp < t.maxHp) {
      var w = s * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y - half - 8, w, 3);
      ctx.fillStyle = t.hp === 1 ? '#e05c4a' : '#9fd356';
      ctx.fillRect(t.x - w / 2, t.y - half - 8, w * (t.hp / t.maxHp), 3);
    }
  }

  function tankSkin(t) {
    if (t.isPlayer) {
      if (playerPower >= 4) return { body: '#f0e070', dark: '#a89020', tread: '#6e5c14' };
      if (playerPower === 3) return { body: '#e8d24a', dark: '#9d8a22', tread: '#655816' };
      return { body: '#d8c141', dark: '#8e7c1e', tread: '#5a4d13' };
    }
    if (t.type === 'armor') return ARMOR_SKINS[clamp(t.hp, 1, 3)];
    return ENEMY_TYPES[t.type];
  }

  function drawBullets() {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      var d = DIRS[b.dir];

      // 拖尾
      var grad = ctx.createLinearGradient(
        b.x - d.x * 16, b.y - d.y * 16, b.x, b.y
      );
      var col = b.fromPlayer ? '232, 210, 74' : '224, 122, 60';
      grad.addColorStop(0, 'rgba(' + col + ', 0)');
      grad.addColorStop(1, 'rgba(' + col + ', 0.5)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - d.x * 16, b.y - d.y * 16);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // 弹体
      ctx.fillStyle = b.fromPlayer ? '#fff3b0' : '#ffcf9e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(b.x - d.x, b.y - d.y, BULLET_R * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEffects() {
    for (var i = 0; i < effects.length; i++) {
      var f = effects[i];
      var p = f.t / f.dur;

      if (f.kind === 'boom') {
        var r = f.size * (0.35 + p * 0.9);
        var alpha = 1 - p;
        var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, 'rgba(255, 255, 220, ' + (alpha * 0.95) + ')');
        g.addColorStop(0.35, 'rgba(255, 190, 80, ' + (alpha * 0.85) + ')');
        g.addColorStop(0.7, 'rgba(224, 110, 50, ' + (alpha * 0.55) + ')');
        g.addColorStop(1, 'rgba(160, 60, 30, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 230, 170, ' + (alpha * 0.6) + ')';
        ctx.lineWidth = 2 * (1 - p);
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 1.15, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.kind === 'particle') {
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * (1 - p * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'spark') {
        ctx.strokeStyle = 'rgba(255, 235, 180, ' + (1 - p) + ')';
        ctx.lineWidth = 2;
        var n = 6;
        for (var k = 0; k < n; k++) {
          var ang = (k / n) * Math.PI * 2 + f.t * 4;
          var r0 = f.size * 0.25, r1 = f.size * (0.5 + p * 0.9);
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(ang) * r0, f.y + Math.sin(ang) * r0);
          ctx.lineTo(f.x + Math.cos(ang) * r1, f.y + Math.sin(ang) * r1);
          ctx.stroke();
        }
      } else if (f.kind === 'muzzle') {
        var mr = f.size * (1 - p);
        ctx.fillStyle = 'rgba(255, 240, 170, ' + (1 - p) * 0.9 + ')';
        ctx.beginPath();
        ctx.arc(f.x, f.y, mr, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.kind === 'text') {
        ctx.globalAlpha = 1 - p * p;
        ctx.font = 'bold ' + f.size + 'px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = '#ffe08a';
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawBanner() {
    if (bannerTimer <= 0) return;
    var alpha = bannerTimer > 1.8 ? (2.2 - bannerTimer) / 0.4 : Math.min(1, bannerTimer / 0.5);
    alpha = clamp(alpha, 0, 1);

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(bannerText, W / 2 + 2, H / 2 + 82);
    ctx.fillStyle = '#e8b84b';
    ctx.fillText(bannerText, W / 2, H / 2 + 80);
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ============================================================
   * 十五、HUD / 覆盖层
   * ============================================================ */

  function syncHud() {
    ui.level.textContent = levelIndex + 1;
    ui.score.textContent = score;
    ui.lives.textContent = Math.max(0, lives);
    ui.enemies.textContent = (spawnQueue.length - spawnIndex) + aliveEnemies().length;
    ui.power.textContent = playerPower;
  }

  function flashStat(el) {
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  function showBanner(text) {
    bannerText = text;
    bannerTimer = 1.1;
  }

  function showOverlay(html) {
    overlayEl.innerHTML = html;
    overlayEl.classList.add('show');
  }

  function hideOverlay() {
    overlayEl.classList.remove('show');
    overlayEl.innerHTML = '';
  }

  overlayEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (window.Sound) window.Sound.unlock();
    var action = btn.getAttribute('data-action');
    if (action === 'start') startGame();
    else if (action === 'next') nextLevel();
    else if (action === 'restart') startGame();
    else if (action === 'resume') setPaused(false);
  });

  function primaryAction() {
    if (mode === MODE.MENU || mode === MODE.OVER || mode === MODE.WIN) startGame();
    else if (mode === MODE.CLEAR) nextLevel();
    else if (mode === MODE.PAUSED) setPaused(false);
  }

  /* ============================================================
   * 十六、流程控制
   * ============================================================ */

  function startGame() {
    score = 0;
    lives = 3;
    playerPower = 1;
    levelIndex = 0;
    hideOverlay();
    loadLevel(0);
    mode = MODE.PLAYING;
    clearInput();
    if (window.Sound) window.Sound.start();
    syncHud();
  }

  function nextLevel() {
    levelIndex++;
    hideOverlay();
    loadLevel(levelIndex);
    mode = MODE.PLAYING;
    clearInput();
    syncHud();
  }

  function setPaused(paused) {
    if (paused && mode === MODE.PLAYING) {
      mode = MODE.PAUSED;
      clearInput();
      showOverlay(
        '<p class="title">已暂停</p>' +
        '<p class="sub">按 <b>P</b> 或 <b>Enter</b> 继续</p>' +
        '<button class="cta" data-action="resume">继续游戏</button>'
      );
    } else if (!paused && mode === MODE.PAUSED) {
      mode = MODE.PLAYING;
      hideOverlay();
      lastTime = 0;
    }
  }

  function togglePause() {
    if (mode === MODE.PLAYING) setPaused(true);
    else if (mode === MODE.PAUSED) setPaused(false);
  }

  function showMenu() {
    mode = MODE.MENU;
    levelIndex = 0;
    // 菜单背景用第一关地图
    loadLevel(0);
    player = null;
    enemies = [];
    bullets = [];
    powerups = [];
    effects = [];
    spawnQueue = [];
    spawnIndex = 0;
    mode = MODE.MENU;
    showOverlay(
      '<p class="title">坦克大战</p>' +
      '<p class="sub">保卫基地，击退全部敌军坦克。<br>砖墙可炸开，钢墙需要满级火力。</p>' +
      '<p class="legend">' +
        '<span><b>★</b> 火力</span>' +
        '<span><b>♥</b> 生命</span>' +
        '<span><b>◉</b> 轰炸</span>' +
        '<span><b>⛨</b> 护盾</span>' +
        '<span><b>◷</b> 冻结</span>' +
        '<span><b>⛏</b> 铁壁</span>' +
      '</p>' +
      '<button class="cta" data-action="start">开始游戏</button>'
    );
  }

  /* ============================================================
   * 十七、主循环
   * ============================================================ */

  var lastTime = 0;
  var acc = 0;

  function loop(now) {
    requestAnimationFrame(loop);

    if (!lastTime) { lastTime = now; return; }
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.05) dt = 0.05;      // 卡顿时防止穿透

    if (mode === MODE.PLAYING) {
      // 固定步长更新，保证物理稳定
      acc += dt;
      var STEP = 1 / 120;
      var guard = 0;
      while (acc >= STEP && guard++ < 12) {
        update(STEP);
        acc -= STEP;
      }
    } else {
      acc = 0;
      // 菜单里也推进一点时间，让水流/基地光晕动起来
      gameTime += dt;
      updateEffects(dt);
    }

    draw();
  }

  /* ============================================================
   * 十八、启动
   * ============================================================ */

  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  syncHud();
  showMenu();
  requestAnimationFrame(loop);

  // 供调试用
  window.__TANK__ = {
    get state() {
      return { mode: mode, level: levelIndex, score: score, lives: lives, enemies: aliveEnemies().length, bullets: bullets.length };
    },
    start: startGame,
    next: nextLevel
  };
})();
