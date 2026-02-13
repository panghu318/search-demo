// 検索結果1件分の型定義
export interface SearchResult {
  title: string; // 検索結果のタイトル
  url: string;   // 検索結果のURL
}

// 検索エンジン種別
export type Engine = 'yahoo' | 'startpage' | 'duckduckgo';

// フロントから受け取る実行パラメータ
export interface RunRequest {
  keyword: string;
  engine: Engine;
  maxResults: number;
  outputDir: string;
  fileBaseName: string;
  showBrowser: boolean; // true: headless=false
  captureScreenshots: boolean;
}

// 実行結果（APIレスポンス）
export interface RunResponse {
  ok: boolean;
  message?: string;
  engine?: Engine;
  keyword?: string;
  count?: number;
  results?: SearchResult[];
  csvFileName?: string;
  csvFilePath?: string;
  screenshotSheetPath?: string;
}

// スクリーンショットの記録情報
export type ScreenshotEntry = {
  seq: number;
  label: string;
  path: string;
  width: number;
  height: number;
};

// 検索実行結果（スクリーンショット表のパス含む）
export type ExecuteSearchResult = {
  results: SearchResult[];
  screenshotSheetPath?: string;
};
