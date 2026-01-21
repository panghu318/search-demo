import * as fs from "fs";
import * as path from "path";
import { stringify } from "csv-stringify/sync";
import { SearchResult } from "./types";

// 1) CSV 文字列を生成する（別名で保存モード用）
export function toCsvString(data: SearchResult[]): string {
  return stringify(data, {
    header: true,
    columns: [
      { key: "title", header: "タイトル" },
      { key: "url", header: "URL" },
    ],
  });
}

// 2) CSV ファイルとして書き出す（通常の後端出力用）
export function exportToCsvFile(
  data: SearchResult[],
  outputPath: string
): void {
  const dir = path.dirname(outputPath);

  // 出力先ディレクトリが存在しない場合は作成する
  fs.mkdirSync(dir, { recursive: true });

  const csv = toCsvString(data);

  // CSV ファイルを書き込む
  fs.writeFileSync(outputPath, csv, "utf-8");

  console.log(`CSV 出力が完了しました: ${outputPath}`);
}
