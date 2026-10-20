// House Clipper - Frontend Controller (v1.3.0 - Ultimate Visual Edition)
let ytPlayer = null;
let ytPlayerReady = false;
let currentVideoDuration = 0;
let timeUpdateInterval = null;
let isPreviewing = false;
let currentPollingTaskId = null;
let currentVideoUrl = "";
let hasBackend = false;
let pipObserver = null;
let pipDismissed = false;

// Elementos DOM
const startMinInput = document.getElementById("start-min-input");
const startSecInput = document.getElementById("start-sec-input");
const endMinInput = document.getElementById("end-min-input");
const endSecInput = document.getElementById("end-sec-input");

const sliderStart = document.getElementById("slider-start");
const sliderEnd = document.getElementById("slider-end");
const clipDurationBadge = document.getElementById("clip-duration-badge");
const sliderRangeText = document.getElementById("slider-range-text");
const timelineSelectionBar = document.getElementById("timeline-selection-bar");
const timelinePlayhead = document.getElementById("timeline-playhead");
const minuteRuler = document.getElementById("minute-ruler");

const hoverTimeBubble = document.getElementById("hover-time-bubble");
const hoverVerticalLine = document.getElementById("hover-vertical-line");

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  setupSliders();
  initTheme();
  checkBackendConnection();

  document.getElementById("clip-url-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadClipVideo();
  });

  document.getElementById("full-url-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadFullVideo();
  });
});

// ============================================
// VERIFICAÇÃO DE AMBIENTE E BACKEND
// ============================================
async function checkBackendConnection() {
  const indicator = document.getElementById("backend-status-indicator");
  const envBadge = document.getElementById("env-badge");
  
  try {
    const res = await fetch("/api/health", { method: "GET" });
    if (res.ok) {
      hasBackend = true;
      if (indicator) {
        indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Conectado Local`;
        indicator.className = "text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5";
      }
      if (envBadge) envBadge.innerText = "DESKTOP";
      loadConfig();
      loadHistory();
      checkCookiesStatus();
      return;
    }
  } catch (e) {}

  hasBackend = false;
  if (indicator) {
    indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Modo Web Pages`;
    indicator.className = "text-[11px] text-amber-300 font-medium flex items-center gap-1.5";
  }
  if (envBadge) {
    envBadge.innerText = "PAGES WEB";
    envBadge.className = "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40";
  }

  const headerFolderBtn = document.getElementById("header-folder-btn");
  if (headerFolderBtn) headerFolderBtn.style.display = "none";
  const notepadBtn = document.getElementById("btn-open-cookies-notepad");
  if (notepadBtn) notepadBtn.style.display = "none";
  const currentFolderDisp = document.getElementById("current-folder-display");
  if (currentFolderDisp) currentFolderDisp.innerText = "Modo Web Online (GitHub Pages)";
}

// ============================================
// SISTEMA DE TEMAS E FILTROS DE CORES
// (Amarelo, Azul, Vermelho, Verde, Roxo, Rosa, Noturno)
// ============================================
const VALID_THEMES = ["burnt_yellow", "blue", "red", "green", "purple", "pink", "dark_amber"];

function initTheme() {
  const savedTheme = localStorage.getItem("house_clipper_theme") || "burnt_yellow";
  setTheme(savedTheme, false);
}

function setTheme(themeName, persist = true) {
  if (!VALID_THEMES.includes(themeName)) themeName = "burnt_yellow";

  // Remove classes anteriores de temas
  const classesToRemove = ["theme-burnt-yellow", "theme-blue", "theme-red", "theme-green", "theme-purple", "theme-pink", "theme-dark-amber"];
  document.body.classList.remove(...classesToRemove);

  if (themeName === "dark_amber") {
    document.body.classList.add("theme-dark-amber");
  } else if (themeName !== "burnt_yellow") {
    document.body.classList.add(`theme-${themeName}`);
  }

  // Atualiza pílulas de cores no topo
  const btns = document.querySelectorAll(".color-theme-btn");
  btns.forEach(btn => {
    if (btn.dataset.theme === themeName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Atualiza botão Noturno
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");
  if (themeName === "dark_amber") {
    if (text) text.innerText = "Âmbar Dourado";
    if (icon) icon.setAttribute("data-lucide", "sun");
  } else {
    if (text) text.innerText = "Noturno Escuro";
    if (icon) icon.setAttribute("data-lucide", "moon");
  }
  lucide.createIcons();

  if (persist) {
    localStorage.setItem("house_clipper_theme", themeName);
    if (hasBackend) {
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeName })
      }).catch(() => {});
    }
  }

  highlightWaveformRange();
}

function toggleTheme() {
  const current = localStorage.getItem("house_clipper_theme") || "burnt_yellow";
  if (current === "dark_amber") {
    setTheme("burnt_yellow");
  } else {
    setTheme("dark_amber");
  }
}

function applyTheme(isDarkAmber) {
  setTheme(isDarkAmber ? "dark_amber" : "burnt_yellow");
}

// Alternância de Abas
function switchTab(tabName) {
  const tabs = ["clip", "full", "history"];
  tabs.forEach(tab => {
    const view = document.getElementById(`view-${tab}`);
    const btn = document.getElementById(`tab-${tab}`);
    if (tab === tabName) {
      view.classList.remove("hidden");
      view.classList.add("animate-fade-in");
      btn.className = "tab-btn active px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 text-amber-200 bg-amber-600/30 border border-amber-500/40 shadow-sm";
    } else {
      view.classList.add("hidden");
      btn.className = "tab-btn px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 text-amber-200/60 hover:text-amber-100 hover:bg-amber-950/40";
    }
  });

  if (tabName === "history") {
    if (hasBackend) {
      loadHistory();
      loadConfig();
      checkCookiesStatus();
    }
  }
}

// Extração do ID do YouTube
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

// Formatações
function secondsToMinutesAndSeconds(totalSec) {
  totalSec = Math.max(0, Math.round(totalSec * 10) / 10);
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return { minutes: m, seconds: s, total: totalSec };
}

function formatTimeString(totalSec) {
  const { minutes, seconds } = secondsToMinutesAndSeconds(totalSec);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ============================================
// CONTROLE DE VELOCIDADE DE REPRODUÇÃO (QoL 10)
// ============================================
function setPlayerSpeed(rate) {
  if (!ytPlayer || !ytPlayer.setPlaybackRate) return;
  ytPlayer.setPlaybackRate(rate);
  
  const speeds = [1.0, 1.25, 1.5, 2.0];
  const ids = ["spd-10", "spd-125", "spd-15", "spd-20"];
  speeds.forEach((s, idx) => {
    const el = document.getElementById(ids[idx]);
    if (!el) return;
    if (s === rate) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

// ============================================
// MÁSCARA VISUAL DE ENQUADRAMENTO (QoL Visual 2)
// ============================================
function toggleOverlayGuide(type) {
  const g916 = document.getElementById("overlay-guide-916");
  const g11 = document.getElementById("overlay-guide-11");
  const btn916 = document.getElementById("btn-guide-916");
  const btn11 = document.getElementById("btn-guide-11");

  if (type === "916") {
    const isHidden = g916.classList.contains("hidden");
    g916.classList.toggle("hidden");
    g11.classList.add("hidden");
    btn916.classList.toggle("bg-amber-500", isHidden);
    btn916.classList.toggle("text-black", isHidden);
    btn11.classList.remove("bg-amber-500", "text-black");
  } else if (type === "11") {
    const isHidden = g11.classList.contains("hidden");
    g11.classList.toggle("hidden");
    g916.classList.add("hidden");
    btn11.classList.toggle("bg-amber-500", isHidden);
    btn11.classList.toggle("text-black", isHidden);
    btn916.classList.remove("bg-amber-500", "text-black");
  }
}

// ============================================
// BALÃO FLUTUANTE DE MINUTO NA TIMELINE (QoL Visual 1)
// ============================================
function onTimelineHover(e) {
  if (currentVideoDuration <= 0) return;
  const container = document.getElementById("timeline-interactive-container");
  const rect = container.getBoundingClientRect();
  const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const percent = mouseX / rect.width;
  const hoverSec = percent * currentVideoDuration;

  if (hoverTimeBubble && hoverVerticalLine) {
    hoverTimeBubble.classList.remove("hidden");
    hoverVerticalLine.classList.remove("hidden");

    hoverTimeBubble.style.left = `${mouseX}px`;
    hoverTimeBubble.innerText = `⏱️ ${formatTimeString(hoverSec)}`;
    hoverVerticalLine.style.left = `${mouseX}px`;
  }
}

function onTimelineLeave() {
  if (hoverTimeBubble) hoverTimeBubble.classList.add("hidden");
  if (hoverVerticalLine) hoverVerticalLine.classList.add("hidden");
}

// ============================================
// ONDA SONORA DINÂMICA NA TIMELINE (QoL Visual 3)
// ============================================
function generateWaveformBars() {
  const container = document.getElementById("waveform-container");
  if (!container) return;
  container.innerHTML = "";
  
  const barCount = 72;
  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    const wave = Math.abs(
      Math.sin(t * 16) * 0.45 +
      Math.sin(t * 33 + 1.2) * 0.3 +
      Math.cos(t * 67 + 0.5) * 0.25
    );
    const heightPercent = Math.min(95, Math.max(18, Math.round(wave * 88 + 12)));
    
    const bar = document.createElement("div");
    bar.className = "waveform-bar";
    bar.style.height = `${heightPercent}%`;
    bar.dataset.percent = (t * 100).toFixed(1);
    container.appendChild(bar);
  }
  highlightWaveformRange();
}

function highlightWaveformRange() {
  if (currentVideoDuration <= 0) return;
  const startSec = getStartSeconds();
  const endSec = getEndSeconds();
  const startPct = (startSec / currentVideoDuration) * 100;
  const endPct = (endSec / currentVideoDuration) * 100;
  
  const style = getComputedStyle(document.body);
  const primaryColor = style.getPropertyValue('--theme-light').trim() || "#fbbf24";
  const dimColor = style.getPropertyValue('--theme-secondary').trim() || "#d97706";

  const bars = document.querySelectorAll("#waveform-container .waveform-bar");
  bars.forEach(bar => {
    const pct = parseFloat(bar.dataset.percent || 0);
    if (pct >= startPct && pct <= endPct) {
      bar.style.opacity = "0.95";
      bar.style.backgroundColor = primaryColor;
      bar.style.boxShadow = `0 0 5px ${primaryColor}`;
    } else {
      bar.style.opacity = "0.22";
      bar.style.backgroundColor = dimColor;
      bar.style.boxShadow = "none";
    }
  });
}

// ============================================
// STICKY MINI-PLAYER FLUTUANTE (QoL Visual 4)
// ============================================
function setupStickyPiP() {
  const anchor = document.getElementById("player-anchor");
  const wrapper = document.getElementById("yt-player-wrapper");
  const badge = document.getElementById("pip-badge");
  if (!anchor || !wrapper || !window.IntersectionObserver) return;

  if (pipObserver) pipObserver.disconnect();
  pipDismissed = false;

  pipObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const workspace = document.getElementById("clip-workspace");
      if (!workspace || workspace.classList.contains("hidden")) return;
      if (pipDismissed) return;

      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        wrapper.classList.add("sticky-pip-active");
        if (badge) badge.classList.remove("hidden");
      } else {
        wrapper.classList.remove("sticky-pip-active");
        if (badge) badge.classList.add("hidden");
      }
    });
  }, { threshold: 0.15 });

  pipObserver.observe(anchor);
}

function dismissPiP(e) {
  if (e) e.stopPropagation();
  pipDismissed = true;
  const wrapper = document.getElementById("yt-player-wrapper");
  const badge = document.getElementById("pip-badge");
  if (wrapper) wrapper.classList.remove("sticky-pip-active");
  if (badge) badge.classList.add("hidden");
}

// ============================================
// PULSO NEON DOURADO NO LOGO (QoL Visual 5)
// ============================================
function setNeonPulse(active) {
  const logo = document.getElementById("header-house-logo");
  if (!logo) return;
  if (active) {
    logo.classList.add("house-pulse-neon");
  } else {
    logo.classList.remove("house-pulse-neon");
  }
}

// Inicialização YouTube Player
function onYouTubeIframeAPIReady() {
  ytPlayerReady = true;
}

function initOrUpdatePlayer(videoId) {
  if (!window.YT || !window.YT.Player) {
    setTimeout(() => initOrUpdatePlayer(videoId), 200);
    return;
  }

  if (ytPlayer) {
    ytPlayer.loadVideoById(videoId);
  } else {
    ytPlayer = new YT.Player("yt-player-container", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1
      },
      events: {
        onReady: (event) => onPlayerReady(event),
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING && isPreviewing) {
            checkPreviewEnd();
          }
        }
      }
    });
  }
}

function onPlayerReady(event) {
  ytPlayerReady = true;
  updateVideoDuration();

  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  timeUpdateInterval = setInterval(updatePlayerTimeTracker, 100);
}

function updateVideoDuration() {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const dur = ytPlayer.getDuration();
  if (dur && dur > 0) {
    currentVideoDuration = dur;
    document.getElementById("player-badge-duration").innerText = formatTimeString(dur);
    
    sliderStart.max = dur;
    sliderEnd.max = dur;
    
    const initialEnd = Math.min(30, dur);
    setStartSeconds(0);
    setEndSeconds(initialEnd);
    
    if (typeof updateTimelineWindow === "function") {
      updateTimelineWindow();
    } else {
      renderMinuteRuler(dur);
    }
    generateWaveformBars();
    updateTimelineSelectionVisual();
    setupStickyPiP();
  } else {
    setTimeout(updateVideoDuration, 400);
  }
}

function updatePlayerTimeTracker() {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const current = ytPlayer.getCurrentTime();
  document.getElementById("player-current-time-display").innerText = formatTimeString(current);

  if (currentVideoDuration > 0) {
    const playheadPercent = (current / currentVideoDuration) * 100;
    timelinePlayhead.style.left = `${Math.min(100, Math.max(0, playheadPercent))}%`;
  }

  if (isPreviewing) {
    const endSec = getEndSeconds();
    if (current >= endSec) {
      ytPlayer.pauseVideo();
      isPreviewing = false;
    }
  }
}

// Régua Visual de Minutos
function renderMinuteRuler(duration) {
  if (!minuteRuler) return;
  minuteRuler.innerHTML = "";
  
  const totalMinutes = Math.ceil(duration / 60);
  
  for (let m = 0; m <= totalMinutes; m++) {
    const sec = m * 60;
    if (sec > duration && m > 0) break;
    
    const pill = document.createElement("button");
    pill.className = "minute-pill";
    pill.innerText = `${String(m).padStart(2, "0")}:00`;
    pill.title = `Pular para o minuto ${m}`;
    pill.onclick = () => {
      if (ytPlayer && ytPlayer.seekTo) {
        ytPlayer.seekTo(sec, true);
      }
    };
    minuteRuler.appendChild(pill);
  }
}

// Helpers de Tempo
function getStartSeconds() {
  const m = parseInt(startMinInput.value) || 0;
  const s = parseInt(startSecInput.value) || 0;
  return (m * 60) + s;
}

function getEndSeconds() {
  const m = parseInt(endMinInput.value) || 0;
  const s = parseInt(endSecInput.value) || 0;
  return (m * 60) + s;
}

function setStartSeconds(totalSec) {
  const { minutes, seconds } = secondsToMinutesAndSeconds(totalSec);
  startMinInput.value = minutes;
  startSecInput.value = seconds;
  sliderStart.value = totalSec;
  updateTimelineSelectionVisual();
}

function setEndSeconds(totalSec) {
  const { minutes, seconds } = secondsToMinutesAndSeconds(totalSec);
  endMinInput.value = minutes;
  endSecInput.value = seconds;
  sliderEnd.value = totalSec;
  updateTimelineSelectionVisual();
}

function syncFromSeparateInputs() {
  const start = getStartSeconds();
  const end = getEndSeconds();
  sliderStart.value = start;
  sliderEnd.value = end;
  updateTimelineSelectionVisual();
}

function setupSliders() {
  sliderStart.addEventListener("input", () => {
    let startVal = parseFloat(sliderStart.value);
    let endVal = parseFloat(sliderEnd.value);
    if (startVal >= endVal) {
      startVal = Math.max(0, endVal - 0.5);
      sliderStart.value = startVal;
    }
    setStartSeconds(startVal);
    if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(startVal, true);
  });

  sliderEnd.addEventListener("input", () => {
    let startVal = parseFloat(sliderStart.value);
    let endVal = parseFloat(sliderEnd.value);
    if (endVal <= startVal) {
      endVal = startVal + 0.5;
      sliderEnd.value = endVal;
    }
    setEndSeconds(endVal);
  });
}

function updateTimelineSelectionVisual() {
  const start = getStartSeconds();
  const end = getEndSeconds();
  const diff = Math.max(0, end - start);

  clipDurationBadge.innerText = `${formatTimeString(diff)} (${diff.toFixed(1)}s)`;
  sliderRangeText.innerText = `${formatTimeString(start)} até ${formatTimeString(end)}`;

  if (currentVideoDuration > 0) {
    const leftPercent = (start / currentVideoDuration) * 100;
    const widthPercent = (diff / currentVideoDuration) * 100;
    timelineSelectionBar.style.left = `${Math.min(100, Math.max(0, leftPercent))}%`;
    timelineSelectionBar.style.width = `${Math.min(100, Math.max(0, widthPercent))}%`;
    highlightWaveformRange();
  }
}

function setStartToCurrent() {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const current = Math.round(ytPlayer.getCurrentTime() * 10) / 10;
  setStartSeconds(current);
  
  const end = getEndSeconds();
  if (current >= end) {
    setEndSeconds(current + 15);
  }
}

function setEndToCurrent() {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const current = Math.round(ytPlayer.getCurrentTime() * 10) / 10;
  const start = getStartSeconds();
  
  if (current <= start) {
    alert("O ponto final deve ser maior que o ponto inicial!");
    return;
  }
  setEndSeconds(current);
}

function seekRelative(deltaSeconds) {
  if (!ytPlayer || !ytPlayer.getCurrentTime) return;
  const current = ytPlayer.getCurrentTime();
  const target = Math.max(0, Math.min(currentVideoDuration || 999999, current + deltaSeconds));
  ytPlayer.seekTo(target, true);
}

function adjustStart(delta) {
  let val = getStartSeconds() + delta;
  val = Math.max(0, Math.round(val * 10) / 10);
  const end = getEndSeconds();
  if (val >= end) return;
  
  setStartSeconds(val);
  if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(val, true);
}

function adjustEnd(delta) {
  let val = getEndSeconds() + delta;
  val = Math.round(val * 10) / 10;
  const start = getStartSeconds();
  if (val <= start) return;
  
  setEndSeconds(val);
}

function previewClip() {
  if (!ytPlayer || !ytPlayer.seekTo) return;
  const start = getStartSeconds();
  isPreviewing = true;
  ytPlayer.seekTo(start, true);
  ytPlayer.playVideo();
}

// Carregar Vídeo do YouTube
async function loadClipVideo() {
  const urlInput = document.getElementById("clip-url-input");
  const url = urlInput.value.trim();
  if (!url) {
    alert("Por favor, cole o link do YouTube.");
    return;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    alert("Link do YouTube inválido. Certifique-se de que é um link de vídeo válido.");
    return;
  }

  const btn = document.getElementById("clip-load-btn");
  btn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div> Carregando...`;
  btn.disabled = true;

  try {
    currentVideoUrl = url;
    document.getElementById("clip-workspace").classList.remove("hidden");
    document.getElementById("clip-workspace").classList.add("animate-fade-in");
    
    initOrUpdatePlayer(videoId);

    if (hasBackend) {
      try {
        const res = await fetch("/api/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url })
        });
        if (res.ok) {
          const data = await res.json();
          document.getElementById("player-video-title").innerText = data.title || "Vídeo do YouTube";
          document.getElementById("player-video-author").innerText = data.uploader || "Canal";
          if (data.duration) {
            currentVideoDuration = data.duration;
            document.getElementById("player-badge-duration").innerText = data.duration_formatted;
            sliderStart.max = data.duration;
            sliderEnd.max = data.duration;
            renderMinuteRuler(data.duration);
            updateTimelineSelectionVisual();
          }
          if (data.chapters && data.chapters.length > 0) {
            renderChapters(data.chapters);
          }
          return;
        }
      } catch (e) {}
    }

    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        document.getElementById("player-video-title").innerText = oembedData.title || "Vídeo do YouTube";
        document.getElementById("player-video-author").innerText = oembedData.author_name || "Canal";
      }
    } catch (e) {
      document.getElementById("player-video-title").innerText = "Vídeo do YouTube";
      document.getElementById("player-video-author").innerText = "Carregado via Player";
    }

  } catch (err) {
    console.warn("Erro ao carregar vídeo:", err);
  } finally {
    btn.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-black text-black"></i> Carregar Vídeo`;
    btn.disabled = false;
    lucide.createIcons();
  }
}

function renderChapters(chapters) {
  const container = document.getElementById("chapters-container");
  const list = document.getElementById("chapters-list");
  container.classList.remove("hidden");
  list.innerHTML = "";

  chapters.forEach(ch => {
    const btn = document.createElement("button");
    btn.className = "chapter-btn";
    btn.innerHTML = `<strong>${ch.start_formatted}</strong> - ${ch.title}`;
    btn.onclick = () => {
      setStartSeconds(ch.start_time);
      setEndSeconds(ch.end_time || (ch.start_time + 30));
      if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(ch.start_time, true);
    };
    list.appendChild(btn);
  });
}

// Iniciar Download do Clipe (Com suporte a 9:16, GIF, Loudness e Legendas)
async function startClipping() {
  if (!currentVideoUrl) {
    alert("Carregue um vídeo do YouTube primeiro!");
    return;
  }

  const start = getStartSeconds();
  const end = getEndSeconds();

  if (end <= start) {
    alert("O minuto/segundo final deve ser maior que o inicial!");
    return;
  }

  const formatChoice = document.getElementById("clip-format").value;
  const isAudio = formatChoice === "audio";
  const isVertical = formatChoice === "vertical";
  const isGif = formatChoice === "gif";

  const quality = document.getElementById("clip-quality").value;
  const customTitle = document.getElementById("clip-custom-title").value.trim();
  const normalizeAudio = document.getElementById("chk-loudness").checked;
  const embedSubtitles = document.getElementById("chk-subtitles").checked;
  const colorFilterEl = document.getElementById("clip-color-filter");
  const colorFilter = (colorFilterEl && colorFilterEl.value !== "none") ? colorFilterEl.value : null;

  if (!hasBackend) {
    openWebModalForClip(currentVideoUrl, start, end, isAudio, isVertical, isGif);
    return;
  }

  const btn = document.getElementById("btn-download-clip");
  btn.disabled = true;
  btn.classList.add("opacity-60");

  try {
    const res = await fetch("/api/clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentVideoUrl,
        start_time: start,
        end_time: end,
        quality: quality,
        is_audio: isAudio,
        is_vertical: isVertical,
        is_gif: isGif,
        normalize_audio: normalizeAudio,
        embed_subtitles: embedSubtitles,
        color_filter: colorFilter,
        title: customTitle || null
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao solicitar corte.");

    let taskDesc = "✂️ Baixando clipe...";
    if (isVertical) taskDesc = "📱 Gerando clipe vertical 9:16...";
    else if (isGif) taskDesc = "🎞️ Renderizando GIF animado...";

    showTaskCard(taskDesc);
    trackTask(data.task_id);

  } catch (err) {
    openWebModalForClip(currentVideoUrl, start, end, isAudio, isVertical, isGif);
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-60");
  }
}

// ============================================
// MODAL DE DOWNLOAD NO MODO WEB (GITHUB PAGES)
// ============================================
function openWebModalForClip(url, startSec, endSec, isAudio, isVertical, isGif) {
  const modal = document.getElementById("web-download-modal");
  modal.classList.remove("hidden");

  const startStr = formatTimeString(startSec);
  const endStr = formatTimeString(endSec);

  let formatArg = "-f mp4";
  if (isAudio) formatArg = "-x --audio-format mp3";
  else if (isGif) formatArg = "-f mp4"; // yt-dlp baixa o vídeo base

  const cmd = `yt-dlp --download-sections "*${startStr}-${endStr}" --force-keyframes-at-cuts ${formatArg} '${url.replaceAll("'", "''")}'`;
  document.getElementById("modal-ytdlp-cmd").value = cmd;

  document.getElementById("modal-web-cobalt").href = `https://cobalt.tools/`;
}

function copyYtDlpCmd() {
  const input = document.getElementById("modal-ytdlp-cmd");
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    alert("✅ Comando copiado! Cole no seu terminal/PowerShell para baixar.");
  });
}

function toggleWebModal() {
  document.getElementById("web-download-modal").classList.toggle("hidden");
}

// ============================================
// ABA 2: DOWNLOAD COMPLETO (YT & TWITTER / X)
// ============================================
let currentFullVideoData = null;

async function loadFullVideo() {
  const urlInput = document.getElementById("full-url-input");
  const url = urlInput.value.trim();
  if (!url) {
    alert("Por favor, cole um link do YouTube ou Twitter (X).");
    return;
  }

  const btn = document.getElementById("full-load-btn");
  btn.innerHTML = `<div class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div> Buscando...`;
  btn.disabled = true;

  try {
    if (hasBackend) {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url })
      });
      if (res.ok) {
        const data = await res.json();
        currentFullVideoData = data;
        renderFullVideoCard(data);
        return;
      }
    }

    const isYouTube = url.includes("youtu");
    const isTwitter = url.includes("twitter.com") || url.includes("x.com");

    let title = "Vídeo Detectado";
    let author = isTwitter ? "Post no Twitter/X" : "Canal do YouTube";
    let thumb = "";

    if (isYouTube) {
      const id = extractYouTubeId(url);
      thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
      try {
        const oe = await fetch(`https://noembed.com/embed?url=${url}`).then(r => r.json());
        if (oe.title) title = oe.title;
        if (oe.author_name) author = oe.author_name;
      } catch (e) {}
    } else if (isTwitter) {
      thumb = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60";
      title = "Vídeo do Twitter / X";
    }

    currentFullVideoData = {
      title: title,
      uploader: author,
      duration_formatted: "--:--",
      thumbnail: thumb,
      platform: isYouTube ? "youtube" : (isTwitter ? "twitter" : "web"),
      url: url
    };
    renderFullVideoCard(currentFullVideoData);

  } catch (err) {
    alert("Erro ao buscar dados: " + err.message);
  } finally {
    btn.innerHTML = `<i data-lucide="search" class="w-4 h-4 text-black"></i> Buscar Vídeo`;
    btn.disabled = false;
    lucide.createIcons();
  }
}

function renderFullVideoCard(data) {
  const card = document.getElementById("full-video-card");
  card.classList.remove("hidden");
  card.classList.add("animate-fade-in");

  document.getElementById("full-preview-title").innerText = data.title;
  document.getElementById("full-preview-author").innerText = data.uploader;
  document.getElementById("full-preview-duration").innerText = data.duration_formatted || "--:--";
  document.getElementById("full-preview-thumb").src = data.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60";

  const badge = document.getElementById("full-platform-badge");
  if (data.platform === "youtube") {
    badge.className = "absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow bg-red-600 text-white";
    badge.innerHTML = `<i data-lucide="video" class="w-3.5 h-3.5"></i> YouTube`;
  } else if (data.platform === "twitter") {
    badge.className = "absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow bg-sky-500 text-white";
    badge.innerHTML = `<i data-lucide="twitter" class="w-3.5 h-3.5"></i> Twitter / X`;
  } else {
    badge.className = "absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow bg-[#261d10] text-amber-200";
    badge.innerHTML = `<i data-lucide="globe" class="w-3.5 h-3.5"></i> Web`;
  }

  lucide.createIcons();
}

async function startFullDownload() {
  if (!currentFullVideoData) return;

  const isAudio = document.getElementById("full-format-select").value === "audio";
  const quality = document.getElementById("full-quality-select").value;
  const normalizeAudio = document.getElementById("chk-loudness-full").checked;

  if (!hasBackend) {
    const modal = document.getElementById("web-download-modal");
    modal.classList.remove("hidden");
    const formatArg = isAudio ? "-x --audio-format mp3" : "-f mp4";
    document.getElementById("modal-ytdlp-cmd").value = `yt-dlp ${formatArg} '${currentFullVideoData.url.replaceAll("'", "''")}'`;
    document.getElementById("modal-web-cobalt").href = `https://cobalt.tools/`;
    return;
  }

  const btn = document.getElementById("btn-download-full");
  btn.disabled = true;
  btn.classList.add("opacity-60");

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentFullVideoData.url,
        quality: quality,
        is_audio: isAudio,
        normalize_audio: normalizeAudio
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao iniciar download.");

    showTaskCard("📥 Baixando vídeo completo...");
    trackTask(data.task_id);

  } catch (err) {
    alert("Erro: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-60");
  }
}

function toggleQualitySelect() {
  const format = document.getElementById("clip-format").value;
  const isAudio = format === "audio";
  const isGif = format === "gif";
  const isVertical = format === "vertical";

  document.getElementById("clip-quality-container").style.display = (isAudio || isGif) ? "none" : "block";
  
  // Atualiza texto do botão
  const btnText = document.getElementById("btn-download-clip-text");
  if (isVertical) btnText.innerText = "📱 Baixar Clipe Vertical 9:16";
  else if (isGif) btnText.innerText = "🎞️ Gerar GIF Animado";
  else if (isAudio) btnText.innerText = "🎵 Baixar Áudio MP3 do Clipe";
  else btnText.innerText = "Baixar Apenas Este Clipe";

  // Desativa legenda em áudio ou GIF
  const lblSub = document.getElementById("lbl-subtitles");
  if (lblSub) lblSub.style.display = (isAudio || isGif) ? "none" : "flex";
}

function toggleFullQualitySelect() {
  const isAudio = document.getElementById("full-format-select").value === "audio";
  document.getElementById("full-quality-container").style.display = isAudio ? "none" : "block";
}

// ============================================
// BARRA DE PROGRESSO & POLING DE TAREFAS
// ============================================
function showTaskCard(title) {
  setNeonPulse(true);
  const card = document.getElementById("active-task-card");
  card.classList.remove("hidden");
  document.getElementById("task-status-title").innerText = title;
  document.getElementById("task-percent-text").innerText = "0%";
  document.getElementById("task-progress-bar").style.width = "0%";
  document.getElementById("task-speed-text").innerText = "Velocidade: ...";
  document.getElementById("task-eta-text").innerText = "Tempo rest.: ...";
  document.getElementById("task-done-actions").classList.add("hidden");
  document.getElementById("task-spinner").classList.remove("hidden");
}

function closeTaskCard() {
  setNeonPulse(false);
  document.getElementById("active-task-card").classList.add("hidden");
}

function trackTask(taskId) {
  currentPollingTaskId = taskId;
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) return;
      const task = await res.json();

      const percent = Math.min(100, Math.max(0, task.progress || 0));
      document.getElementById("task-percent-text").innerText = `${percent.toFixed(0)}%`;
      document.getElementById("task-progress-bar").style.width = `${percent}%`;

      if (task.speed) document.getElementById("task-speed-text").innerText = `Velocidade: ${task.speed}`;
      if (task.eta) document.getElementById("task-eta-text").innerText = `Tempo rest.: ${task.eta}`;
      if (task.message) document.getElementById("task-status-title").innerText = task.message;

      if (task.status === "completed") {
        clearInterval(interval);
        setNeonPulse(false);
        document.getElementById("task-spinner").classList.add("hidden");
        document.getElementById("task-status-title").innerText = "✅ Salvo com Sucesso!";
        document.getElementById("task-done-actions").classList.remove("hidden");
        
        document.getElementById("task-btn-play").onclick = () => openFile(task.file_path);
        document.getElementById("task-btn-folder").onclick = () => openDownloadFolder();
        
        playSuccessChime();
        loadHistory();
      } else if (task.status === "error") {
        clearInterval(interval);
        setNeonPulse(false);
        document.getElementById("task-spinner").classList.add("hidden");
        document.getElementById("task-status-title").innerText = "❌ Erro no download";
        alert(task.message || task.error || "Erro desconhecido");
      }

    } catch (e) {
      console.warn("Polling error:", e);
    }
  }, 600);
}

// ============================================
// COOKIES (YOUTUBE & TWITTER / X)
// ============================================
async function checkCookiesStatus() {
  if (!hasBackend) return;
  try {
    const res = await fetch("/api/cookies");
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById("cookies-status-badge");
    
    if (data.has_cookies) {
      badge.className = "text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold";
      badge.innerText = `🟢 ${data.count} Cookies Ativos`;
    } else {
      badge.className = "text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
      badge.innerText = `⚪ Nenhum cookie configurado`;
    }
    
    const txtArea = document.getElementById("cookies-json-textarea");
    if (txtArea && (!txtArea.value || txtArea.value.trim() === "")) {
      txtArea.value = data.raw;
    }
  } catch (e) {
    console.warn("Erro checando cookies:", e);
  }
}

async function openCookiesFileInNotepad() {
  try {
    await fetch("/api/open-cookies-file", { method: "POST" });
  } catch (e) {
    alert("Não foi possível abrir o arquivo cookies.json");
  }
}

function toggleCookiesModal() {
  const modal = document.getElementById("cookies-modal");
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden") && hasBackend) {
    fetch("/api/cookies").then(r => r.json()).then(data => {
      document.getElementById("cookies-json-textarea").value = data.raw;
    }).catch(() => {});
  }
}

async function saveCookiesFromModal() {
  const text = document.getElementById("cookies-json-textarea").value.trim();
  if (!hasBackend) {
    localStorage.setItem("house_clipper_cookies_backup", text);
    alert("✅ Cookies salvos no navegador para sua sessão web!");
    toggleCookiesModal();
    return;
  }
  try {
    const res = await fetch("/api/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookies_json_text: text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao salvar cookies.");

    alert(`✅ Sucesso! ${data.count} cookies salvos no cookies.json.`);
    toggleCookiesModal();
    checkCookiesStatus();
  } catch (e) {
    alert("Erro ao validar JSON de cookies: " + e.message);
  }
}

// ============================================
// HISTÓRICO & DRAG & DROP (QoL 8)
// ============================================
async function loadConfig() {
  if (!hasBackend) return;
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const config = await res.json();
      document.getElementById("current-folder-display").innerText = config.download_dir || "Padrão: Downloads/HouseClipper";
    }
  } catch (e) {}
}

async function changeDownloadFolder() {
  if (!hasBackend) {
    alert("Essa função está disponível no aplicativo Desktop.");
    return;
  }
  try {
    const res = await fetch("/api/select-folder", { method: "POST" });
    const data = await res.json();
    if (data.download_dir) {
      document.getElementById("current-folder-display").innerText = data.download_dir;
    }
  } catch (e) {
    alert("Erro ao alterar pasta: " + e.message);
  }
}

async function openDownloadFolder() {
  if (!hasBackend) {
    alert("Essa função está disponível no aplicativo Desktop.");
    return;
  }
  try {
    await fetch("/api/open-folder", { method: "POST" });
  } catch (e) {
    alert("Não foi possível abrir a pasta.");
  }
}

async function openFile(filePath) {
  if (!hasBackend) return;
  try {
    await fetch("/api/open-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath })
    });
  } catch (e) {
    alert("Não foi possível abrir o arquivo.");
  }
}

async function loadHistory() {
  if (!hasBackend) return;
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const history = await res.json();
    const container = document.getElementById("history-list");

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-amber-200/40 text-sm">
          Nenhum clipe ou download recente ainda.
        </div>`;
      return;
    }

    container.innerHTML = history.map(item => {
      const sizeMB = item.file_size ? (item.file_size / (1024 * 1024)).toFixed(1) + " MB" : "Salvo";
      const isClip = item.type === "clip";
      const isGif = item.subtype === "GIF Animado";
      const isVertical = item.subtype === "Vídeo 9:16";

      let icon = "scissors";
      if (isGif) icon = "film";
      else if (isVertical) icon = "smartphone";
      else if (!isClip) icon = "video";

      const badgeLabel = item.subtype || (item.is_audio ? "Áudio MP3" : "Vídeo MP4");

      return `
        <div class="p-3 hover:bg-[#1f180e] rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group draggable-clip-card"
             draggable="true" 
             ondragstart="onClipDragStart(event, '${item.file_path.replace(/\\/g, "/")}')"
             title="Arraste para Discord, WhatsApp ou Premiere">
          
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-[#0c0a07] border border-[#382b17] flex items-center justify-center shrink-0">
              <i data-lucide="${icon}" class="w-5 h-5 text-amber-400"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-bold text-amber-100 truncate group-hover:text-amber-400 transition" title="${item.title}">
                ${item.title}
              </h4>
              <div class="flex items-center gap-2 text-[11px] text-amber-300/50 font-mono mt-0.5">
                <span>${item.duration || ""}</span>
                <span>•</span>
                <span>${sizeMB}</span>
                <span>•</span>
                <span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">${badgeLabel}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button onclick="openFile('${item.file_path.replace(/\\/g, "/")}')" title="Assistir Vídeo" class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40 flex items-center gap-1 transition">
              <i data-lucide="play" class="w-3.5 h-3.5 fill-amber-400"></i> Assistir
            </button>
            <button onclick="openDownloadFolder()" title="Abrir na Pasta" class="p-1.5 bg-[#1b150d] hover:bg-[#281f13] text-amber-200 rounded-lg border border-[#3d2f19] transition">
              <i data-lucide="folder" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="deleteHistory('${item.id}')" title="Remover do histórico" class="p-1.5 text-amber-400/40 hover:text-red-400 rounded-lg transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  } catch (e) {
    console.error("Erro ao carregar histórico:", e);
  }
}

// Drag & drop direto para o Discord, Telegram, WhatsApp Web e Explorer
function onClipDragStart(e, filePath) {
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData("text/plain", filePath);
  e.dataTransfer.setData("DownloadURL", `application/octet-stream:${filePath.split('/').pop()}:file://${filePath}`);
}

async function deleteHistory(id) {
  if (!hasBackend) return;
  try {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    loadHistory();
  } catch (e) {
    console.warn("Erro ao remover:", e);
  }
}

async function pasteClipboard(targetInputId) {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      document.getElementById(targetInputId).value = text;
      if (targetInputId === "clip-url-input") {
        loadClipVideo();
      } else if (targetInputId === "full-url-input") {
        loadFullVideo();
      }
    }
  } catch (e) {
    alert("Por favor, cole com Ctrl+V na caixa de texto.");
  }
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}
