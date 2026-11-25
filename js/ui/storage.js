const STORAGE_KEY = "golem_series_custom_builds_v1";

function writeStorageRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn("保存済みゴーレムの書き込みに失敗:", e);
    return false;
  }
}

export function loadSavedBuilds() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object");
  } catch (e) {
    console.warn("保存済みゴーレムの読み込みに失敗:", e);
    return [];
  }
}

export function saveCustomBuild(build) {
  const safeBuild = build && typeof build === "object" ? build : {};
  const list = loadSavedBuilds();
  const item = {
    ...safeBuild,
    id: safeBuild.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    updatedAt: new Date().toISOString()
  };
  const idx = list.findIndex((b) => b.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  writeStorageRaw(STORAGE_KEY, JSON.stringify(list));
  return item;
}

export function deleteCustomBuild(id) {
  const next = loadSavedBuilds().filter((b) => b.id !== id);
  writeStorageRaw(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function showToast(message) {
  if (typeof document === "undefined" || !document.body) return;

  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = String(message ?? "");
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    if (el.isConnected) {
      el.classList.add("is-visible");
    }
  });

  setTimeout(() => {
    if (!el.isConnected) return;
    el.classList.remove("is-visible");
    setTimeout(() => {
      if (el.isConnected) el.remove();
    }, 200);
  }, 2600);
}
