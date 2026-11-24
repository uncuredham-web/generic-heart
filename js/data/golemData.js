// 「ジェネリックハート_パーツマスター_Ver1.1」のCSV公開URLを設定
export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoLKur7M97rGwULb2fnoi2y8B1wsS9hgowMFDYWX9lnIiuk2e3kC-wHOgDU8v9XX-Sec31XA9MCYX7/pub?gid=501531529&single=true&output=csv";
export const DEFAULT_COST_LIMIT = 100;

export const STAT_LABELS = {
  hp: "HP",
  atk: "攻撃力",
  def: "防御力",
  spd: "素早さ"
};

function createEmptyMasterData() {
  return {
    costLimit: DEFAULT_COST_LIMIT,
    cores: [],
    parts: { arm: [], leg: [], chip: [] },
    presets: []
  };
}

function buildCsvUrl(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

export async function loadGolemMasterData() {
  const empty = createEmptyMasterData();

  if (!SHEET_CSV_URL || !SHEET_CSV_URL.startsWith("http")) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message: "エラー：「ジェネリックハート_パーツマスター_Ver1.1」のCSV URLが未設定です。全パーツを空白にしました。"
    };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message: "オフラインのため「ジェネリックハート_パーツマスター_Ver1.1」を読み込めませんでした。全パーツを空白にしました。"
    };
  }

  try {
    const res = await fetch(buildCsvUrl(SHEET_CSV_URL), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const lines = text
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) throw new Error("CSVデータ行が空です");

    const loadedCores = [];
    const loadedParts = { arm: [], leg: [], chip: [] };

    for (const line of lines.slice(1)) {
      const [type, id, name, slotOrRole, cost, hp, atk, def, spd, skillId, description] =
        parseCsvLine(line);
      if (!type || !id || !name) continue;

      if (type === "core") {
        loadedCores.push({
          id,
          name,
          role: slotOrRole || "カスタム",
          cost: Number(cost) || 0,
          baseStats: {
            hp: Number(hp) || 0,
            atk: Number(atk) || 0,
            def: Number(def) || 0,
            spd: Number(spd) || 0
          },
          description: description || ""
        });
      } else if (type === "part" && loadedParts[slotOrRole]) {
        const mods = {};
        if (Number(hp)) mods.hp = Number(hp);
        if (Number(atk)) mods.atk = Number(atk);
        if (Number(def)) mods.def = Number(def);
        if (Number(spd)) mods.spd = Number(spd);

        loadedParts[slotOrRole].push({
          id,
          slot: slotOrRole,
          name,
          cost: Number(cost) || 0,
          mods,
          skillId: skillId || undefined,
          description: description || ""
        });
      }
    }

    if (loadedCores.length === 0) {
      throw new Error("コアデータが0件です");
    }

    return {
      data: {
        costLimit: DEFAULT_COST_LIMIT,
        cores: loadedCores,
        parts: loadedParts,
        presets: []
      },
      source: "sheet",
      ok: true,
      message: `「ジェネリックハート_パーツマスター_Ver1.1」読込完了（コア${loadedCores.length}件）`
    };
  } catch (err) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message: `エラー：「ジェネリックハート_パーツマスター_Ver1.1」を読み込めませんでした（${err.message}）。全パーツを空白にしました。`
    };
  }
}