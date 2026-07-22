// ============ WAZZ / WANZZ PAYMENT — audio controller ============
// - Backsound loop, hanya bunyi selagi tab website aktif (mati saat pindah tab/keluar).
// - Sambutan suara otomatis sesuai jam WIB (Asia/Jakarta): Pagi / Siang / Sore / Malam.
//   Sambutan ini KHUSUS main saat landing di halaman dashboard (Ringkasan
//   Pembayaran), bukan di index/login — diatur lewat flag
//   window.WANZZ_GREETING_ENABLED yang di-set di dashboard.html.
// - Saat sambutan main, volume backsound diturunkan (ducking), lalu naik lagi setelah selesai.
//
// PENTING soal browser: semua browser modern MEMBLOKIR audio berbunyi otomatis
// sebelum ada interaksi user (klik/ketuk) di halaman — ini kebijakan browser,
// bukan bug. Makanya begitu halaman dibuka, akan muncul tombol bulat besar
// "🔊 Klik untuk nyalain musik" di kiri bawah. Klik tombol itu (atau klik apa
// saja di halaman) untuk langsung menyalakan backsound + sambutan.
//
// Catatan pemetaan file sambutan (urutan berdasarkan waktu file diunggah):
//   assets/greeting-pagi.mp3   -> 04:00–10:59 WIB
//   assets/greeting-siang.mp3 -> 11:00–14:59 WIB
//   assets/greeting-sore.mp3  -> 15:00–17:59 WIB
//   assets/greeting-malam.mp3 -> 18:00–03:59 WIB

(function () {
  const BACKSOUND_VOLUME = 0.45;
  const BACKSOUND_DUCKED = 0.12;
  const GREETING_VOLUME = 0.55;
  const GREETING_ENABLED = window.WANZZ_GREETING_ENABLED === true; // di-set di <body> halaman dashboard saja

  const backsound = new Audio('assets/backsound.mp3');
  backsound.loop = true;
  backsound.volume = BACKSOUND_VOLUME;
  backsound.preload = 'auto';

  function getWibHour() {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false,
    });
    return parseInt(fmt.format(new Date()), 10);
  }

  function getGreetingFile() {
    const h = getWibHour();
    if (h >= 4 && h < 11) return 'assets/greeting-pagi.mp3';
    if (h >= 11 && h < 15) return 'assets/greeting-siang.mp3';
    if (h >= 15 && h < 18) return 'assets/greeting-sore.mp3';
    return 'assets/greeting-malam.mp3';
  }

  let started = false;
  const GREETING_KEY = 'wanzz_greeting_played_session';
  const UNLOCK_KEY = 'wanzz_audio_unlocked'; // persists across page navigations (localStorage, not per-tab)

  function playGreetingWithDucking() {
    const greeting = new Audio(getGreetingFile());
    greeting.volume = GREETING_VOLUME;
    backsound.volume = BACKSOUND_DUCKED;
    const restoreVolume = () => { backsound.volume = BACKSOUND_VOLUME; };
    greeting.play().catch(restoreVolume);
    greeting.addEventListener('ended', restoreVolume);
    greeting.addEventListener('error', restoreVolume);
  }

  function startAudio() {
    if (started) return;

    // PENTING: backsound & sambutan dipicu BERSAMAAN secara langsung (bukan
    // dirantai lewat .then()), karena beberapa browser (terutama Safari/iOS)
    // cuma mengizinkan audio-play yang terjadi langsung di dalam event klik —
    // kalau dipanggil dari dalam callback async, izinnya sudah keburu hilang
    // dan sambutan gagal bunyi walau backsound-nya berhasil.
    const backsoundPromise = backsound.play();

    if (GREETING_ENABLED && !sessionStorage.getItem(GREETING_KEY)) {
      sessionStorage.setItem(GREETING_KEY, '1');
      playGreetingWithDucking();
    }

    backsoundPromise.then(() => {
      started = true;
      localStorage.setItem(UNLOCK_KEY, '1'); // browser sudah percaya origin ini boleh bunyi otomatis
      hideHint();
      updateToggleUI();
    }).catch(() => {
      // Browser masih menolak — tombol & hint tetap tampil menunggu klik.
    });
  }

  // Percobaan OTOMATIS saat halaman baru dibuka (bukan hasil klik user).
  // Ini SENGAJA cuma coba backsound, TIDAK memakai "jatah sekali sambutan" —
  // supaya kalau percobaan otomatis ini gagal (biasanya memang gagal di
  // kunjungan pertama), sambutan tetap bisa main nanti begitu ada klik asli.
  function autoAttemptBacksoundOnly() {
    if (started) return;
    backsound.play().then(() => {
      started = true;
      localStorage.setItem(UNLOCK_KEY, '1');
      hideHint();
      updateToggleUI();
      // Kalau autoplay ini berhasil (browser sudah percaya dari kunjungan
      // sebelumnya) DAN sambutan sesi ini belum pernah main, mainkan sekarang.
      if (GREETING_ENABLED && !sessionStorage.getItem(GREETING_KEY)) {
        sessionStorage.setItem(GREETING_KEY, '1');
        playGreetingWithDucking();
      }
    }).catch(() => {});
  }

  // Coba langsung saat halaman dibuka. Kalau situs ini sebelumnya sudah pernah
  // "dibuka suaranya" di halaman lain, browser modern biasanya langsung
  // mengizinkan lagi tanpa perlu klik ulang di setiap halaman baru.
  document.addEventListener('DOMContentLoaded', () => {
    autoAttemptBacksoundOnly();
    // Coba sekali lagi sedikit lebih telat untuk browser yang lebih lambat mengizinkan.
    setTimeout(autoAttemptBacksoundOnly, 400);
  });

  // Fallback utama: klik/ketuk apa saja di halaman akan menyalakan audio.
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
    document.addEventListener(evt, startAudio, { passive: true })
  );

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      backsound.pause();
    } else if (started && !backsound.muted) {
      backsound.play().catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => backsound.pause());
  window.addEventListener('beforeunload', () => backsound.pause());

  // ---------- floating toggle button + hint ----------
  function updateToggleUI() {
    const btn = document.getElementById('soundToggle');
    if (!btn) return;
    if (!started) {
      btn.innerHTML = '🔊 <span>Klik untuk musik</span>';
      btn.classList.remove('muted');
      return;
    }
    btn.innerHTML = backsound.muted ? '🔇 <span>Musik mati</span>' : '🔊 <span>Musik</span>';
    btn.classList.toggle('muted', backsound.muted);
  }

  function hideHint() {
    const hint = document.getElementById('soundHint');
    if (hint) hint.classList.remove('show');
  }

  function buildToggleButton() {
    const btn = document.createElement('button');
    btn.id = 'soundToggle';
    btn.className = 'sound-toggle';
    btn.type = 'button';
    btn.title = 'Aktif/matikan backsound';
    btn.innerHTML = '🔊 <span>Klik untuk musik</span>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!started) { startAudio(); return; }
      backsound.muted = !backsound.muted;
      if (!backsound.muted) backsound.play().catch(() => {});
      updateToggleUI();
    });
    document.body.appendChild(btn);

    const hint = document.createElement('div');
    hint.id = 'soundHint';
    hint.className = 'sound-hint';
    hint.textContent = '🎵 Klik di mana saja untuk nyalain backsound';
    document.body.appendChild(hint);

    // Kalau sebelumnya sudah pernah berhasil dibuka suaranya, jangan tampilkan hint lagi tiap pindah halaman.
    if (!localStorage.getItem(UNLOCK_KEY)) {
      hint.classList.add('show');
    }
  }

  document.addEventListener('DOMContentLoaded', buildToggleButton);
})();
