import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { SearchResult, Engine } from "./types";

// 検索サイトごとの設定
function getSiteConfig(engine: Engine) {
  switch (engine) {
    case "yahoo":
      return {
        url: "https://search.yahoo.co.jp/",
        searchBoxRole: "searchbox" as const,
        resultTitleSelector: "h3.sw-Card__titleMain.sw-Card__titleMain--cite",
      };
    case "startpage":
      return {
        url: "https://www.startpage.com/",
        searchBoxRole: "searchbox" as const,
        resultTitleSelector: "a.result-link",
      };
    case "duckduckgo":
      return {
        url: "https://duckduckgo.com/",
        searchInputSelector: 'input[name="q"]',
        resultTitleSelector: 'a[data-testid="result-title-a"]',
      };
  }
}

type ScreenshotEntry = {
  seq: number;
  label: string;
  path: string;
  width: number;
  height: number;
};

type ExecuteSearchResult = {
  results: SearchResult[];
  screenshotSheetPath?: string;
};

const SHEET_MAX_WIDTH_PX = 900;
const SHEET_ROW_HEIGHT_PX = 20;
const SHEET_SPACING_PX = 40;
const DEFAULT_IMAGE_WIDTH = 1280;
const DEFAULT_IMAGE_HEIGHT = 720;

function createTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function sanitizeForFileName(input: string): string {
  let s = input.trim();
  s = s.replace(/\s+/g, "_");
  s = s.replace(/[\\/:*?"<>|]/g, "");
  s = s.replace(/[\u0000-\u001f]/g, "");
  if (s.length > 60) s = s.slice(0, 60);
  return s || "step";
}

function getPngSize(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24) {
    return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
  }
  const signature = buffer.slice(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function writeScreenshotSheet(
  entries: ScreenshotEntry[],
  sheetPath: string
): Promise<void> {
  fs.mkdirSync(path.dirname(sheetPath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("screenshots");
  sheet.properties.defaultRowHeight = SHEET_ROW_HEIGHT_PX * 0.75;

  let cursorY = 0;
  for (const entry of entries) {
    const rawWidth = entry.width || DEFAULT_IMAGE_WIDTH;
    const rawHeight = entry.height || DEFAULT_IMAGE_HEIGHT;
    const scale =
      rawWidth > SHEET_MAX_WIDTH_PX ? SHEET_MAX_WIDTH_PX / rawWidth : 1;
    const width = Math.max(1, Math.round(rawWidth * scale));
    const height = Math.max(1, Math.round(rawHeight * scale));

    const imageId = workbook.addImage({
      filename: entry.path,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 0, row: cursorY / SHEET_ROW_HEIGHT_PX },
      ext: { width, height },
      editAs: "oneCell",
    });

    cursorY += height + SHEET_SPACING_PX;
  }

  await workbook.xlsx.writeFile(sheetPath);
}

// 検索処理を実行し、検索結果を返す
export async function executeSearch(
  engine: Engine,
  keyword: string,
  maxResults: number,
  headless: boolean,
  captureScreenshots: boolean,
  outputBaseDir: string
): Promise<ExecuteSearchResult> {
  // デバッグ：実行条件を出力
  console.log(
    `[${engine}] headless=${headless}, keyword=${keyword}, max=${maxResults}`
  );
  const results: SearchResult[] = [];
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  const cfg = getSiteConfig(engine);
  const imageDir = path.join(outputBaseDir, "image");
  const sheetDir = path.join(outputBaseDir, "sheet");
  const screenshotEntries: ScreenshotEntry[] = [];
  const capture = async (label: string) => {
    if (!captureScreenshots) return;

    fs.mkdirSync(imageDir, { recursive: true });
    const seq = screenshotEntries.length + 1;
    const timestamp = createTimestamp();
    const safeLabel = sanitizeForFileName(label);
    const fileName = `${String(seq).padStart(3, "0")}_${timestamp}_${safeLabel}.png`;
    const filePath = path.join(imageDir, fileName);
    const buffer = await page.screenshot({ path: filePath, type: "png" });
    const size = getPngSize(buffer);
    screenshotEntries.push({
      seq,
      label,
      path: filePath,
      width: size.width,
      height: size.height,
    });
  };

  try {
    // 検索ページを開く
    await page.goto(cfg.url, { waitUntil: "domcontentloaded" });
    await capture("search_page_loaded");

    // 検索キーワード入力
    if (engine === "yahoo" || engine === "startpage") {
      await page.getByRole(cfg.searchBoxRole!).first().fill(keyword);
    } else {
      await page.locator(cfg.searchInputSelector!).fill(keyword);
    }
    await capture("keyword_filled");

    // Enterで検索
    await page.keyboard.press("Enter");

    // 検索結果を待つ（失敗しても落とさない）
    await page
      .waitForSelector(cfg.resultTitleSelector, { timeout: 8000 })
      .catch(async () => {
        console.warn(`[${engine}] result selector not found (timeout)`);
      });

    await capture("results_loaded");

    // console.log(`[${engine}] url=${page.url()}`);
    // console.log(`[${engine}] selector=${cfg.resultTitleSelector}`);
    // console.log(`[${engine}] count=`, await page.locator(cfg.resultTitleSelector).count());

    // 結果取得
    const extracted = await page.$$eval(
      cfg.resultTitleSelector,
      (nodes, max) =>
        nodes.slice(0, max).map((node) => {
          let anchor: HTMLAnchorElement | null = null;
          //const title = node.textContent?.trim() ?? "";

          if (node instanceof HTMLAnchorElement) {
            anchor = node;
          } else {
            anchor = node.querySelector("a") || node.closest("a");
          }
          const title = anchor?.textContent?.trim() ?? "";
          const url = anchor?.href ?? "";

          return { title, url };
        }),
      maxResults
    );

    // タイトルもURLも空のdataを削除
    results.push(...extracted.filter((r) => r.title || r.url));
  } catch (error) {
    console.error("検索処理中にエラーが発生しました:", error);
  } finally {
    await browser.close().catch(() => {});
  }

  let screenshotSheetPath: string | undefined;
  if (captureScreenshots && screenshotEntries.length > 0) {
    screenshotSheetPath = path.join(
      sheetDir,
      `screenshot_log_${createTimestamp()}.xlsx`
    );
    await writeScreenshotSheet(screenshotEntries, screenshotSheetPath);
  }

  const response: ExecuteSearchResult = { results };
  if (screenshotSheetPath) {
    response.screenshotSheetPath = screenshotSheetPath;
  }
  return response;
}
