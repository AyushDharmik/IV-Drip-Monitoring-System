// ================================================
// js/auth.js - Login / Logout / Session
// ================================================

// ── Save user session after login ────────────────
function saveSession(token, user) {
  localStorage.setItem('mf_token', token);
  localStorage.setItem('mf_user',  JSON.stringify(user));
}

// ── Get current user ──────────────────────────────
function getUser() {
  const u = localStorage.getItem('mf_user');
  return u ? JSON.parse(u) : null;
}

// ── Check if logged in ────────────────────────────
function isLoggedIn() {
  return !!localStorage.getItem('mf_token');
}

// ── Logout ────────────────────────────────────────
function logout() {
  localStorage.removeItem('mf_token');
  localStorage.removeItem('mf_user');
  window.location.href = '/index.html';
}

// ── Guard: redirect if not logged in ─────────────
function requireAuth(role) {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
    return false;
  }
  const user = getUser();
  if (role && user.role !== role) {
    // Wrong role — send to correct dashboard
    if (user.role === 'admin') {
      window.location.href = '/admin/dashboard.html';
    } else {
      window.location.href = '/nurse/dashboard.html';
    }
    return false;
  }
  return true;
}

// ── Fill sidebar user info ────────────────────────
function fillSidebarUser() {
  const user = getUser();
  if (!user) return;
  const nameEl   = document.getElementById('sidebarName');
  const roleEl   = document.getElementById('sidebarRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (nameEl)   nameEl.textContent   = user.name;
  if (roleEl)   roleEl.textContent   = user.role === 'admin' ? 'Administrator' : 'Nurse';
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

// ── Dark mode ─────────────────────────────────────
function initDarkMode() {
  if (localStorage.getItem('mf_dark') === '1') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = 'fa-solid fa-sun';
  }
}
function toggleDarkMode() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  localStorage.setItem('mf_dark', dark ? '0' : '1');
}

// ── Sidebar toggle (mobile) ───────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ── Toast notification ────────────────────────────
let toastTimeout;
function showToast(title, msg, level = 'critical') {
  const toast  = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastTitle').textContent = msg ? title : 'Alert';
  document.getElementById('toastMsg').textContent   = msg || title;

  const colors = { critical:'#ef4444', warning:'#f59e0b', info:'#1d6ef5', success:'#22c55e' };
  toast.style.borderLeftColor = colors[level] || colors.critical;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 5000);
}
function closeToast() {
  document.getElementById('toast')?.classList.remove('show');
}

// ── Beep sound ────────────────────────────────────
let audioCtx;
function playBeep(freq = 880, vol = 0.5) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
  } catch(e) {}
}