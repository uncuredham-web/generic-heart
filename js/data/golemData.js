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
    tactic: "確実に当てて押し切れ",
    core: "C02",
    head: "H01",
    rightArm: "A02",
    leftArm: "A01",
    rightLeg: "L01",
    leftLeg: "L01",
    rightWeapon: "W01",
    leftWeapon: "S02"
  },
  {
    id: "preset_arch_mage",
    name: "アークメイジ",
    tactic: "間合いを制して翻弄せよ",
    core: "C05",
    head: "H04",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L05",
    leftLeg: "",
    rightWeapon: "W07",
    leftWeapon: ""
  },
  {
    id: "preset_twin_fang",
    name: "ツインファング",
    tactic: "全力で薙ぎ払え",
    core: "C01",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L02",
    leftLeg: "L02",
    rightWeapon: "W01",
    leftWeapon: "W05"
  },
  {
    id: "preset_aegis_bastion",
    name: "イージスバスティオン",
    tactic: "しぶとく生き残れ",
    core: "C04",
    head: "H01",
    rightArm: "A02",
    leftArm: "A02",
    rightLeg: "L03",
    leftLeg: "",
    rightWeapon: "W04",
    leftWeapon: ""
  },
  {
    id: "preset_snipe_hunter",
    name: "スナイプハンター",
    tactic: "精密狙撃で仕留めろ",
    core: "C03",
    head: "H02",
    rightArm: "A04",
    leftArm: "A01",
    rightLeg: "L04",
    leftLeg: "",
    rightWeapon: "W06",
    leftWeapon: "S01"
  }
];

function createEmptyMasterData() {
  return {
    parts: [],
    byId: {},
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
  const text = `${row.slot || ""} ${row.cat || ""} ${row.name || ""} ${row.note || ""}`;

  return {
    id: row.id,
    cat: row.cat,
    rarity: row.rarity || "コモン",
    name: row.name,
    slot: row.slot,
    hp: Number(row.hp || 0),
    baseCost: Number(row.baseCost || 0),
    maxMp: Number(row.maxMp || 0),
    mpRegen: Number(row.mpRegen || 0),
    power: Number(row.power || 0),
    useCost: Number(row.useCost || 0),
    range: row.range || "-",
    rangeMin: rangeSpec.min,
    rangeMax: rangeSpec.max,
    acc: Number(row.acc || 0),
    move: Number(row.move || 0),
    evade: Number(row.evade || 0),
    note: row.note || "",
    isDualArm: text.includes("両腕"),
    isDualWeapon: text.includes("両手") || text.includes("両腕"),
    isDualLeg:
      text.includes("両脚") ||
      text.includes("両脚占有") ||
      text.includes("ユニット") ||
      text.includes("多脚"),
    isIntegratedWeapon:
      text.includes("武器一体") || text.includes("一体型") || text.includes("武器内蔵"),
    isShield: String(row.cat || "").includes("盾") || text.includes("シールド")
  };
}

export function parsePartsCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const cols = parseCsvLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
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
    if (parts.length === 0) throw new Error("有効なパーツ行が見つかりませんでした");

    const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    return {
      data: {
        parts,
        byId,
        presets: PRESET_BUILDS
      },
      source: "sheet",
      ok: true,
      message: `「ジェネリックハート_パーツマスター_Ver1.1」読込完了（${parts.length}件）`
    };
  } catch (err) {
    return {
      data: empty,
      source: "error",
      ok: false,
      message: `エラー：「ジェネリックハート_パーツマスター_Ver1.1」を読み込めませんでした（${err.message}）。スプレッドシート読込が必要なためプレイできません。`
    };
  }
}