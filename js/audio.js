/* ============================================================
 * audio.js — 极简 WebAudio 音效引擎
 * 不依赖任何音频文件，全部用振荡器 + 噪声实时合成。
 * 暴露全局 window.Sound
 * ============================================================ */
(function () {
  'use strict';

  var ctx = null;
  var master = null;
  var muted = false;
  var VOLUME = 0.32;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** 单音：频率从 freq 滑到 freq2（可选） */
  function tone(freq, freq2, dur, type, vol, at) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime + (at || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2 != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  /** 噪声爆裂声，用于爆炸 */
  function noise(dur, vol) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var env = Math.pow(1 - i / len, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    var src = c.createBufferSource();
    src.buffer = buf;

    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, c.currentTime);
    lp.frequency.exponentialRampToValueAtTime(180, c.currentTime + dur);

    var g = c.createGain();
    g.gain.value = vol;

    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start();
  }

  /** 琶音工具 */
  function arp(freqs, step, dur, type, vol) {
    for (var i = 0; i < freqs.length; i++) {
      tone(freqs[i], null, dur, type, vol, i * step);
    }
  }

  window.Sound = {
    /** 浏览器要求用户手势后才能出声，首次交互时调用 */
    unlock: function () { ac(); },

    shoot:     function () { tone(560, 150, 0.08, 'square', 0.30); },
    enemyShoot:function () { tone(360, 120, 0.08, 'square', 0.16); },
    hitWall:   function () { tone(240, 110, 0.06, 'square', 0.20); },
    hitSteel:  function () { tone(1050, 1500, 0.05, 'square', 0.14); },
    hitTank:   function () { tone(300, 90, 0.09, 'sawtooth', 0.26); },

    boom:      function () { noise(0.42, 0.55); tone(150, 38, 0.40, 'sawtooth', 0.34); },
    smallBoom: function () { noise(0.18, 0.38); tone(280, 70, 0.18, 'sawtooth', 0.24); },

    pickup:    function () { arp([680, 1020], 0.07, 0.09, 'square', 0.26); },
    life:      function () { arp([700, 950, 1250], 0.09, 0.12, 'triangle', 0.26); },
    levelUp:   function () { arp([523, 659, 784, 1046], 0.11, 0.16, 'triangle', 0.26); },
    gameOver:  function () { arp([440, 349, 262, 175], 0.20, 0.34, 'sawtooth', 0.26); },
    start:     function () { arp([392, 523, 784], 0.09, 0.14, 'square', 0.24); },

    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : VOLUME;
      return muted;
    },
    isMuted: function () { return muted; }
  };
})();
