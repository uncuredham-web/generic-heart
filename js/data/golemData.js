// 「ジェネリックハート_パーツマスター_Ver1.1」のCSV公開URLを設定
export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoLKur7M97rGwULb2fnoi2y8B1wsS9hgowMFDYWX9lnIiuk2e3kC-wHOgDU8v9XX-Sec31XA9MCYX7/pub?gid=501531529&single=true&output=csv";

export const PART_CATEGORIES = {
  core: "胴体",
  head: "頭部",
  arm: "腕部",
  leg: "脚部",
  weapons: ["物理武器", "魔力武器", "シールド"]
};

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
        acc: Number(row.acc || 0),
        move: Number(row.move || 0),
        note: row.note || ""
      };
    })
    .filter((p) => p.id && p.name);
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

    const csvText = await res.text();
    const parts = parsePartsCsv(csvText);
    if (parts.length === 0) throw new Error("有効なパーツ行が見つかりませんでした");

    const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
    return {
      data: { parts, byId, presets: [] },
      source: "sheet",
      ok: true,
      message: `「ジェネリックハート_パーツマスター_Ver1.1」読込完了（${parts.length}件）`
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