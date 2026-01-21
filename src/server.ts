import express from "express";
import cors from "cors";
import path from "path";
import { executeSearch } from "./search";
import { exportToCsvFile, toCsvString } from "./csv";
import { buildCsvPath } from "./utils";
import { Engine, RunRequest, RunResponse } from "./types";

const app = express();

// フロントエンド（Vite）からアクセスできるように設定
app.use(cors());
app.use(express.json());

// CSV ファイルをダウンロードできるように静的公開
// 例: http://localhost:3000/files/xxx.csv
app.use("/files", express.static(path.resolve(process.cwd(), "output")));

// ヘルスチェック用 API
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// 実行 API（検索 → 取得 → CSV 出力）
app.post("/run", async (req, res) => {
  const body = req.body as Partial<RunRequest>;

  // ---- 簡易バリデーション（最低限） ----
  const keyword = (body.keyword ?? "").trim();
  const engine = (body.engine ?? "yahoo") as Engine;

  const maxResultsRaw = Number(body.maxResults ?? 10);
  const maxResults = Number.isFinite(maxResultsRaw)
    ? Math.min(Math.max(maxResultsRaw, 1), 50)
    : 10;

  const outputDir = (body.outputDir ?? "output").trim() || "output";
  const fileBaseName = (body.fileBaseName ?? "result").trim() || "result";
  const addTimestamp = Boolean(body.addTimestamp ?? true);
  const showBrowser = Boolean(body.showBrowser ?? true);

  if (!keyword) {
    return res.status(400).json({ ok: false, message: "keyword is required" });
  }

  // ---- 実行処理 ----
  try {
    const results = await executeSearch(
      engine,
      keyword,
      maxResults,
      !showBrowser
    );

    // CSV 出力先パスを生成（タイムスタンプ付与可）
    const csvPath = buildCsvPath({
      outputDir,
      fileBaseName,
      addTimestamp,
    });

    // CSV ファイルを書き出し
    exportToCsvFile(results, csvPath);

    // ダウンロード用 URL を生成
    // buildCsvPath は output 配下を返すため、/files 経由で参照可能
    const fileName = path.basename(csvPath);
    const downloadUrl = `/files/${fileName}`;

    const response: RunResponse = {
      ok: true,
      engine,
      keyword,
      count: results.length,
      results,
      csvFileName: fileName,
      downloadUrl,
    };

    return res.json(response);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

// 別名で保存用 API：CSV をファイルに保存せず、内容を直接返却する
app.post("/csv", async (req, res) => {
  const body = req.body as Partial<RunRequest>;

  const keyword = (body.keyword ?? "").trim();
  const engine = (body.engine ?? "yahoo") as Engine;

  const maxResultsRaw = Number(body.maxResults ?? 10);
  const maxResults = Number.isFinite(maxResultsRaw)
    ? Math.min(Math.max(maxResultsRaw, 1), 50)
    : 10;

  const showBrowser = Boolean(body.showBrowser ?? true);

  if (!keyword) return res.status(400).send("keyword is required");

  try {
    const results = await executeSearch(
      engine,
      keyword,
      maxResults,
      !showBrowser
    );

    // CSV 文字列を生成（ファイル保存は行わない）
    const csv = toCsvString(results);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    // ブラウザにダウンロード可能なレスポンスであることを通知
    res.setHeader("Content-Disposition", 'attachment; filename="result.csv"');

    return res.send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).send("server error");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API server running: http://localhost:${PORT}`);
});
