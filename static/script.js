const fileInput    = document.getElementById('fileInput');
const uploadBox    = document.getElementById('uploadBox');
const filePreview  = document.getElementById('filePreview');
const fpName       = document.getElementById('fpName');
const fpSize       = document.getElementById('fpSize');
const fpIcon       = document.getElementById('fpIcon');
const fpRemove     = document.getElementById('fpRemove');
const analyzeBtn   = document.getElementById('analyzeBtn');
const loader       = document.getElementById('loader');
const loaderSub    = document.getElementById('loaderSub');
const results      = document.getElementById('results');
const errorBox     = document.getElementById('errorBox');
const errorText    = document.getElementById('errorText');
const resetBtn     = document.getElementById('resetBtn');

let selectedFile = null;

const fileIcons = { pdf: '📄', docx: '📝', doc: '📝', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' };

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

function handleFile(file) {
  selectedFile = file;
  const ext = getExt(file.name);
  fpIcon.textContent = fileIcons[ext] || '📄';
  fpName.textContent = file.name;
  fpSize.textContent = formatSize(file.size) + ' · ' + ext.toUpperCase();
  filePreview.style.display = 'flex';
  uploadBox.style.display = 'none';
  analyzeBtn.disabled = false;
  errorBox.style.display = 'none';
}

fileInput.addEventListener('change', function () {
  if (this.files[0]) handleFile(this.files[0]);
});

uploadBox.addEventListener('dragover',  (e) => { e.preventDefault(); uploadBox.classList.add('dragover'); });
uploadBox.addEventListener('dragleave', ()  => uploadBox.classList.remove('dragover'));
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

fpRemove.addEventListener('click', resetUpload);

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.style.display = 'none';
  uploadBox.style.display = 'block';
  analyzeBtn.disabled = true;
}

// ── Loader ──────────────────────────────────────────────────────────────────

const loaderSteps = [
  'Reading file contents...',
  'Extracting text...',
  'AI is analyzing document...',
  'Preparing your results...'
];

let loaderInterval;

function startLoader() {
  loader.style.display = 'block';
  results.style.display = 'none';
  errorBox.style.display = 'none';
  let step = 0;
  loaderSub.textContent = loaderSteps[0];
  loaderInterval = setInterval(() => {
    step = Math.min(step + 1, loaderSteps.length - 1);
    loaderSub.textContent = loaderSteps[step];
  }, 900);
}

function stopLoader() {
  clearInterval(loaderInterval);
  loader.style.display = 'none';
}

// ── Analyze ─────────────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', async function () {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  startLoader();

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const response = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await response.json();
    stopLoader();

    if (data.error) { showError(data.error); analyzeBtn.disabled = false; return; }
    showResults(data);
  } catch (err) {
    stopLoader();
    showError('Connection failed. Is the server running?');
    analyzeBtn.disabled = false;
  }
});

// ── Show Results ─────────────────────────────────────────────────────────────

function showResults(data) {
  const sentiment = (data.sentiment || 'neutral').toLowerCase();
  const entities  = data.entities || [];
  const summary   = data.summary || '';
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];

  document.getElementById('rhFile').textContent = selectedFile ? selectedFile.name : '';

  // Metrics
  document.getElementById('mSentiment').textContent = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  const indicatorColors = { positive: '#34d399', negative: '#f87171', neutral: '#8b92a8' };
  document.getElementById('mIndicator').style.background = indicatorColors[sentiment] || '#8b92a8';

  document.getElementById('mEntities').textContent = entities.length;
  setTimeout(() => {
    document.getElementById('mEntitiesBar').style.width = Math.min(entities.length * 10, 100) + '%';
  }, 100);

  document.getElementById('mPoints').textContent = sentences.length;
  setTimeout(() => {
    document.getElementById('mPointsBar').style.width = Math.min(sentences.length * 15, 100) + '%';
  }, 100);

  // Summary
  document.getElementById('summaryText').textContent = summary || 'No summary available.';

  // Sentiment visual
  const badge = document.getElementById('sentBadge');
  badge.textContent = sentiment;
  badge.className = 'rc-badge ' + sentiment;

  const fill  = document.getElementById('sentFill');
  const thumb = document.getElementById('sentThumb');
  fill.className = 'sent-fill ' + sentiment;
  const positions = { positive: '85%', negative: '15%', neutral: '50%' };
  const pos = positions[sentiment] || '50%';
  setTimeout(() => {
    fill.style.width = pos;
    thumb.style.left = pos;
  }, 200);

  const descs = {
    positive: 'The document carries a positive and optimistic tone overall.',
    negative: 'The document carries a negative or critical tone overall.',
    neutral:  'The document maintains an objective and neutral tone overall.'
  };
  document.getElementById('sentDesc').textContent = descs[sentiment] || '';

  // Entities
  const grid = document.getElementById('entGrid');
  grid.innerHTML = '';
  document.getElementById('entCount').textContent = entities.length + ' found';
  if (entities.length > 0) {
    entities.forEach(entity => {
      const type = detectType(entity);
      const icons = { person: '👤', org: '🏢', location: '📍', date: '📅', amount: '💰', default: '·' };
      const tag = document.createElement('span');
      tag.className = 'ent-tag ent-' + type;
      tag.textContent = icons[type] + ' ' + entity;
      grid.appendChild(tag);
    });
  } else {
    grid.innerHTML = '<span style="color:var(--text3);font-size:12px;">No entities detected</span>';
  }

  // Key Points
  if (sentences.length > 1) {
    const kpCard = document.getElementById('kpCard');
    const kpList = document.getElementById('kpList');
    kpList.innerHTML = '';
    sentences.forEach((s, i) => {
      if (s.trim().length > 15) {
        const div = document.createElement('div');
        div.className = 'kp-item';
        div.innerHTML = `<span class="kp-num">${i + 1}</span><span>${s.trim()}</span>`;
        kpList.appendChild(div);
      }
    });
    kpCard.style.display = 'block';
  }

  results.style.display = 'block';
  results.scrollIntoView({ behavior: 'smooth' });
}

// ── Entity Type Detection ────────────────────────────────────────────────────

function detectType(entity) {
  const lower = entity.toLowerCase();
  if (/\d{4}|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/.test(lower)) return 'date';
  if (/\$|₹|€|£|\busd\b|\binr\b|million|billion|thousand|lakh|crore/.test(lower)) return 'amount';
  if (/inc\.|ltd|corp|llc|company|org|university|college|institute|school|hospital|bank|pvt/.test(lower)) return 'org';
  if (/street|city|state|country|road|avenue|district|village|town|india|usa|uk|chennai|delhi|mumbai/.test(lower)) return 'location';
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(entity)) return 'person';
  return 'default';
}

// ── Error ────────────────────────────────────────────────────────────────────

function showError(msg) {
  errorText.textContent = msg;
  errorBox.style.display = 'flex';
  errorBox.style.background = 'rgba(248,113,113,0.1)';
  errorBox.style.borderColor = 'rgba(248,113,113,0.2)';
  errorBox.style.color = 'var(--red)';
}

// ── Reset ────────────────────────────────────────────────────────────────────

resetBtn.addEventListener('click', () => {
  results.style.display = 'none';
  errorBox.style.display = 'none';
  document.getElementById('kpCard').style.display = 'none';
  resetUpload();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Sidebar Navigation ───────────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    const text = this.textContent.trim();
    if (text === 'History') {
      showComingSoon('History — coming soon! All your past analyses will appear here.');
    } else if (text === 'Settings') {
      showThemePanel();
    } else if (text === 'Analyze') {
      errorBox.style.display = 'none';
    }
  });
});

document.querySelector('.sidebar-footer').addEventListener('click', () => {
  showComingSoon('Profile management coming soon!');
});

function showComingSoon(msg) {
  errorText.textContent = '🚧 ' + msg;
  errorBox.style.display = 'flex';
  errorBox.style.background = 'rgba(79,142,247,0.1)';
  errorBox.style.borderColor = 'rgba(79,142,247,0.2)';
  errorBox.style.color = 'var(--blue)';
  setTimeout(() => { errorBox.style.display = 'none'; }, 3000);
}

// ── Theme Switcher ───────────────────────────────────────────────────────────

const themes = {
  dark: {
    '--bg': '#0f1117', '--bg2': '#161b27', '--bg3': '#1e2535',
    '--border': '#2a3047', '--text': '#e8eaf0', '--text2': '#8b92a8',
    '--text3': '#555f7a', '--blue': '#4f8ef7', '--purple': '#9b6dff',
    '--green': '#34d399', '--orange': '#fb923c', '--red': '#f87171'
  },
  light: {
    '--bg': '#f4f6fb', '--bg2': '#ffffff', '--bg3': '#f0f2f8',
    '--border': '#e0e4f0', '--text': '#1a1d2e', '--text2': '#555f7a',
    '--text3': '#9aa0b8', '--blue': '#3a6ef0', '--purple': '#7c4dff',
    '--green': '#059669', '--orange': '#ea6f1a', '--red': '#dc2626'
  },
  midnight: {
    '--bg': '#080c14', '--bg2': '#0f1520', '--bg3': '#16202e',
    '--border': '#1e2d40', '--text': '#cdd9f0', '--text2': '#6b7fa0',
    '--text3': '#3d4f6a', '--blue': '#38bdf8', '--purple': '#a78bfa',
    '--green': '#4ade80', '--orange': '#f59e0b', '--red': '#fb7185'
  },
  forest: {
    '--bg': '#0d1410', '--bg2': '#131d16', '--bg3': '#1a2a1e',
    '--border': '#243628', '--text': '#d4e8d8', '--text2': '#7a9e82',
    '--text3': '#4a6650', '--blue': '#4ade80', '--purple': '#86efac',
    '--green': '#34d399', '--orange': '#fbbf24', '--red': '#f87171'
  },
  sunset: {
    '--bg': '#16080f', '--bg2': '#200e17', '--bg3': '#2a1420',
    '--border': '#3d1e2d', '--text': '#f0d4e0', '--text2': '#a07080',
    '--text3': '#6a3f50', '--blue': '#f472b6', '--purple': '#c084fc',
    '--green': '#34d399', '--orange': '#fb923c', '--red': '#f87171'
  }
};

let currentTheme = localStorage.getItem('theme') || 'dark';
applyTheme(currentTheme);

function applyTheme(name) {
  const t = themes[name];
  if (!t) return;
  Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  currentTheme = name;
  localStorage.setItem('theme', name);
}

function showThemePanel() {
  const existing = document.getElementById('themePanel');
  if (existing) { existing.remove(); document.getElementById('themeOverlay')?.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'themeOverlay';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    z-index:999; backdrop-filter:blur(2px);
  `;

  const panel = document.createElement('div');
  panel.id = 'themePanel';
  panel.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background:var(--bg2); border:1px solid var(--border);
    border-radius:16px; padding:28px; width:340px;
    z-index:1000; box-shadow:0 24px 60px rgba(0,0,0,0.5);
    font-family:'Inter',sans-serif;
  `;

  const themeOptions = [
    { name: 'dark',     label: 'Dark',     desc: 'Default dark mode',  colors: ['#0f1117','#161b27','#4f8ef7'] },
    { name: 'light',    label: 'Light',    desc: 'Clean light mode',   colors: ['#f4f6fb','#ffffff','#3a6ef0'] },
    { name: 'midnight', label: 'Midnight', desc: 'Deep blue dark',     colors: ['#080c14','#0f1520','#38bdf8'] },
    { name: 'forest',   label: 'Forest',   desc: 'Green dark mode',    colors: ['#0d1410','#131d16','#4ade80'] },
    { name: 'sunset',   label: 'Sunset',   desc: 'Warm pink dark',     colors: ['#16080f','#200e17','#f472b6'] },
  ];

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text);">Settings</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">Choose your theme</div>
      </div>
      <button id="closeTheme" style="background:var(--bg3);border:none;color:var(--text2);
        width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;
        display:flex;align-items:center;justify-content:center;">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="themeGrid"></div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  const grid = document.getElementById('themeGrid');
  themeOptions.forEach((t, idx) => {
    const opt = document.createElement('div');
    opt.dataset.theme = t.name;
    opt.style.cssText = `
      cursor:pointer; padding:14px; border-radius:10px;
      border:2px solid ${currentTheme === t.name ? 'var(--blue)' : 'var(--border)'};
      background:var(--bg3); transition:all 0.15s;
      ${idx === 4 ? 'grid-column:1 / -1;' : ''}
    `;
    opt.innerHTML = `
      <div style="display:flex;gap:5px;margin-bottom:8px;">
        ${t.colors.map(c => `<div style="width:10px;height:10px;border-radius:50%;background:${c};border:1px solid rgba(255,255,255,0.1);"></div>`).join('')}
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--text);">${t.label}</div>
      <div style="font-size:11px;color:var(--text3);">${t.desc}</div>
    `;

    opt.addEventListener('click', function() {
      applyTheme(t.name);
      grid.querySelectorAll('div[data-theme]').forEach(o => {
        o.style.border = '2px solid var(--border)';
      });
      this.style.border = '2px solid var(--blue)';
    });

    opt.addEventListener('mouseenter', function() {
      if (t.name !== currentTheme) this.style.border = '2px solid var(--text3)';
    });
    opt.addEventListener('mouseleave', function() {
      if (t.name !== currentTheme) this.style.border = '2px solid var(--border)';
    });

    grid.appendChild(opt);
  });

  document.getElementById('closeTheme').addEventListener('click', closeThemePanel);
  overlay.addEventListener('click', closeThemePanel);
}

function closeThemePanel() {
  document.getElementById('themePanel')?.remove();
  document.getElementById('themeOverlay')?.remove();
}

// ── Custom Cursor ────────────────────────────────────────────────────────────

const cursorMain = document.getElementById('cursor-main');
const canvas     = document.getElementById('cursor-trail');
const ctx        = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

let mouseX = window.innerWidth  / 2;
let mouseY = window.innerHeight / 2;
let curX   = window.innerWidth  / 2;
let curY   = window.innerHeight / 2;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

const particles = [];

class Particle {
  constructor(x, y) {
    this.x     = x;
    this.y     = y;
    this.size  = Math.random() * 3 + 2;
    this.life  = 1;
    this.decay = Math.random() * 0.035 + 0.02;
    this.vx    = (Math.random() - 0.5) * 1.2;
    this.vy    = (Math.random() - 0.5) * 1.2;
    const vars = ['--blue', '--purple', '--green', '--orange'];
    this.color = getThemeColor(vars[Math.floor(Math.random() * vars.length)]);
  }
  update() {
    this.x    += this.vx;
    this.y    += this.vy;
    this.life -= this.decay;
    this.size *= 0.95;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.life * 0.75;
    ctx.fillStyle   = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function updateCursorColors(colorVar) {
  const dot  = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  const color = getThemeColor(colorVar);
  if (dot)  dot.setAttribute('fill', color);
  if (ring) ring.setAttribute('stroke', color);
}

// Smooth animation loop
function animate() {
  // Smooth lerp — cursor follows mouse with lag
  curX += (mouseX - curX) * 0.08;
  curY += (mouseY - curY) * 0.08;

  cursorMain.style.left = curX + 'px';
  cursorMain.style.top  = curY + 'px';

  // Update color live from theme
  updateCursorColors('--blue');

  // Spawn trail
  if (Math.random() > 0.4) {
    particles.push(new Particle(curX, curY));
  }

  // Draw particles
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  requestAnimationFrame(animate);
}
animate();

// Hover
document.querySelectorAll('a, button, label, .nav-item, .dz-btn, .analyze-btn, .new-btn, .reset-btn')
  .forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorMain.classList.add('hovering');
      updateCursorColors('--purple');
    });
    el.addEventListener('mouseleave', () => {
      cursorMain.classList.remove('hovering');
      updateCursorColors('--blue');
    });
  });

// Click burst
document.addEventListener('mousedown', () => {
  cursorMain.classList.add('clicking');
  for (let i = 0; i < 12; i++) {
    const p = new Particle(curX, curY);
    p.vx    = (Math.random() - 0.5) * 10;
    p.vy    = (Math.random() - 0.5) * 10;
    p.size  = Math.random() * 5 + 3;
    p.decay = 0.05;
    p.color = getThemeColor('--green');
    particles.push(p);
  }
});

document.addEventListener('mouseup',    () => cursorMain.classList.remove('clicking'));
document.addEventListener('mouseleave', () => cursorMain.style.opacity = '0');
document.addEventListener('mouseenter', () => cursorMain.style.opacity = '1');