import express from "express";
import cors from "cors";
import path from "path";
import { executeSearch } from "./search";
import { exportToCsvFile, toCsvString } from "./csv";
import { Engine, RunRequest, RunResponse } from "./types";
import {safeSubDir} from "./utils"

const app = express();

// フロントエンド（Vite）からアクセスできるように設定
app.use(cors());
app.use(express.json());

// ヘルスチェック用 API
// app.get("/health", (_req, res) => {
//   res.json({ ok: true });
// });

// 実行 API（検索 → 取得 → CSV 出力）
app.post("/run", async (req, res) => {
  const body = req.body as Partial<RunRequest>;

  // ---- デフォルト値を設定 / バリデーション ----
  const keyword = (body.keyword ?? "").trim();
  const engine = (body.engine ?? "yahoo") as Engine;

  const maxResults = body.maxResults ?? 10;

  const outputDir = (body.outputDir ?? "output").trim() || "output";
  const fileBaseName = (body.fileBaseName ?? "keyword").trim() || "keyword";
  const showBrowser = body.showBrowser ?? true;
  const captureScreenshots = body.captureScreenshots ?? false;

  if (!keyword) {
    return res.status(400).json({ ok: false, message: "keyword is required" });
  }

  // ---- 実行処理 ----
  try {
    const outputPath = safeSubDir(outputDir);
    const outputBaseDir = path.resolve(process.cwd(), "output", outputPath);
    const { results, screenshotSheetPath } = await executeSearch(
      engine,
      keyword,
      maxResults,
      !showBrowser,
      captureScreenshots,
      outputBaseDir
    );

    const csvDir = path.resolve(outputBaseDir, "csv");
    const filepath = path.resolve(csvDir, fileBaseName);

    // CSV ファイルを書き出し
    exportToCsvFile(results, filepath);
    const csvFilePath = `${filepath}`

    const response: RunResponse = {
      ok: true,
      engine,
      keyword,
      count: results.length,
      results,
      csvFileName: fileBaseName,
      csvFilePath,
    };
    if (screenshotSheetPath) {
      response.screenshotSheetPath = screenshotSheetPath;
    }

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

  const maxResults = body.maxResults ?? 10;

  const showBrowser = body.showBrowser ?? true;
  const captureScreenshots = body.captureScreenshots ?? false;
  const outputDir = (body.outputDir ?? "output").trim() || "output";

  if (!keyword) return res.status(400).send("keyword is required");

  try {
    const outputPath = safeSubDir(outputDir);
    const outputBaseDir = path.resolve(process.cwd(), "output", outputPath);
    const { results } = await executeSearch(
      engine,
      keyword,
      maxResults,
      !showBrowser,
      captureScreenshots,
      outputBaseDir
    );

    // CSV 文字列を生成（ファイル保存は行わない）
    const csv = toCsvString(results);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="keyword.csv"');

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
