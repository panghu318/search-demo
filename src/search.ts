import { chromium } from "playwright";
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

// 検索処理を実行し、検索結果を返す
export async function executeSearch(
  engine: Engine,
  keyword: string,
  maxResults: number,
  headless: boolean
): Promise<SearchResult[]> {
  // デバッグ：実行条件を出力
  console.log(
    `[${engine}] headless=${headless}, keyword=${keyword}, max=${maxResults}`
  );
  const results: SearchResult[] = [];
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  const cfg = getSiteConfig(engine);

  try {
    // 検索ページを開く
    await page.goto(cfg.url);

    // 検索キーワード入力
    if (engine === "yahoo" || engine === "startpage") {
      await page.getByRole(cfg.searchBoxRole!).first().fill(keyword);
    } else {
      await page.locator(cfg.searchInputSelector!).fill(keyword);
    }

    // Enterで検索
    await page.keyboard.press("Enter");

    // 検索結果を待つ（失敗しても落とさない）
    await page
      .waitForSelector(cfg.resultTitleSelector, { timeout: 8000 })
      .catch(async () => {
        console.warn(`[${engine}] 検索結果が見つかりませんでした（timeout）`);
      });

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

  return results;
}
