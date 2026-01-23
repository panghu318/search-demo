// サブディレクトリ名を安全な形式に正規化する
// ・英数字 / - _ / のみ許可
// ・パストラバーサル（../）を防止
export function safeSubDir(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.\./g, "");
  return cleaned.replace(/^\/+/, "").replace(/\/+$/, "");
}
