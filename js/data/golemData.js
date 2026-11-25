// 「ジェネリックハート_パーツマスター_Ver1.1」のCSV公開URLを設定
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoLKur7M97rGwULb2fnoi2y8B1wsS9hgowMFDYWX9lnIiuk2e3kC-wHOgDU8v9XX-Sec31XA9MCYX7/pub?gid=501531529&single=true&output=csv";

export const PART_CATEGORIES = {
  core: "胴体",
  head: "頭部",
  arm: "腕部",
  leg: "脚部",
  weapons: ["物理武器", "魔力武器", "シールド"]
};

export const TACTIC_OPTIONS = [
  "精密狙撃で仕留めろ",
  "確実に当てて押し切れ",
  "間合いを制して翻弄せよ",
  "しぶとく生き残れ",
  "全力で薙ぎ払え"
];

export const DEFAULT_TACTIC = TACTIC_OPTIONS[1]; // "確実に当てて押し切れ"

export const PRESET_BUILDS = [
  {
    id: "preset_iron_knight",
    name: "アイアンナイト",
    golemName: "アイアンナイト",
    core: "C02",
    head: "H01",
    rightArm: "A02",
    leftArm: "A01",
    rightLeg: "L01",
    leftLeg: "L01",
    rightWeapon: "W01",
    leftWeapon: "S02",
    tactic: "確実に当てて押し切れ"
  },
  {
    id: "preset_bronze_hammer",
    name: "ブロンズハンマー",
    golemName: "ブロンズハンマー",
    core: "C02",
    head: "H02",
    rightArm: "A02",
    leftArm: "A02",
    rightLeg: "L01",
    leftLeg: "L01",
    rightWeapon: "W03",
    leftWeapon: "",
    tactic: "確実に当てて押し切れ"
  },
  {
    id: "preset_mana_spear",
    name: "マナスピアシューター",
    golemName: "マナスピアシューター",
    core: "C03",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L02",
    leftLeg: "L02",
    rightWeapon: "W06",
    leftWeapon: "W02",
    tactic: "間合いを制して翻弄せよ"
  },
  {
    id: "preset_crystal_mage",
    name: "クリスタルメイジ",
    golemName: "クリスタルメイジ",
    core: "C03",
    head: "H01",
    rightArm: "A01",
    leftArm: "A02",
    rightLeg: "L02",
    leftLeg: "L01",
    rightWeapon: "W05",
    leftWeapon: "S01",
    tactic: "間合いを制して翻弄せよ"
  },
  {
    id: "preset_wind_duelist",
    name: "ウィンドデュエリスト",
    golemName: "ウィンドデュエリスト",
    core: "C01",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L02",
    leftLeg: "L02",
    rightWeapon: "W01",
    leftWeapon: "W06",
    tactic: "全力で薙ぎ払え"
  }
];

const HEADER_ALIASES = {
  id: "id",
  part_id: "id",
  cat: "cat",
  category: "cat",
  rarity: "rarity",
  name: "name",
  part_name: "name",
  slot: "slot",
  hp: "hp",
  baseCost: "baseCost",
  base_cost: "baseCost",
  cost: "baseCost",
  maxMp: "maxMp",
  max_mp: "maxMp",
  mpRegen: "mpRegen",
  mp_regen: "mpRegen",
  power: "power",
  useCost: "useCost",
  use_cost: "useCost",
  mpCost: "useCost",
  mp_cost: "useCost",
  range: "range",
  acc: "acc",
  move: "move",
  evade: "evade",
  note: "note",
  effect: "note",
  description: "note"
};

function normalizeHeaderKey(rawHeader) {
  const cleaned = String(rawHeader ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (HEADER_ALIASES[cleaned]) return HEADER_ALIASES[cleaned];
  const lower = cleaned.toLowerCase();
  return HEADER_ALIASES[lower] || cleaned;
}

function toFiniteNumber(val, fallback = 0) {
  if (val === null || val === undefined || String(val).trim() === "") {
    return fallback;
  }
  const normalized = String(val).trim().replace(/[＋]/g, "+").replace(/[－−]/g, "-");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function createEmptyMasterData() {
  return {
    parts: [],
    byId: {},
    presets: PRESET_BUILDS.map((p) => ({ ...p }))
  };
}

function buildCsvUrl(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

function parseCsvLines(csvText) {
  const text = String(csvText ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cur.trim());
      cur = "";
    } else if (ch === "\n" && !inQuotes) {
      row.push(cur.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseRangeSpec(rangeVal) {
  if (rangeVal === null || rangeVal === undefined || rangeVal === "" || rangeVal === "-") {
    return { min: 1, max: 1, label: "-" };
  }
  const str = String(rangeVal).trim();
  const rangeMatch = str.match(/(\d+)\s*[~\-〜～]\s*(\d+)/);
  if (rangeMatch) {
    const min = Math.max(1, Number(rangeMatch[1]));
    const max = Math.max(min, Number(rangeMatch[2]));
    return { min, max, label: `${min}~${max}` };
  }
  const singleMatch = str.match(/(\d+)/);
  if (singleMatch) {
    const max = Math.max(1, Number(singleMatch[1]));
    return { min: 1, max, label: String(max) };
  }
  return { min: 1, max: 1, label: str };
}

function enrichPart(row) {
  const rangeSpec = parseRangeSpec(row.range);
  const id = String(row.id ?? "").trim();
  const cat = String(row.cat ?? "").trim();
  const rarity = String(row.rarity ?? "").trim() || "コモン";
  const name = String(row.name ?? "").trim();
  const slot = String(row.slot ?? "").trim();
  const note = String(row.note ?? "").trim();
  const text = `${slot} ${cat} ${name} ${note}`;

  return {
    id,
    cat,
    rarity,
    name,
    slot,
    hp: toFiniteNumber(row.hp, 0),
    baseCost: toFiniteNumber(row.baseCost, 0),
    maxMp: toFiniteNumber(row.maxMp, 0),
    mpRegen: toFiniteNumber(row.mpRegen, 0),
    power: toFiniteNumber(row.power, 0),
    useCost: toFiniteNumber(row.useCost, 0),
    range: rangeSpec.label,
    rangeMin: rangeSpec.min,
    rangeMax: rangeSpec.max,
    acc: toFiniteNumber(row.acc, 0),
    move: toFiniteNumber(row.move, 0),
    evade: toFiniteNumber(row.evade, 0),
    note,
    isDualArm: text.includes("両腕"),
    isDualWeapon: text.includes("両手") || text.includes("両腕"),
    isDualLeg:
      text.includes("両脚") ||
      text.includes("両脚占有") ||
      text.includes("ユニット") ||
      text.includes("多脚") ||
      text.includes("ホバー"),
    isIntegratedWeapon:
      text.includes("武器一体") || text.includes("一体型") || text.includes("武器内蔵"),
    isShield: cat.includes("盾") || text.includes("シールド")
  };
}

export function parsePartsCsv(csvText) {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeaderKey);
  return rows
    .slice(1)
    .map((cols) => {
      const row = {};
      headers.forEach((h, i) => {
        if (h) row[h] = cols[i] ?? "";
      });
      return row;
    })
    .filter((p) => p.id && p.name)
    .map(enrichPart);
}

export async function loadGolemMasterData() {
  const empty = createEmptyMasterData();

  if (!SHEET_CSV_URL || !SHEET_CSV_URL.startsWith("http")) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message:
        "エラー：「ジェネリックハート_パーツマスター_Ver1.1」のCSV URLが未設定です。スプレッドシートから読み込めないためプレイできません。"
    };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message:
        "オフラインのため「ジェネリックハート_パーツマスター_Ver1.1」を読み込めませんでした。接続を確認してください。"
    };
  }

  try {
    const res = await fetch(buildCsvUrl(SHEET_CSV_URL), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csvText = await res.text();
    const parts = parsePartsCsv(csvText);
    if (parts.length === 0) {
      throw new Error("有効なパーツ行が見つかりませんでした");
    }

    const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    return {
      data: {
        parts,
        byId,
        presets: PRESET_BUILDS.map((p) => ({ ...p }))
      },
      source: "sheet",
      ok: true,
      message: `「ジェネリックハート_パーツマスター_Ver1.1」読込完了（${parts.length}件）`
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      data: empty,
      source: "error",
      ok: false,
      message: `エラー：「ジェネリックハート_パーツマスター_Ver1.1」を読み込めませんでした（${detail}）。スプレッドシート読込が必要なためプレイできません。`
    };
  }
}
