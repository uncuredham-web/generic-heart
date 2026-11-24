import { loadGolemMasterData } from "./data/golemData.js";
import { loadSavedBuilds, saveCustomBuild, deleteCustomBuild, showToast } from "./ui/storage.js";

const TACTICS = [
  "ガンガン近づけ",
  "距離をとって戦え",
  "バランスよく戦え",
  "省エネ・粘り強く戦え"
];

const PRESETS = [
  {
    id: "knight",
    name: "盾剣タンク（アイアンナイト）",
    golemName: "アイアンナイト",
    core: "C02",
    head: "H01",
    rightArm: "A02",
    leftArm: "A01",
    rightWeapon: "W01",
    leftWeapon: "S02",
    rightLeg: "L01",
    leftLeg: "L01",
    tactic: "ガンガン近づけ"
  },
  {
    id: "mage",
    name: "魔導引き撃ち（アークメイジ）",
    golemName: "アークメイジ",
    core: "C03",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightWeapon: "W05",
    leftWeapon: "W02",
    rightLeg: "L02",
    leftLeg: "L02",
    tactic: "距離をとって戦え"
  },
  {
    id: "twin",
    name: "二刀流速攻（ツインファング）",
    golemName: "ツインファング",
    core: "C01",
    head: "H02",
    rightArm: "A02",
    leftArm: "A02",
    rightWeapon: "W01",
    leftWeapon: "W01",
    rightLeg: "L02",
    leftLeg: "L02",
    tactic: "ガンガン近づけ"
  }
];

const state = {
  masterData: null,
  masterOk: false,
  draft: {
    id: null,
    name: "",
    core: "",
    head: "",
    rightArm: "",
    leftArm: "",
    rightWeapon: "",
    leftWeapon: "",
    rightLeg: "",
    leftLeg: "",
    tactic: TACTICS[0]
  }
};

const els = {
  dataStatus: document.getElementById("data-status"),
  masterError: document.getElementById("master-error"),
  reloadDataBtn: document.getElementById("reload-data-btn"),
  golemName: document.getElementById("golem-name"),
  tacticSelect: document.getElementById("tactic-select"),
  presetSelect: document.getElementById("preset-select"),
  applyPresetBtn: document.getElementById("apply-preset-btn"),
  bodyHeadList: document.getElementById("body-head-list"),
  armList: document.getElementById("arm-list"),
  legList: document.getElementById("leg-list"),
  weaponList: document.getElementById("weapon-list"),
  previewCard: document.getElementById("preview-card"),
  saveBuildBtn: document.getElementById("save-build-btn"),
  saveAsNewBtn: document.getElementById("save-as-new-btn"),
  exportJsonBtn: document.getElementById("export-json-btn"),
  savedList: document.getElementById("saved-list")
};

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
  els.bodyHeadList.innerHTML = "";
  els.armList.innerHTML = "";
  els.legList.innerHTML = "";
  els.weaponList.innerHTML = "";
  if (els.presetSelect) els.presetSelect.innerHTML = "";
  els.previewCard.innerHTML = "";
  els.savedList.innerHTML = "";
  if (els.applyPresetBtn) els.applyPresetBtn.disabled = true;
  els.saveBuildBtn.disabled = true;
  els.saveAsNewBtn.disabled = true;
}

function formatPartSpec(p) {
  const bits = [];
  if (p.hp > 0) bits.push(`耐久${p.hp}`);
  if (p.maxMp > 0) bits.push(`最大魔力${p.maxMp}/回復+${p.mpRegen}`);
  if (p.power > 0) bits.push(`威力${p.power}/射程${p.range}`);
  if (p.useCost > 0) bits.push(`消費${p.useCost}`);
  if (p.baseCost > 0) bits.push(`基礎消費-${p.baseCost}`);
  if (p.move > 0) bits.push(`移動${p.move}`);
  if (p.acc !== 0) bits.push(`命中${p.acc > 0 ? "+" : ""}${p.acc}%`);
  return bits.join(" / ");
}

function renderList(container, items, selectedId, onPick) {
  container.innerHTML = items
    .map((p) => {
      const sel = p.id === selectedId ? "is-selected" : "";
      return `
        <div class="part-card ${sel}" data-part-id="${p.id}">
          <div class="part-card-header">
            <span>${escapeHtml(p.name)}</span>
            <span class="part-cost">${escapeHtml(p.cat)}</span>
          </div>
          <p class="part-desc">${escapeHtml(p.note || "")}</p>
          <div class="part-mods">${escapeHtml(formatPartSpec(p))}</div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("[data-part-id]").forEach((card) => {
    card.addEventListener("click", () => {
      onPick(card.dataset.partId);
      renderAll();
    });
  });
}

function renderPreview() {
  const { byId } = state.masterData;
  const core = byId[state.draft.core];
  const head = byId[state.draft.head];
  const rArm = byId[state.draft.rightArm];
  const lArm = byId[state.draft.leftArm];
  const rLeg = byId[state.draft.rightLeg];
  const lLeg = byId[state.draft.leftLeg];
  const rWeap = byId[state.draft.rightWeapon] || null;
  const lWeap = byId[state.draft.leftWeapon] || null;
  if (!core || !head || !rArm || !lArm || !rLeg || !lLeg) return;

  const isDualLeg = rLeg.slot === "両脚占有";
  const active = [core, head, rArm, lArm, rLeg];
  if (!isDualLeg) active.push(lLeg);
  if (rWeap) active.push(rWeap);
  if (lWeap && (!rWeap || lWeap.id !== rWeap.id)) active.push(lWeap);

  const baseCost = active.reduce((s, p) => s + (p.baseCost || 0), 0);
  const netMp = (core.mpRegen || 0) - baseCost;
  const move = isDualLeg ? (rLeg.move || 0) : (rLeg.move || 0) + (lLeg.move || 0);

  els.previewCard.innerHTML = `
    <div class="preview-header">
      <h3 class="preview-name">${escapeHtml(state.draft.name || "名称未設定ゴーレム")}</h3>
      <span class="tag">${escapeHtml(state.draft.tactic)}</span>
    </div>
    <p class="muted" style="margin:0 0 6px;">胴体: ${escapeHtml(core.name)} / 頭部: ${escapeHtml(head.name)}</p>
    <p class="muted" style="margin:0 0 6px;">右腕: ${escapeHtml(rArm.name)} / 左腕: ${escapeHtml(lArm.name)}</p>
    <p class="muted" style="margin:0 0 6px;">脚部: ${escapeHtml(isDualLeg ? rLeg.name : `${rLeg.name} + ${lLeg.name}`)}</p>
    <p class="muted" style="margin:0 0 10px;">右手: ${escapeHtml(rWeap ? rWeap.name : "なし")} / 左手: ${escapeHtml(lWeap ? lWeap.name : "なし")}</p>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">胴体耐久</div><div class="stat-value">${core.hp}</div></div>
      <div class="stat-box"><div class="stat-label">最大魔力</div><div class="stat-value">${core.maxMp}</div></div>
      <div class="stat-box"><div class="stat-label">毎ターン魔力収支</div><div class="stat-value">${netMp >= 0 ? `+${netMp}` : netMp}</div></div>
      <div class="stat-box"><div class="stat-label">移動力</div><div class="stat-value">${move}</div></div>
    </div>
  `;
  els.saveBuildBtn.disabled = false;
  els.saveAsNewBtn.disabled = false;
}

function renderSavedBuilds() {
  const saved = loadSavedBuilds();
  if (saved.length === 0) {
    els.savedList.innerHTML = `<p class="muted">保存済み機体はありません。</p>`;
    return;
  }
  els.savedList.innerHTML = saved
    .map((b) => `
      <div class="saved-item">
        <div>
          <div class="saved-item-title">${escapeHtml(b.name || "名称未設定ゴーレム")}</div>
          <div class="muted">${escapeHtml(b.tactic || "")}</div>
        </div>
        <div class="saved-item-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-load-id="${b.id}">読込</button>
          <button type="button" class="btn btn-danger btn-sm" data-del-id="${b.id}">削除</button>
        </div>
      </div>
    `)
    .join("");

  els.savedList.querySelectorAll("[data-load-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = loadSavedBuilds().find((x) => x.id === btn.dataset.loadId);
      if (!target) return;
      state.draft = { ...target };
      els.golemName.value = state.draft.name || "";
      renderAll();
      showToast("読み込みました");
    });
  });

  els.savedList.querySelectorAll("[data-del-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteCustomBuild(btn.dataset.delId);
      if (state.draft.id === btn.dataset.delId) state.draft.id = null;
      renderSavedBuilds();
      showToast("削除しました");
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

function applyPresetById(presetId) {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p || !state.masterData) return;
  const { byId } = state.masterData;
  state.draft = {
    id: null,
    name: p.golemName,
    core: byId[p.core] ? p.core : state.draft.core,
    head: byId[p.head] ? p.head : state.draft.head,
    rightArm: byId[p.rightArm] ? p.rightArm : state.draft.rightArm,
    leftArm: byId[p.leftArm] ? p.leftArm : state.draft.leftArm,
    rightWeapon: p.rightWeapon && byId[p.rightWeapon] ? p.rightWeapon : "",
    leftWeapon: p.leftWeapon && byId[p.leftWeapon] ? p.leftWeapon : "",
    rightLeg: byId[p.rightLeg] ? p.rightLeg : state.draft.rightLeg,
    leftLeg: byId[p.leftLeg] ? p.leftLeg : state.draft.leftLeg,
    tactic: p.tactic
  };
  els.golemName.value = state.draft.name;
  renderAll();
  showToast(`プリセット「${p.name}」を反映しました`);
}

function renderAll() {
  if (!state.masterOk || !state.masterData) {
    clearBlankBuilder();
    return;
  }

  const parts = state.masterData.parts;
  const cores = parts.filter((p) => p.cat === "胴体");
  const heads = parts.filter((p) => p.cat === "頭部");
  const arms = parts.filter((p) => p.cat === "腕部");
  const legs = parts.filter((p) => p.cat === "脚部");
  const equips = parts.filter((p) => ["物理武器", "魔力武器", "シールド"].includes(p.cat));

  if (!state.draft.core && cores[0]) state.draft.core = cores[0].id;
  if (!state.draft.head && heads[0]) state.draft.head = heads[0].id;
  if (!state.draft.rightArm && arms[0]) state.draft.rightArm = arms[0].id;
  if (!state.draft.leftArm && arms[0]) state.draft.leftArm = arms[0].id;
  if (!state.draft.rightLeg && legs[0]) state.draft.rightLeg = legs[0].id;
  if (!state.draft.leftLeg && legs[0]) state.draft.leftLeg = legs[0].id;

  if (els.presetSelect) {
    const prev = els.presetSelect.value;
    els.presetSelect.innerHTML = PRESETS.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
    if (prev && PRESETS.some((p) => p.id === prev)) els.presetSelect.value = prev;
  }
  if (els.applyPresetBtn) els.applyPresetBtn.disabled = false;

  els.tacticSelect.innerHTML = TACTICS.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  els.tacticSelect.value = state.draft.tactic || TACTICS[0];

  renderList(els.bodyHeadList, [...cores, ...heads], state.draft.core, (id) => {
    const picked = state.masterData.byId[id];
    if (picked?.cat === "胴体") state.draft.core = id;
    if (picked?.cat === "頭部") state.draft.head = id;
  });
  renderList(els.armList, arms, state.draft.rightArm, (id) => {
    state.draft.rightArm = id;
  });
  renderList(els.legList, legs, state.draft.rightLeg, (id) => {
    state.draft.rightLeg = id;
    const leg = state.masterData.byId[id];
    if (leg?.slot === "両脚占有") state.draft.leftLeg = id;
  });
  renderList(els.weaponList, equips, state.draft.rightWeapon, (id) => {
    state.draft.rightWeapon = state.draft.rightWeapon === id ? "" : id;
  });

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
  els.golemName?.addEventListener("input", (e) => {
    state.draft.name = e.target.value;
    if (state.masterOk) renderPreview();
  });

  els.tacticSelect?.addEventListener("change", (e) => {
    state.draft.tactic = e.target.value;
    if (state.masterOk) renderPreview();
  });

  els.applyPresetBtn?.addEventListener("click", () => {
    if (!state.masterOk || !els.presetSelect) return;
    applyPresetById(els.presetSelect.value);
  });

  els.saveBuildBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const saved = saveCustomBuild({ ...state.draft, name: state.draft.name.trim() || "名称未設定ゴーレム" });
    state.draft.id = saved.id;
    renderSavedBuilds();
    showToast(`「${saved.name}」を保存しました`);
  });

  els.saveAsNewBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const baseName = state.draft.name.trim() || "名称未設定ゴーレム";
    const saved = saveCustomBuild({ ...state.draft, id: `custom_${Date.now()}`, name: `${baseName} コピー` });
    state.draft.id = saved.id;
    els.golemName.value = saved.name;
    renderSavedBuilds();
    showToast(`「${saved.name}」として保存しました`);
  });

  els.exportJsonBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const payload = {
      version: "1.1",
      name: state.draft.name.trim() || "名称未設定ゴーレム",
      parts: {
        core: state.draft.core,
        head: state.draft.head,
        rightArm: state.draft.rightArm,
        leftArm: state.draft.leftArm,
        rightWeapon: state.draft.rightWeapon || null,
        leftWeapon: state.draft.leftWeapon || null,
        rightLeg: state.draft.rightLeg,
        leftLeg: state.draft.leftLeg
      },
      tactic: state.draft.tactic
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(
      () => showToast("ビルドJSONをコピーしました"),
      () => showToast("JSONを生成しました")
    );
  });

  els.reloadDataBtn?.addEventListener("click", async () => {
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
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();