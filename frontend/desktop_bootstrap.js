// Compose desktop controls without rewriting the independently maintained web UI.
function mountDesktopControls() {
  const main = document.querySelector("main");
  const history = document.getElementById("view-history");
  const nav = document.getElementById("tab-history").parentElement;
  for (const [id, label] of [["tasks", "Downloads"], ["settings", "Configurações"]]) {
    if (!document.getElementById(`tab-${id}`)) {
      const tab = document.createElement("button");
      tab.id = `tab-${id}`; tab.className = "tab-btn"; tab.textContent = label;
      tab.onclick = () => switchTab(id);
      if (id === "tasks") {
        const count = document.createElement("span");
        count.id = "queue-count"; count.textContent = "0"; tab.append(" ", count);
      }
      nav.append(tab);
    }
  }
  document.getElementById("tab-history").textContent = "Meus Clipes";
  if (!document.getElementById("view-settings")) {
    const settings = document.createElement("section");
    settings.id = "view-settings"; settings.className = "hidden space-y-6";
    const historyCard = document.getElementById("history-list").parentElement;
    while (history.firstElementChild && history.firstElementChild !== historyCard) settings.append(history.firstElementChild);
    settings.insertAdjacentHTML("beforeend", `<div class="panel"><label>Qualidade padrão
      <select id="default-quality" onchange="saveDefaultQuality()"><option value="best">Máxima disponível</option>
      <option value="1080">Até 1080p</option><option value="720">Até 720p</option><option value="480">Até 480p</option></select></label></div>`);
    main.append(settings);
    history.insertAdjacentHTML("afterbegin", `<div class="toolbar">
      <label>Buscar <input id="history-search" type="search" placeholder="Título ou nome do arquivo" oninput="renderHistory()"></label>
      <label>Filtrar <select id="history-filter" onchange="renderHistory()"><option value="all">Todos</option>
      <option value="clip">Clipes</option><option value="full">Downloads completos</option>
      <option value="audio">Áudio</option><option value="video">Vídeo</option></select></label></div>`);
  }
  if (!document.getElementById("view-tasks")) main.insertAdjacentHTML("beforeend", `<section id="view-tasks" class="hidden space-y-6">
    <h2>Downloads</h2><p>Um download por vez. A fila continua ao trocar de aba. Mantenha o aplicativo aberto até terminar.</p>
    <p id="queue-connection" role="status"></p><div id="task-list" class="space-y-3"></div></section>`);
  if (!document.getElementById("timeline-zoom")) {
    minuteRuler.parentElement.insertAdjacentHTML("beforebegin", `<div class="toolbar"><label>Zoom
      <select id="timeline-zoom" onchange="updateTimelineWindow()"><option value="1">Vídeo inteiro</option>
      <option value="2">2×</option><option value="4">4×</option><option value="8">8×</option><option value="16">16×</option></select></label>
      <button onclick="centerTimeline()">Centralizar no player</button></div>
      <label id="timeline-pan-label" class="hidden">Navegar pela timeline
      <input id="timeline-pan" aria-label="Posição da timeline" type="range" min="0" max="100" step="0.1" value="0" oninput="updateTimelineWindow(false)"></label>
      <div id="storyboard-strip" aria-label="Miniaturas dos momentos"></div>
      <p class="helper">Atalhos: I marca início, O marca fim, espaço reproduz/pausa (fora dos campos e do player).</p>`);
    document.getElementById("chapters-container").insertAdjacentHTML("beforebegin", `<div class="panel">
      <div class="toolbar"><button onclick="addSegment()">+ Adicionar trecho à lista</button>
      <button id="download-segments" onclick="downloadSegments()">Baixar trechos da lista</button></div><div id="segment-list"></div></div>`);
  }
  if (!document.getElementById("notice")) main.insertAdjacentHTML("beforeend", '<div id="notice" class="hidden" role="status" aria-live="polite"></div>');
  document.getElementById("active-task-card")?.remove();
  const modal = document.getElementById("cookies-modal");
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Configurar cookies");
  [sliderStart, sliderEnd].forEach(slider => slider.step = "0.1");
}

function switchTab(name) {
  ["clip", "full", "history", "settings", "tasks"].forEach(tab => {
    document.getElementById(`view-${tab}`)?.classList.toggle("hidden", tab !== name);
    document.getElementById(`tab-${tab}`)?.classList.toggle("active", tab === name);
  });
  if (name === "history") loadHistory();
  if (name === "settings") { loadConfig(); checkCookiesStatus(); }
}
function secondsToMinutesAndSeconds(seconds) {
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  return {minutes: Math.floor(total / 60), seconds: Math.round(total % 60 * 10) / 10, total};
}
function formatTimeString(seconds) {
  const time = secondsToMinutesAndSeconds(seconds);
  return `${String(time.minutes).padStart(2, "0")}:${time.seconds < 10 ? "0" : ""}${time.seconds}`;
}
function getStartSeconds() { return (Number(startMinInput.value) || 0) * 60 + (Number(startSecInput.value) || 0); }
function getEndSeconds() { return (Number(endMinInput.value) || 0) * 60 + (Number(endSecInput.value) || 0); }
function setStartSeconds(value) {
  const time = secondsToMinutesAndSeconds(Math.min(currentVideoDuration || Infinity, Math.max(0, value)));
  startMinInput.value = time.minutes; startSecInput.value = time.seconds; sliderStart.value = time.total;
  updateTimelineSelectionVisual();
}
function setEndSeconds(value) {
  const time = secondsToMinutesAndSeconds(Math.min(currentVideoDuration || Infinity, Math.max(0, value)));
  endMinInput.value = time.minutes; endSecInput.value = time.seconds; sliderEnd.value = time.total;
  updateTimelineSelectionVisual();
}
function setupSliders() {
  sliderStart.addEventListener("input", () => {
    const value = Math.max(0, Math.min(Number(sliderStart.value), getEndSeconds() - .1));
    setStartSeconds(value); ytPlayer?.seekTo?.(value, true);
  });
  sliderEnd.addEventListener("input", () => setEndSeconds(Math.max(Number(sliderEnd.value), getStartSeconds() + .1)));
}
function updateTimelineSelectionVisual() {
  const start = getStartSeconds(), end = getEndSeconds();
  clipDurationBadge.textContent = `${formatTimeString(Math.max(0, end-start))} (${Math.max(0, end-start).toFixed(1)}s)`;
  sliderRangeText.textContent = `${formatTimeString(start)} até ${formatTimeString(end)}`;
  const span = timelineEnd - timelineStart || currentVideoDuration || 1;
  timelineSelectionBar.style.left = `${Math.min(100, Math.max(0, (start-timelineStart)/span*100))}%`;
  timelineSelectionBar.style.width = `${Math.min(100, Math.max(0, (Math.min(end,timelineEnd)-Math.max(start,timelineStart))/span*100))}%`;
  if (typeof highlightWaveformRange === "function") highlightWaveformRange();
}
function updatePlayerTimeTracker() {
  if (!ytPlayer?.getCurrentTime) return;
  const current = ytPlayer.getCurrentTime();
  document.getElementById("player-current-time-display").textContent = formatTimeString(current);
  const percent = (current-timelineStart)/(timelineEnd-timelineStart || 1)*100;
  timelinePlayhead.style.left = `${Math.max(0,Math.min(100,percent))}%`;
  timelinePlayhead.style.visibility = percent < 0 || percent > 100 ? "hidden" : "visible";
  if (isPreviewing && current >= getEndSeconds()) ytPlayer.seekTo(getStartSeconds(),true);
}
function checkPreviewEnd() { updatePlayerTimeTracker(); }
function onPlayerReady() {
  ytPlayerReady = true;
  if (!currentVideoDuration) updateVideoDuration();
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  timeUpdateInterval = setInterval(updatePlayerTimeTracker, 100);
  if (typeof setupStickyPiP === "function") setupStickyPiP();
}
function renderChapters(chapters) {
  const list = document.getElementById("chapters-list");
  list.replaceChildren(); document.getElementById("chapters-container").classList.remove("hidden");
  chapters.forEach(chapter => {
    const item = button(`${chapter.start_formatted} - ${chapter.title}`, () => {
      setStartSeconds(chapter.start_time); setEndSeconds(chapter.end_time || chapter.start_time+30);
      updateTimelineWindow(); ytPlayer?.seekTo?.(chapter.start_time,true);
    });
    item.className = "chapter-btn"; list.append(item);
  });
}
function onTimelineHover(event) {
  const container = document.getElementById("timeline-interactive-container");
  if (!container || !currentVideoDuration) return;
  const rect = container.getBoundingClientRect();
  const x = Math.max(0,Math.min(rect.width,event.clientX-rect.left));
  const time = timelineStart + x/rect.width*(timelineEnd-timelineStart);
  const bubble = document.getElementById("hover-time-bubble"), line = document.getElementById("hover-vertical-line");
  if (bubble && line) {
    bubble.classList.remove("hidden"); line.classList.remove("hidden");
    bubble.style.left = line.style.left = `${x}px`; bubble.textContent = formatTimeString(time);
  }
}
async function startClipping() {
  const btn = document.getElementById("btn-download-clip");
  btn.disabled = true;
  try { await post("/api/clip",clipRequest()); switchTab("tasks"); }
  catch (error) { notify(error.message,startClipping); }
  finally { btn.disabled = false; }
}
async function startFullDownload() {
  if (!currentFullVideoData) return;
  const btn = document.getElementById("btn-download-full");
  btn.disabled = true;
  try {
    await post("/api/download", {url:currentFullVideoData.url, title:currentFullVideoData.title,
      quality:document.getElementById("full-quality-select").value,
      is_audio:document.getElementById("full-format-select").value === "audio",
      normalize_audio:document.getElementById("chk-loudness-full")?.checked || false});
    switchTab("tasks");
  } catch (error) { notify(error.message,startFullDownload); }
  finally { btn.disabled = false; }
}
async function deleteHistory(id) {
  try { await api(`/api/history/${id}`,{method:"DELETE"}); await loadHistory(); }
  catch (error) { notify(error.message,() => deleteHistory(id)); }
}
async function saveCookiesFromModal() {
  try {
    const data = await post("/api/cookies",{cookies_json_text:document.getElementById("cookies-json-textarea").value});
    toggleCookiesModal(); await checkCookiesStatus(); notify(`${data.count} cookies salvos.`);
  } catch (error) { notify(error.message); }
}
async function changeDownloadFolder() {
  try {
    const data = await post("/api/select-folder");
    if (data.error) throw new Error(data.error);
    document.getElementById("current-folder-display").textContent = data.download_dir;
  } catch (error) { notify(error.message,changeDownloadFolder); }
}
mountDesktopControls();
// Informational messages from the shared UI use the desktop's nonblocking notice.
window.alert = message => notify(String(message));
