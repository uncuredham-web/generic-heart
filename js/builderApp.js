import { loadGolemMasterData, STAT_LABELS } from "./data/golemData.js";
import { AI_POLICIES, SKILLS, calculateGolemBuild } from "./rules/battleRules.js";
import {
  deleteCustomBuild,
  loadSavedBuilds,
  saveCustomBuild,
  showToast
} from "./ui/storage.js";

const state = {
  masterData: null,
  masterOk: false,
  draft: {
    id: null,
    name: "",
    coreId: "",
    parts: { arm: "", leg: "", chip: "" },
    aiPolicy: "balanced"
  }
};

const els = {
  dataStatus: document.getElementById("data-status"),
  masterError: document.getElementById("master-error"),
  reloadDataBtn: document.getElementById("reload-data-btn"),
  golemName: document.getElementById("golem-name"),
  aiPolicy: document.getElementById("ai-policy"),
  presetSelect: document.getElementById("preset-select"),
  applyPresetBtn: document.getElementById("apply-preset-btn"),
  coreList: document.getElementById("core-list"),
  armList: document.getElementById("arm-list"),
  legList: document.getElementById("leg-list"),
  chipList: document.getElementById("chip-list"),
  costSummary: document.getElementById("cost-summary"),
  previewCard: document.getElementById("preview-card"),
  saveBuildBtn: document.getElementById("save-build-btn"),
  saveAsNewBtn: document.getElementById("save-as-new-btn"),
  exportJsonBtn: document.getElementById("export-json-btn"),
  savedList: document.getElementById("saved-list")
};

function formatMods(mods = {}) {
  const entries = Object.entries(mods).filter(([, v]) => v !== 0);
  if (entries.length === 0) return "補正なし";
  return entries
    .map(([k, v]) => `${STAT_LABELS[k] || k} ${v > 0 ? `+${v}` : v}`)
    .join(" / ");
}

function renderStatus(statusInfo) {
  els.dataStatus.textContent = statusInfo.message;
  els.dataStatus.classList.toggle("is-fallback", !statusInfo.ok);
  if (!statusInfo.ok) {
    els.masterError.style.display = "block";
    els.masterError.textContent = statusInfo.message;
  } else {
    els.masterError.style.display = "none";
    els.masterError.textContent = "";
  }
}

function clearBlankBuilder() {
  els.coreList.innerHTML = "";
  els.armList.innerHTML = "";
  els.legList.innerHTML = "";
  els.chipList.innerHTML = "";
  els.presetSelect.innerHTML = "";
  els.costSummary.innerHTML = "";
  els.previewCard.innerHTML = "";
  els.savedList.innerHTML = "";
  els.applyPresetBtn.disabled = true;
  els.saveBuildBtn.disabled = true;
  els.saveAsNewBtn.disabled = true;
}

function renderSelectors() {
  els.aiPolicy.innerHTML = Object.values(AI_POLICIES)
    .map((p) => `<option value="${p.id}">${p.label} — ${p.description}</option>`)
    .join("");
  els.aiPolicy.value = state.draft.aiPolicy;

  const presets = state.masterData.presets || [];
  els.presetSelect.innerHTML = presets
    .map((pr) => `<option value="${pr.id}">${pr.name}</option>`)
    .join("");
  els.applyPresetBtn.disabled = presets.length === 0;
}

function renderCores() {
  els.coreList.innerHTML = state.masterData.cores
    .map((core) => {
      const selected = core.id === state.draft.coreId;
      return `
        <div class="part-card ${selected ? "is-selected" : ""}" data-core-id="${core.id}">
          <div class="part-card-header">
            <span>${core.name}</span>
            <span class="part-cost">コスト ${core.cost}</span>
          </div>
          <div class="tag">${core.role}</div>
          <p class="part-desc">${core.description}</p>
          <div class="part-mods">
            HP:${core.baseStats.hp} / 攻:${core.baseStats.atk} / 防:${core.baseStats.def} / 速:${core.baseStats.spd}
          </div>
        </div>
      `;
    })
    .join("");

  els.coreList.querySelectorAll("[data-core-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.draft.coreId = card.dataset.coreId;
      renderAll();
    });
  });
}

function renderPartSlot(slot, container) {
  const list = state.masterData.parts[slot] || [];
  const selectedId = state.draft.parts[slot];

  container.innerHTML = list
    .map((part) => {
      const selected = part.id === selectedId;
      const skillText = part.skillId && SKILLS[part.skillId]
        ? ` / スキル: ${SKILLS[part.skillId].name}`
        : "";
      return `
        <div class="part-card ${selected ? "is-selected" : ""}" data-slot="${slot}" data-part-id="${part.id}">
          <div class="part-card-header">
            <span>${part.name}</span>
            <span class="part-cost">コスト ${part.cost}</span>
          </div>
          <p class="part-desc">${part.description}</p>
          <div class="part-mods">${formatMods(part.mods)}${skillText}</div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("[data-part-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.draft.parts[card.dataset.slot] = card.dataset.partId;
      renderAll();
    });
  });
}

function renderPreview() {
  const built = calculateGolemBuild(state.draft, state.masterData);

  els.costSummary.innerHTML = `
    <span>合計コスト</span>
    <strong class="cost-value ${built.isOverCost ? "is-over" : ""}">
      ${built.totalCost} / ${built.costLimit}${built.isOverCost ? "（上限超過！）" : ""}
    </strong>
  `;

  const skillBadges = built.skills.length
    ? built.skills.map((s) => `<span class="tag">${s.name}</span>`).join(" ")
    : `<span class="muted">なし（通常攻撃のみ）</span>`;

  els.previewCard.innerHTML = `
    <div class="preview-header">
      <h3 class="preview-name">${escapeHtml(built.name)}</h3>
      <span class="tag">${AI_POLICIES[built.aiPolicy].label}</span>
    </div>
    <p class="muted" style="margin:0 0 8px;">
      コア: <strong>${built.core.name}</strong> ／
      パーツ: ${built.parts.map((p) => p.name).join("、")}
    </p>
    <div style="margin-bottom:10px;">習得スキル: ${skillBadges}</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">HP</div><div class="stat-value">${built.stats.hp}</div></div>
      <div class="stat-box"><div class="stat-label">攻撃力</div><div class="stat-value">${built.stats.atk}</div></div>
      <div class="stat-box"><div class="stat-label">防御力</div><div class="stat-value">${built.stats.def}</div></div>
      <div class="stat-box"><div class="stat-label">素早さ</div><div class="stat-value">${built.stats.spd}</div></div>
    </div>
  `;

  els.saveBuildBtn.disabled = built.isOverCost;
  els.saveAsNewBtn.disabled = built.isOverCost;
}

function renderSavedBuilds() {
  const saved = loadSavedBuilds();
  if (saved.length === 0) {
    els.savedList.innerHTML = `<p class="muted">保存済みカスタムゴーレムはまだありません。</p>`;
    return;
  }

  els.savedList.innerHTML = saved
    .map((b) => {
      const built = calculateGolemBuild(b, state.masterData);
      return `
        <div class="saved-item">
          <div>
            <div class="saved-item-title">${escapeHtml(built.name)} <span class="muted">(コスト ${built.totalCost})</span></div>
            <div class="muted">HP:${built.stats.hp} / 攻:${built.stats.atk} / 防:${built.stats.def} / 速:${built.stats.spd}</div>
          </div>
          <div class="saved-item-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-load-id="${b.id}">編集読込</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-id="${b.id}">削除</button>
          </div>
        </div>
      `;
    })
    .join("");

  els.savedList.querySelectorAll("[data-load-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = loadSavedBuilds().find((x) => x.id === btn.dataset.loadId);
      if (!target) return;
      state.draft = JSON.parse(JSON.stringify(target));
      els.golemName.value = state.draft.name;
      renderAll();
      showToast(`「${state.draft.name}」を編集欄に読み込みました`);
    });
  });

  els.savedList.querySelectorAll("[data-del-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteCustomBuild(btn.dataset.delId);
      if (state.draft.id === btn.dataset.delId) state.draft.id = null;
      renderSavedBuilds();
      showToast("保存データを削除しました");
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAll() {
  if (!state.masterOk || !state.masterData) {
    clearBlankBuilder();
    return;
  }
  if (!state.draft.coreId && state.masterData.cores[0]) {
    state.draft.coreId = state.masterData.cores[0].id;
  }
  for (const slot of ["arm", "leg", "chip"]) {
    if (!state.draft.parts[slot] && state.masterData.parts[slot]?.[0]) {
      state.draft.parts[slot] = state.masterData.parts[slot][0].id;
    }
  }
  renderSelectors();
  renderCores();
  renderPartSlot("arm", els.armList);
  renderPartSlot("leg", els.legList);
  renderPartSlot("chip", els.chipList);
  renderPreview();
  renderSavedBuilds();
}

async function applyMasterLoadResult(res) {
  state.masterData = res.data;
  state.masterOk = Boolean(res.ok);
  renderStatus(res);
  renderAll();
}

function bindEvents() {
  els.golemName.addEventListener("input", (e) => {
    state.draft.name = e.target.value;
    if (state.masterOk) renderPreview();
  });

  els.aiPolicy.addEventListener("change", (e) => {
    state.draft.aiPolicy = e.target.value;
    if (state.masterOk) renderPreview();
  });

  els.applyPresetBtn.addEventListener("click", () => {
    if (!state.masterOk) return;
    const preset = (state.masterData.presets || []).find((p) => p.id === els.presetSelect.value);
    if (!preset) return;
    state.draft = {
      id: null,
      name: `${preset.name}（改）`,
      coreId: preset.coreId,
      parts: { ...preset.parts },
      aiPolicy: preset.aiPolicy || "balanced"
    };
    els.golemName.value = state.draft.name;
    renderAll();
    showToast("プリセットを反映しました");
  });

  els.saveBuildBtn.addEventListener("click", () => {
    if (!state.masterOk) return;
    const built = calculateGolemBuild(state.draft, state.masterData);
    if (built.isOverCost) return;
    const saved = saveCustomBuild({ ...state.draft, name: built.name });
    state.draft.id = saved.id;
    renderSavedBuilds();
    showToast(`「${saved.name}」を保存しました`);
  });

  els.saveAsNewBtn.addEventListener("click", () => {
    if (!state.masterOk) return;
    const built = calculateGolemBuild(state.draft, state.masterData);
    if (built.isOverCost) return;
    const saved = saveCustomBuild({
      ...state.draft,
      id: `custom_${Date.now()}`,
      name: `${built.name} コピー`
    });
    state.draft.id = saved.id;
    els.golemName.value = saved.name;
    renderSavedBuilds();
    showToast(`「${saved.name}」として新規保存しました`);
  });

  els.exportJsonBtn.addEventListener("click", () => {
    if (!state.masterOk) return;
    const built = calculateGolemBuild(state.draft, state.masterData);
    const payload = {
      name: built.name,
      aiPolicy: built.aiPolicy,
      coreId: built.core.id,
      parts: state.draft.parts,
      stats: built.stats,
      totalCost: built.totalCost
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(
      () => showToast("ビルドJSONをクリップボードにコピーしました"),
      () => showToast("JSONを生成しました")
    );
  });

  els.reloadDataBtn.addEventListener("click", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
    showToast(res.message);
  });

  window.addEventListener("offline", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
  });
}

async function init() {
  els.golemName.value = state.draft.name;
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();