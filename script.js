// ============ WAZZ PAYMENT — shared behavior ============

// Reveal on scroll
document.addEventListener('DOMContentLoaded', () => {
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));

  // Method card mouse glow
  document.querySelectorAll('.method-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Nav shrink / smooth anchor (progressive enhancement only)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  });
});

// Build the QR grid pattern once (deterministic-looking "scan")
function buildQR(container) {
  if (!container) return;
  const pattern = [
    1,1,1,0,1,1,1,
    1,0,1,0,1,0,1,
    1,0,1,1,1,0,1,
    0,0,0,1,0,0,0,
    1,0,1,1,1,0,1,
    1,0,1,0,1,0,1,
    1,1,1,0,1,1,1,
  ];
  const corners = [0,1,7,8,42,43,48,49].map(n => n); // approx corners in 7x7 index terms not needed
  pattern.forEach((v, i) => {
    const cell = document.createElement('i');
    if (v) cell.classList.add('on');
    // mark the 3 finder corners bold cyan
    if ([0,6,42].includes(i)) cell.classList.add('corner');
    container.appendChild(cell);
  });
}
document.querySelectorAll('.qr-grid').forEach(buildQR);

// ============ LOGIN FLOW ============
function initLoginFlow() {
  const btn = document.getElementById('enterBtn');
  const overlay = document.getElementById('loaderOverlay');
  if (!btn || !overlay) return;

  const bar = overlay.querySelector('.loader-bar i');
  const text = overlay.querySelector('.loader-text');
  const steps = [
    'Memeriksa koneksi aman…',
    'Menyiapkan enkripsi 256-bit…',
    'Menyiapkan halaman pembayaran…',
    'Menyusun dashboard…',
  ];

  btn.addEventListener('click', () => {
    overlay.classList.add('show');
    let progress = 0;
    let stepIndex = 0;
    text.innerHTML = `<b>${steps[0]}</b>`;

    const interval = setInterval(() => {
      progress += Math.random() * 18 + 6;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        text.innerHTML = `<b>Berhasil masuk. Mengalihkan…</b>`;
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 650);
      } else {
        const newStep = Math.min(steps.length - 1, Math.floor(progress / (100 / steps.length)));
        if (newStep !== stepIndex) {
          stepIndex = newStep;
          text.innerHTML = `<b>${steps[stepIndex]}</b>`;
        }
      }
      bar.style.width = progress + '%';
    }, 260);
  });
}
initLoginFlow();

// ============ TOAST (dashboard demo interactions) ============
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="dot-pulse"></span> ${msg}`;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
document.querySelectorAll('[data-toast]').forEach(el => {
  el.addEventListener('click', () => showToast(el.getAttribute('data-toast')));
});

// ============ ZOOM LIGHTBOX (QRIS & other images — no backend) ============
function initZoomLightbox() {
  const lightbox = document.getElementById('zoomLightbox');
  if (!lightbox) return;
  const img = document.getElementById('zoomImage');
  const closeBtn = document.getElementById('zoomClose');
  const downloadLink = document.getElementById('zoomDownload');

  function open(src, alt) {
    img.src = src;
    img.alt = alt || '';
    downloadLink.href = src;
    const ext = (src.split('.').pop() || 'png').toLowerCase();
    downloadLink.setAttribute('download', (alt || 'wanzz-payment') + '.' + ext);
    lightbox.classList.add('show');
  }
  function close() { lightbox.classList.remove('show'); }

  document.querySelectorAll('[data-zoom-src]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open(el.getAttribute('data-zoom-src'), el.getAttribute('data-zoom-alt'));
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
initZoomLightbox();

// ============ ENLARGE NUMBER MODAL (DANA/GoPay etc — no backend) ============
function initNumberModal() {
  const modal = document.getElementById('numberModal');
  if (!modal) return;
  const labelEl = document.getElementById('numberModalLabel');
  const valueEl = document.getElementById('numberModalValue');
  const closeBtn = document.getElementById('numberModalClose');
  const copyBtn = document.getElementById('numberModalCopy');
  let currentValue = '';

  function open(value, label) {
    currentValue = value;
    valueEl.textContent = value;
    labelEl.textContent = label || '';
    modal.classList.add('show');
    valueEl.classList.remove('pop');
    void valueEl.offsetWidth; // force reflow so the animation restarts every time
    valueEl.classList.add('pop');
  }
  function close() { modal.classList.remove('show'); }

  document.querySelectorAll('[data-enlarge-number]').forEach(el => {
    el.addEventListener('click', () => {
      open(el.getAttribute('data-enlarge-number'), el.getAttribute('data-enlarge-label'));
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(currentValue); } catch (e) {}
    showToast(`Nomor ${currentValue} disalin.`);
    copyBtn.textContent = 'Tersalin ✓';
    setTimeout(() => { copyBtn.textContent = 'Salin Nomor'; }, 1800);
  });
}
initNumberModal();

// ============ COPY REKENING / E-WALLET NUMBER ============
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const value = btn.getAttribute('data-copy-target');
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) { /* clipboard may be blocked; ignore silently */ }
    const original = btn.textContent;
    btn.textContent = 'Tersalin ✓';
    btn.classList.add('copied');
    showToast(`Nomor ${value} disalin.`);
    setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1800);
  });
});
