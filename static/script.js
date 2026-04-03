// ── DOM References ──────────────────────────────────────────────────────────
const fileInput   = document.getElementById('fileInput');
const uploadBox   = document.getElementById('uploadBox');
const fileChip    = document.getElementById('fileChip');
const fcName      = document.getElementById('fcName');
const fcSize      = document.getElementById('fcSize');
const fcIcon      = document.getElementById('fcIcon');
const fcRemove    = document.getElementById('fcRemove');
const analyzeBtn  = document.getElementById('analyzeBtn');
const loader      = document.getElementById('loader');
const loaderSub   = document.getElementById('loaderSub');
const results     = document.getElementById('results');
const errorBox    = document.getElementById('errorBox');
const errorText   = document.getElementById('errorText');
const resetBtn    = document.getElementById('resetBtn');

let selectedFile = null;
const fileIcons = { pdf:'📄', docx:'📝', doc:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️' };

function formatSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function getExt(name) { return name.split('.').pop().toLowerCase(); }

function handleFile(file) {
  selectedFile = file;
  const ext = getExt(file.name);
  fcIcon.textContent = fileIcons[ext] || '📄';
  fcName.textContent = file.name;
  fcSize.textContent = formatSize(file.size) + ' · ' + ext.toUpperCase();
  fileChip.style.display = 'flex';
  uploadBox.style.display = 'none';
  analyzeBtn.disabled = false;
  hideError();
}

fileInput.addEventListener('change', function() { if (this.files[0]) handleFile(this.files[0]); });

uploadBox.addEventListener('dragover',  e => { e.preventDefault(); uploadBox.classList.add('dragover'); });
uploadBox.addEventListener('dragleave', ()=> uploadBox.classList.remove('dragover'));
uploadBox.addEventListener('drop', e => {
  e.preventDefault(); uploadBox.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

fcRemove.addEventListener('click', resetUpload);

function resetUpload() {
  selectedFile = null; fileInput.value = '';
  fileChip.style.display = 'none';
  uploadBox.style.display = 'block';
  analyzeBtn.disabled = true;
}

// ── Loader ──────────────────────────────────────────────────────────────────
const steps = [
  'Reading file contents…',
  'Extracting text with OCR…',
  'AI analyzing document structure…',
  'Identifying entities & sentiment…',
  'Generating insights…'
];
let loaderTimer;

function startLoader() {
  loader.style.display = 'block';
  results.style.display = 'none';
  hideError();
  let i = 0;
  loaderSub.textContent = steps[0];
  loaderTimer = setInterval(() => {
    i = Math.min(i + 1, steps.length - 1);
    loaderSub.textContent = steps[i];
  }, 900);
}

function stopLoader() {
  clearInterval(loaderTimer);
  loader.style.display = 'none';
}

// ── Analyze ─────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async function() {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  startLoader();

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const res  = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    stopLoader();

    if (data.error) { showError(data.error); analyzeBtn.disabled = false; return; }
    showResults(data);
  } catch(err) {
    stopLoader();
    showError('Connection failed. Please check your server.');
    analyzeBtn.disabled = false;
  }
});

// ── Show Results ─────────────────────────────────────────────────────────────
function showResults(data) {
  const sentiment = (data.sentiment || 'neutral').toLowerCase();
  const entities  = data.entities || {};
  const summary   = data.summary  || 'No summary available.';

  // File name
  document.getElementById('rhFile').textContent = selectedFile ? selectedFile.name : '';

  // ── Stats ──
  const sentEl = document.getElementById('mSentiment');
  sentEl.textContent = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  const sentColors = { positive: '#34d399', negative: '#f87171', neutral: '#7a84a0' };
  document.getElementById('mIndicator').style.background = sentColors[sentiment] || sentColors.neutral;

  // Count total entities
  let totalEnt = 0;
  if (Array.isArray(entities)) {
    totalEnt = entities.length;
  } else {
    totalEnt = (entities.names||[]).length + (entities.dates||[]).length +
               (entities.organizations||[]).length + (entities.amounts||[]).length;
  }

  document.getElementById('mEntities').textContent = totalEnt;
  setTimeout(() => {
    document.getElementById('mEntitiesBar').style.width = Math.min(totalEnt * 8, 100) + '%';
  }, 200);

  // Sentences = key points
  const sentences = (summary.match(/[^.!?]+[.!?]+/g) || []).filter(s => s.trim().length > 20);
  document.getElementById('mPoints').textContent = sentences.length;
  setTimeout(() => {
    document.getElementById('mPointsBar').style.width = Math.min(sentences.length * 14, 100) + '%';
  }, 200);

  // ── Summary ──
  document.getElementById('summaryText').textContent = summary;

  // ── Sentiment card ──
  const badge = document.getElementById('sentBadge');
  badge.textContent = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
  badge.className = 'sent-badge ' + sentiment;

  const fill  = document.getElementById('sentFill');
  const thumb = document.getElementById('sentThumb');
  fill.className = 'sent-fill ' + sentiment;
  const pos = { positive: '85%', negative: '15%', neutral: '50%' }[sentiment] || '50%';
  setTimeout(() => { fill.style.width = pos; thumb.style.left = pos; }, 250);

  const descs = {
    positive: 'The document carries a positive, optimistic tone. Content reflects constructive or encouraging language.',
    negative: 'The document carries a critical or negative tone. Content reflects concerns, problems, or opposition.',
    neutral:  'The document maintains an objective, balanced tone. Content is factual and informational.'
  };
  document.getElementById('sentDesc').textContent = descs[sentiment] || '';

  // ── Entities ──
  const grid = document.getElementById('entGrid');
  grid.innerHTML = '';
  document.getElementById('entCount').textContent = totalEnt + ' found';

  if (Array.isArray(entities) && entities.length > 0) {
    // Old flat array format
    const tags = document.createElement('div');
    tags.className = 'ent-tags';
    entities.forEach(e => {
      const type = detectEntityType(e);
      tags.appendChild(makeTag(e, type));
    });
    grid.appendChild(tags);
  } else if (typeof entities === 'object') {
    // New structured format {names, dates, organizations, amounts}
    const sections = [
      { key: 'names',         label: '👤 People',        cls: 'ent-person'  },
      { key: 'organizations', label: '🏢 Organizations',  cls: 'ent-org'     },
      { key: 'dates',         label: '📅 Dates',          cls: 'ent-date'    },
      { key: 'amounts',       label: '💰 Amounts',        cls: 'ent-amount'  }
    ];

    let anyFound = false;
    sections.forEach(sec => {
      const items = entities[sec.key] || [];
      if (items.length === 0) return;
      anyFound = true;

      const section = document.createElement('div');

      const title = document.createElement('div');
      title.className = 'ent-section-title';
      title.textContent = sec.label;
      section.appendChild(title);

      const tags = document.createElement('div');
      tags.className = 'ent-tags';
      items.forEach(item => tags.appendChild(makeTag(item, sec.cls.replace('ent-', ''))));
      section.appendChild(tags);
      grid.appendChild(section);
    });

    if (!anyFound) {
      grid.innerHTML = '<span class="ent-empty">No entities detected in this document.</span>';
    }
  } else {
    grid.innerHTML = '<span class="ent-empty">No entities detected in this document.</span>';
  }

  // ── Key Points ──
  if (sentences.length > 0) {
    const kpCard = document.getElementById('kpCard');
    const kpList = document.getElementById('kpList');
    kpList.innerHTML = '';
    sentences.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'kp-item';
      div.innerHTML = `<span class="kp-num">${i + 1}</span><span>${s.trim()}</span>`;
      kpList.appendChild(div);
    });
    kpCard.style.display = 'block';
  }

  results.style.display = 'block';
  setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function makeTag(text, type) {
  const tag = document.createElement('span');
  tag.className = 'ent-tag ent-' + (type || 'default');
  tag.textContent = text;
  return tag;
}

function detectEntityType(entity) {
  const l = entity.toLowerCase();
  if (/\d{4}|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/.test(l)) return 'date';
  if (/\$|₹|€|£|\busd\b|\binr\b|million|billion|lakh|crore|thousand/.test(l)) return 'amount';
  if (/inc\.|ltd|corp|llc|company|org|university|college|institute|school|hospital|bank|pvt/.test(l)) return 'org';
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(entity)) return 'person';
  return 'default';
}

// ── Error ────────────────────────────────────────────────────────────────────
function showError(msg, isInfo = false) {
  errorText.textContent = msg;
  errorBox.style.display = 'flex';
  if (isInfo) {
    errorBox.style.background = 'rgba(91,156,246,0.08)';
    errorBox.style.borderColor = 'rgba(91,156,246,0.2)';
    errorBox.style.color = 'var(--blue)';
  } else {
    errorBox.style.background = 'rgba(248,113,113,0.08)';
    errorBox.style.borderColor = 'rgba(248,113,113,0.2)';
    errorBox.style.color = 'var(--red)';
  }
}
function hideError() { errorBox.style.display = 'none'; }

// ── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  results.style.display = 'none';
  hideError();
  document.getElementById('kpCard').style.display = 'none';
  resetUpload();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  analyzeBtn.disabled = true;
});

// ── Sidebar Nav ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    const page = this.dataset.page;
    if (page === 'history') {
      showError('🚧 History — coming soon! Your past analyses will appear here.', true);
      setTimeout(hideError, 3000);
    } else if (page === 'settings') {
      showThemePanel();
    }
  });
});

// ── Theme Panel ──────────────────────────────────────────────────────────────
const themes = {
  dark: {
    '--bg':'#080b12','--bg2':'#0d1120','--bg3':'#131929','--bg4':'#1a2235',
    '--border':'rgba(255,255,255,0.07)','--border2':'rgba(255,255,255,0.12)',
    '--text':'#eef0f8','--text2':'#7a84a0','--text3':'#3d4560',
    '--blue':'#5b9cf6','--blue2':'#3b7de8','--purple':'#a78bfa',
    '--green':'#34d399','--orange':'#fb923c','--red':'#f87171'
  },
  light: {
    '--bg':'#f0f4fd','--bg2':'#ffffff','--bg3':'#f4f6fb','--bg4':'#eaedf5',
    '--border':'rgba(0,0,0,0.08)','--border2':'rgba(0,0,0,0.14)',
    '--text':'#0f1324','--text2':'#4a5270','--text3':'#9aa0b8',
    '--blue':'#2563eb','--blue2':'#1d4ed8','--purple':'#7c3aed',
    '--green':'#059669','--orange':'#d97706','--red':'#dc2626'
  },
  midnight: {
    '--bg':'#05080f','--bg2':'#080d1a','--bg3':'#0d1525','--bg4':'#131e30',
    '--border':'rgba(255,255,255,0.06)','--border2':'rgba(255,255,255,0.1)',
    '--text':'#c8d8f0','--text2':'#5a70a0','--text3':'#2e3d58',
    '--blue':'#38bdf8','--blue2':'#0ea5e9','--purple':'#a78bfa',
    '--green':'#4ade80','--orange':'#f59e0b','--red':'#fb7185'
  }
};

let currentTheme = localStorage.getItem('documind-theme') || 'dark';
applyTheme(currentTheme);

function applyTheme(name) {
  const t = themes[name]; if (!t) return;
  Object.entries(t).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
  currentTheme = name;
  localStorage.setItem('documind-theme', name);
}

function showThemePanel() {
  const existing = document.getElementById('themePanel');
  if (existing) { existing.remove(); document.getElementById('themeOverlay')?.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'themeOverlay';
  Object.assign(overlay.style, {
    position:'fixed',inset:'0',background:'rgba(0,0,0,0.6)',
    zIndex:'9999',backdropFilter:'blur(4px)'
  });

  const panel = document.createElement('div');
  panel.id = 'themePanel';
  Object.assign(panel.style, {
    position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
    background:'var(--bg2)',border:'1px solid var(--border2)',
    borderRadius:'18px',padding:'28px',width:'320px',
    zIndex:'10000',boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
    fontFamily:"'DM Sans', sans-serif"
  });

  const opts = [
    { name:'dark',     label:'Dark',     desc:'Default dark mode',   dot:'#5b9cf6' },
    { name:'light',    label:'Light',    desc:'Clean light mode',     dot:'#2563eb' },
    { name:'midnight', label:'Midnight', desc:'Deep blue dark',       dot:'#38bdf8' },
  ];

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--text)">Settings</div>
      <button id="closeTheme" style="background:var(--bg4);border:1px solid var(--border);color:var(--text2);
        width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px;
        display:flex;align-items:center;justify-content:center;">✕</button>
    </div>
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;font-weight:600;">Choose Theme</div>
    <div id="themeGrid" style="display:flex;flex-direction:column;gap:8px;"></div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  const grid = document.getElementById('themeGrid');
  opts.forEach(t => {
    const opt = document.createElement('div');
    const isActive = currentTheme === t.name;
    opt.style.cssText = `cursor:pointer;padding:14px 16px;border-radius:12px;
      border:1.5px solid ${isActive ? 'var(--blue)' : 'var(--border)'};
      background:var(--bg3);display:flex;align-items:center;gap:12px;transition:all 0.15s;`;
    opt.innerHTML = `
      <div style="width:12px;height:12px;border-radius:50%;background:${t.dot};box-shadow:0 0 8px ${t.dot};flex-shrink:0;"></div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${t.label}</div>
        <div style="font-size:11px;color:var(--text3)">${t.desc}</div>
      </div>
      ${isActive ? `<div style="margin-left:auto;font-size:11px;color:var(--blue);font-weight:700;">Active</div>` : ''}
    `;
    opt.addEventListener('click', () => {
      applyTheme(t.name);
      grid.querySelectorAll('div').forEach(o => o.style.border = '1.5px solid var(--border)');
      opt.style.border = '1.5px solid var(--blue)';
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
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; });

let mx = window.innerWidth/2, my = window.innerHeight/2;
let cx = mx, cy = my;

const particles = [];
class Particle {
  constructor(x, y) {
    this.x=x; this.y=y;
    this.size=Math.random()*2.5+1.5; this.life=1;
    this.decay=Math.random()*0.03+0.02;
    this.vx=(Math.random()-0.5)*1; this.vy=(Math.random()-0.5)*1;
    const cols=['--blue','--purple','--green'];
    this.color=getComputedStyle(document.documentElement).getPropertyValue(cols[Math.floor(Math.random()*cols.length)]).trim();
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.life-=this.decay; this.size*=0.96; }
  draw() {
    ctx.save(); ctx.globalAlpha=this.life*0.6; ctx.fillStyle=this.color;
    ctx.shadowColor=this.color; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });

function setCursorColor(v) {
  const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  document.getElementById('cur-dot')?.setAttribute('fill', c);
  document.getElementById('cur-ring')?.setAttribute('stroke', c);
}

function animateCursor() {
  cx += (mx-cx)*0.1; cy += (my-cy)*0.1;
  cursorMain.style.left=cx+'px'; cursorMain.style.top=cy+'px';
  setCursorColor('--blue');
  if (Math.random()>0.5) particles.push(new Particle(cx,cy));
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let i=particles.length-1;i>=0;i--) {
    particles[i].update(); particles[i].draw();
    if (particles[i].life<=0) particles.splice(i,1);
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, label, .nav-item, .dz-cta, .analyze-btn, .reset-btn').forEach(el => {
  el.addEventListener('mouseenter', () => { cursorMain.classList.add('hovering'); setCursorColor('--purple'); });
  el.addEventListener('mouseleave', () => { cursorMain.classList.remove('hovering'); setCursorColor('--blue'); });
});

document.addEventListener('mousedown', () => {
  cursorMain.classList.add('clicking');
  for (let i=0;i<10;i++) {
    const p=new Particle(cx,cy); p.vx=(Math.random()-0.5)*8; p.vy=(Math.random()-0.5)*8;
    p.size=Math.random()*4+2; p.decay=0.05;
    p.color=getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
    particles.push(p);
  }
});
document.addEventListener('mouseup',    () => cursorMain.classList.remove('clicking'));
document.addEventListener('mouseleave', () => cursorMain.style.opacity='0');
document.addEventListener('mouseenter', () => cursorMain.style.opacity='1');