const STORAGE_KEY = "golem_series_custom_builds_v1";

export function loadSavedBuilds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("保存済みゴーレムの読み込みに失敗:", e);
    return [];
  }
}

export function saveCustomBuild(build) {
  const list = loadSavedBuilds();
  const item = {
    ...build,
    id: build.id || `custom_${Date.now()}`,
    updatedAt: new Date().toISOString()
  };
  const idx = list.findIndex((b) => b.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return item;
}

export function deleteCustomBuild(id) {
  const next = loadSavedBuilds().filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => { el.remove(); }, 2600);
}
