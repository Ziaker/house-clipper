// Local API requests require a custom header and never allow cross-origin callers.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return nativeFetch(input, options);
  const headers = new Headers(options.headers);
  headers.set("X-House-Clipper", "1");
  let response;
  try {
    response = await nativeFetch(input, {...options, headers,
      signal: options.signal || AbortSignal.timeout(url.pathname === "/api/select-folder" ? 300000 : 90000)});
  } catch {
    throw new Error("Sem resposta do aplicativo. Verifique a conexão e tente novamente.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join("; ") : data.detail;
    throw new Error(detail || `Não foi possível concluir a operação (${response.status}).`);
  }
  return response;
};
async function api(url, options) { return (await fetch(url, options)).json(); }
function post(url, data = {}) {
  return api(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action) {
  const node = element("button", text);
  node.type = "button";
  node.onclick = action;
  return node;
}
function notify(message, retry) {
  const box = document.getElementById("notice");
  box.replaceChildren(element("span", message));
  if (retry) box.append(button("Tentar novamente", () => { box.classList.add("hidden"); retry(); }));
  box.append(button("Fechar", () => box.classList.add("hidden")));
  box.classList.remove("hidden");
}

let historyItems = [];
let segments = [];
let storyboard = null;
let timelineStart = 0;
let timelineEnd = 100;
let defaultQuality = "best";
let queueStarted = false;
let previousTaskStates = new Map();
let loadedClip = null;
let submittingSegments = false;
const desktopOrigin = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);

async function checkBackendConnection() {
  if (!desktopOrigin) {
    hasBackend = false;
    document.getElementById("backend-status-indicator").textContent = "Prévia web";
    ["tab-tasks", "tab-settings", "tab-history", "header-folder-btn"].forEach(id => {
      document.getElementById(id)?.classList.add("hidden");
    });
    return;
  }
  try {
    await api("/api/health");
    hasBackend = true;
    document.getElementById("backend-status-indicator").textContent = "Conectado local";
    const badge = document.getElementById("env-badge");
    if (badge) badge.textContent = "DESKTOP";
    await Promise.all([loadConfig(), loadHistory(), checkCookiesStatus()]);
    if (!queueStarted) { queueStarted = true; pollQueue(); }
  } catch (error) {
    hasBackend = false;
    document.getElementById("backend-status-indicator").textContent = "Sem conexão local";
    notify("Abra o House Clipper no computador para baixar e salvar vídeos.", checkBackendConnection);
  }
}

function populateQuality(id, formats = []) {
  const select = document.getElementById(id);
  select.replaceChildren();
  select.add(new Option("Máxima disponível", "best"));
  const heights = [...new Set(formats.map(f => f.height).filter(Number.isFinite))].sort((a,b) => b-a);
  heights.forEach(h => select.add(new Option(`${h}p`, String(h))));
  const target = heights.find(h => h <= Number(defaultQuality));
  select.value = defaultQuality === "best" || !target ? "best" : String(target);
}

async function loadClipVideo() {
  if (submittingSegments) return;
  const url = document.getElementById("clip-url-input").value.trim();
  const id = extractYouTubeId(url);
  if (!id) return notify("Cole um link válido de vídeo do YouTube.");
  const btn = document.getElementById("clip-load-btn");
  btn.disabled = true;
  btn.textContent = "Carregando…";
  currentVideoUrl = "";
  loadedClip = null;
  currentVideoDuration = 0;
  isPreviewing = false;
  storyboard = null;
  segments = [];
  renderSegments();
  document.getElementById("clip-workspace").classList.add("hidden");
  document.getElementById("chapters-container").classList.add("hidden");
  try {
    if (!desktopOrigin) {
      currentVideoUrl = `https://www.youtube.com/watch?v=${id}`;
      const data = await nativeFetch(`https://noembed.com/embed?url=${encodeURIComponent(currentVideoUrl)}`)
        .then(r => r.json()).catch(() => ({}));
      loadedClip = {title: data.title || "Vídeo do YouTube"};
      document.getElementById("player-video-title").textContent = loadedClip.title;
      document.getElementById("player-video-author").textContent = data.author_name || "";
      document.getElementById("clip-workspace").classList.remove("hidden");
      populateQuality("clip-quality");
      initOrUpdatePlayer(id);
      return;
    }
    const data = await post("/api/info", {url});
    if (!Number.isFinite(data.duration) || data.duration <= 0) throw new Error("Este vídeo não possui duração definida para recorte.");
    currentVideoUrl = url;
    currentVideoDuration = data.duration;
    loadedClip = data;
    storyboard = data.storyboard;
    document.getElementById("player-video-title").textContent = data.title;
    document.getElementById("player-video-author").textContent = data.uploader;
    document.getElementById("player-badge-duration").textContent = data.duration_formatted;
    document.getElementById("timeline-zoom").value = "1";
    setStartSeconds(0);
    setEndSeconds(Math.min(30, data.duration));
    updateTimelineWindow();
    populateQuality("clip-quality", data.formats);
    if (data.chapters?.length) renderChapters(data.chapters);
    document.getElementById("clip-workspace").classList.remove("hidden");
    initOrUpdatePlayer(id);
  } catch (error) {
    notify(error.message, loadClipVideo);
  } finally {
    btn.disabled = false;
    btn.textContent = "Carregar Vídeo";
  }
}

async function loadFullVideo() {
  const url = document.getElementById("full-url-input").value.trim();
  if (!url) return notify("Cole um link do YouTube ou Twitter/X.");
  const btn = document.getElementById("full-load-btn");
  btn.disabled = true;
  btn.textContent = "Buscando…";
  currentFullVideoData = null;
  document.getElementById("full-video-card").classList.add("hidden");
  try {
    let data;
    if (!desktopOrigin) {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || !/(^|\.)(youtube\.com|youtu\.be|twitter\.com|x\.com)$/.test(parsed.hostname))
        throw new Error("Use um link do YouTube ou Twitter/X.");
      const metadata = await nativeFetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`).then(r => r.json()).catch(() => ({}));
      data = {url: parsed.href, title: metadata.title || "Vídeo", uploader: metadata.author_name || "",
        thumbnail: metadata.thumbnail_url || "", platform: extractYouTubeId(url) ? "youtube" : "twitter", formats: []};
    } else data = await post("/api/info", {url});
    currentFullVideoData = data;
    renderFullVideoCard(data);
    populateQuality("full-quality-select", data.formats);
  } catch (error) { notify(error.message, loadFullVideo); }
  finally { btn.disabled = false; btn.textContent = "Buscar Vídeo"; }
}

function updateTimelineWindow(center = true) {
  const duration = currentVideoDuration || 100;
  const zoom = Number(document.getElementById("timeline-zoom").value);
  const span = duration / zoom;
  const pan = document.getElementById("timeline-pan");
  pan.max = Math.max(0, duration - span);
  if (center) pan.value = Math.max(0, Math.min(duration - span, (getStartSeconds() + getEndSeconds()) / 2 - span / 2));
  timelineStart = Number(pan.value);
  timelineEnd = Math.min(duration, timelineStart + span);
  document.getElementById("timeline-pan-label").classList.toggle("hidden", zoom === 1);
  [sliderStart, sliderEnd].forEach(slider => { slider.min = timelineStart; slider.max = timelineEnd; });
  sliderStart.value = getStartSeconds();
  sliderEnd.value = getEndSeconds();
  minuteRuler.replaceChildren();
  for (let i = 0; i <= 8; i++) {
    const time = timelineStart + span * i / 8;
    minuteRuler.append(button(formatTimeString(time), () => ytPlayer?.seekTo?.(time, true)));
  }
  updateTimelineSelectionVisual();
  renderStoryboard();
}
function centerTimeline() {
  const pan = document.getElementById("timeline-pan");
  const position = ytPlayer?.getCurrentTime?.() || getStartSeconds();
  pan.value = Math.max(0, position - (timelineEnd - timelineStart) / 2);
  updateTimelineWindow(false);
}
function renderStoryboard() {
  const strip = document.getElementById("storyboard-strip");
  strip.replaceChildren();
  if (!storyboard?.fragments?.length || !storyboard.fps) {
    strip.append(element("span", "Miniaturas dos momentos indisponíveis para este vídeo.", "helper"));
    return;
  }
  const {rows, columns, fps, width, height, fragments} = storyboard;
  for (let i = 0; i < 8; i++) {
    const time = timelineStart + (timelineEnd - timelineStart) * i / 8;
    const frame = Math.floor(time * fps);
    const fragment = fragments[Math.floor(frame / (rows * columns))];
    if (!fragment || !/^https:\/\//.test(fragment.url)) continue;
    const tile = frame % (rows * columns);
    const x = tile % columns, y = Math.floor(tile / columns);
    const item = button("", () => ytPlayer?.seekTo?.(time, true));
    item.setAttribute("aria-label", `Ir para ${formatTimeString(time)}`);
    const preview = element("span", undefined, "storyboard-frame");
    preview.style.aspectRatio = `${width} / ${height}`;
    preview.style.backgroundImage = `url(${JSON.stringify(fragment.url)})`;
    preview.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;
    preview.style.backgroundPosition = `${columns > 1 ? x / (columns - 1) * 100 : 0}% ${rows > 1 ? y / (rows - 1) * 100 : 0}%`;
    item.append(preview, element("span", formatTimeString(time)));
    strip.append(item);
  }
}

function clipRequest(start = getStartSeconds(), end = getEndSeconds()) {
  if (!currentVideoUrl || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > currentVideoDuration)
    throw new Error("Escolha início e fim dentro da duração do vídeo.");
  return {url: currentVideoUrl, start_time: start, end_time: end,
    quality: document.getElementById("clip-quality").value,
    is_audio: document.getElementById("clip-format").value === "audio",
    is_vertical: document.getElementById("clip-format").value === "vertical",
    is_gif: document.getElementById("clip-format").value === "gif",
    normalize_audio: document.getElementById("chk-loudness")?.checked || false,
    embed_subtitles: document.getElementById("chk-subtitles")?.checked || false,
    color_filter: document.getElementById("clip-color-filter")?.value !== "none" ? document.getElementById("clip-color-filter")?.value : null,
    title: document.getElementById("clip-custom-title").value.trim() || loadedClip?.title || null};
}
function addSegment() {
  if (submittingSegments) return;
  try {
    const request = clipRequest();
    if (segments.length >= 50) throw new Error("Adicione no máximo 50 trechos por lote.");
    segments.push(request);
    renderSegments();
  } catch (error) { notify(error.message); }
}
function renderSegments() {
  const list = document.getElementById("segment-list");
  list.replaceChildren();
  segments.forEach((segment, index) => {
    const row = element("div", undefined, "toolbar");
    row.append(element("span", `${index + 1}. ${formatTimeString(segment.start_time)} → ${formatTimeString(segment.end_time)} · ${segment.is_audio ? "MP3" : segment.is_gif ? "GIF" : segment.is_vertical ? "MP4 9:16" : "MP4"} · ${segment.quality === "best" ? "Máxima" : segment.quality + "p"}`));
    row.append(button("Rever", () => { setStartSeconds(segment.start_time); setEndSeconds(segment.end_time); updateTimelineWindow(); previewClip(); }));
    const remove = button("Remover", () => { segments.splice(index, 1); renderSegments(); });
    remove.disabled = submittingSegments;
    row.append(remove);
    list.append(row);
  });
  document.getElementById("download-segments").disabled = submittingSegments || !segments.length;
}
async function downloadSegments() {
  if (!hasBackend) return notify("A fila de vários trechos está disponível no aplicativo desktop.");
  if (submittingSegments) return;
  submittingSegments = true;
  renderSegments();
  const btn = document.getElementById("download-segments");
  btn.disabled = true;
  try {
    while (segments.length) {
      await post("/api/clip", segments[0]);
      segments.shift(); // Preserve only unsent segments if a later request fails.
    }
    switchTab("tasks");
  } catch (error) { notify(error.message, downloadSegments); }
  finally { submittingSegments = false; renderSegments(); }
}

function showTaskCard() { switchTab("tasks"); }
function trackTask() { /* One global polling loop covers all queued tasks. */ }
async function pollQueue() {
  try {
    const tasks = await api("/api/tasks");
    document.getElementById("queue-connection").textContent = "";
    renderTasks(tasks);
    if (tasks.some(t => t.status === "completed" && previousTaskStates.get(t.id) && previousTaskStates.get(t.id) !== "completed")) {
      playSuccessChime();
      await loadHistory();
    }
    previousTaskStates = new Map(tasks.map(t => [t.id, t.status]));
  } catch (error) { document.getElementById("queue-connection").textContent = error.message; }
  setTimeout(pollQueue, 1500);
}
const taskLabels = {queued: "Na fila", preparing: "Preparando", downloading: "Baixando",
  processing: "Processando", completed: "Concluído", cancelled: "Cancelado", error: "Erro"};
function renderTasks(tasks) {
  const list = document.getElementById("task-list");
  // Keep focused controls stable while the user navigates the queue by keyboard.
  const focusedId = document.activeElement?.dataset?.taskAction;
  list.replaceChildren();
  const active = tasks.filter(t => !["completed", "error", "cancelled"].includes(t.status));
  if (typeof setNeonPulse === "function") setNeonPulse(active.length > 0);
  document.getElementById("queue-count").textContent = active.length;
  if (!tasks.length) list.append(element("p", "Nenhum download nesta sessão."));
  [...tasks].reverse().forEach(task => {
    const row = element("article", undefined, "panel");
    row.append(element("h3", task.file_name || task.title));
    row.append(element("p", `${taskLabels[task.status]} · ${task.message || ""}`));
    if (active.includes(task)) {
      const progress = element("progress");
      progress.max = 100;
      if (Number.isFinite(task.progress) && task.status === "downloading") progress.value = task.progress;
      progress.setAttribute("aria-label", "Progresso do download");
      row.append(progress, element("small", `${task.speed || ""} ${task.eta ? "· Restante: " + task.eta : ""}`));
      const cancel = button("Cancelar", () => taskAction(task.id, "cancel"));
      cancel.dataset.taskAction = task.id + "-cancel";
      row.append(cancel);
    } else if (["error", "cancelled"].includes(task.status)) {
      const retry = button("Tentar novamente", () => taskAction(task.id, "retry"));
      retry.dataset.taskAction = task.id + "-retry";
      row.append(retry);
    } else {
      row.append(button("Abrir arquivo", () => openFile(task.file_path)), button("Abrir pasta", () => openDownloadFolder(task.file_path)));
    }
    list.append(row);
  });
  if (focusedId) [...list.querySelectorAll("button")].find(b => b.dataset.taskAction === focusedId)?.focus();
}
async function taskAction(id, action) {
  try { await post(`/api/tasks/${id}/${action}`); renderTasks(await api("/api/tasks")); }
  catch (error) { notify(error.message, () => taskAction(id, action)); }
}

async function loadHistory() {
  try { historyItems = await api("/api/history"); renderHistory(); }
  catch (error) { notify(error.message, loadHistory); }
}
function renderHistory() {
  const query = document.getElementById("history-search").value.toLocaleLowerCase();
  const filter = document.getElementById("history-filter").value;
  const list = document.getElementById("history-list");
  list.replaceChildren();
  const items = historyItems.filter(item => `${item.title} ${item.source_title || ""}`.toLocaleLowerCase().includes(query))
    .filter(item => filter === "all" || (filter === "audio" ? item.is_audio : filter === "video" ? !item.is_audio : item.type === filter));
  if (!items.length) list.append(element("p", "Nenhum arquivo encontrado.", "panel"));
  items.forEach(item => {
    const row = element("article", undefined, "history-item");
    if (/^https:\/\//.test(item.thumbnail || "")) {
      const image = element("img");
      image.src = item.thumbnail; image.alt = ""; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
      image.onerror = () => image.remove();
      row.append(image);
    }
    const details = element("div");
    details.append(element("h3", item.source_title || item.title),
      element("p", `${item.duration || ""} · ${item.is_audio ? "Áudio" : "Vídeo"} · ${((item.file_size || 0) / 1048576).toFixed(1)} MB`),
      element("small", item.available === false ? "Arquivo não encontrado no disco" : item.title));
    row.append(details);
    const actions = element("div", undefined, "toolbar");
    const open = button(item.is_audio ? "Ouvir" : "Assistir", () => openFile(item.file_path));
    open.disabled = item.available === false;
    actions.append(open, button("Abrir pasta", () => openDownloadFolder(item.file_path)),
      button("Remover do histórico", () => deleteHistory(item.id)));
    row.append(actions);
    list.append(row);
  });
}
async function openFile(path) {
  try { await post("/api/open-file", {path}); } catch (error) { notify(error.message); }
}
async function openDownloadFolder(path) {
  try { await post("/api/open-folder", path ? {path} : {}); } catch (error) { notify(error.message); }
}
async function loadConfig() {
  try {
    const config = await api("/api/config");
    defaultQuality = config.default_quality || "best";
    document.getElementById("default-quality").value = defaultQuality;
    document.getElementById("current-folder-display").textContent = config.download_dir;
  } catch (error) { notify(error.message, loadConfig); }
}
async function saveDefaultQuality() {
  try {
    defaultQuality = document.getElementById("default-quality").value;
    await post("/api/config", {default_quality: defaultQuality});
    if (loadedClip) populateQuality("clip-quality", loadedClip.formats);
    if (currentFullVideoData) populateQuality("full-quality-select", currentFullVideoData.formats);
  } catch (error) { notify(error.message, saveDefaultQuality); }
}
async function checkCookiesStatus() {
  try {
    const data = await api("/api/cookies");
    document.getElementById("cookies-status-badge").textContent = `${data.count} cookies salvos`;
  } catch (error) { notify(error.message, checkCookiesStatus); }
}
let cookieTrigger = null;
function toggleCookiesModal() {
  const modal = document.getElementById("cookies-modal");
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden")) {
    cookieTrigger = document.activeElement;
    const input = document.getElementById("cookies-json-textarea");
    input.value = "";
    input.placeholder = "Cole novos cookies para substituir os existentes. Use [] para remover.";
    input.focus();
  } else {
    document.getElementById("cookies-json-textarea").value = "";
    cookieTrigger?.focus();
  }
}
document.addEventListener("keydown", event => {
  const modal = document.getElementById("cookies-modal");
  if (!modal.classList.contains("hidden")) {
    if (event.key === "Escape") toggleCookiesModal();
    if (event.key === "Tab") {
      const controls = [...modal.querySelectorAll("button, textarea")];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    }
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey || event.target.closest("input,textarea,select,button,[contenteditable]") ||
      document.getElementById("view-clip").classList.contains("hidden") || !currentVideoUrl) return;
  if (event.key.toLowerCase() === "i") setStartToCurrent();
  else if (event.key.toLowerCase() === "o") setEndToCurrent();
  else if (event.code === "Space") {
    event.preventDefault();
    if (ytPlayer?.getPlayerState?.() === 1) { isPreviewing = false; ytPlayer.pauseVideo(); }
    else ytPlayer?.playVideo?.();
  }
});
document.addEventListener("DOMContentLoaded", () => {
  [startSecInput, endSecInput].forEach(input => { input.step = "0.1"; input.max = "59.9"; });
  sliderStart.setAttribute("aria-label", "Início do trecho");
  sliderEnd.setAttribute("aria-label", "Fim do trecho");
  renderSegments();
});
