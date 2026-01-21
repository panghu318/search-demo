import path from "path";

type CsvPathConfig = {
  outputDir: string;      // サブディレクトリ（例："" または "abc"）。絶対パスは許可しない
  fileBaseName: string;   // ファイル名（拡張子なし）
  addTimestamp: boolean;  // タイムスタンプ付与フラグ
};

// ファイル名用のタイムスタンプを生成する（yyyymmdd_hhmmss）
function createTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// サブディレクトリ名を安全な形式に正規化する
// ・英数字 / - _ / のみ許可
// ・パストラバーサル（../）を防止
function safeSubDir(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.\./g, "");
  return cleaned.replace(/^\/+/, "").replace(/\/+$/, "");
}

// CSV ファイルの出力パスを生成する
export function buildCsvPath(cfg: CsvPathConfig): string {
  const stamp = cfg.addTimestamp ? `_${createTimestamp()}` : "";
  const fileName = `${cfg.fileBaseName}${stamp}.csv`;

  // 出力先のベースディレクトリ（常に output 配下）
  const base = path.resolve(process.cwd(), "output");

  // サブディレクトリを安全に解決
  const sub = safeSubDir(cfg.outputDir || "");

  return path.resolve(base, sub, fileName);
}
