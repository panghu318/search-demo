import "./app.css";
import { useState } from "react";

type Engine = "yahoo" | "startpage" | "duckduckgo";

export default function App() {
  const [keyword, setKeyword] = useState("");
  const [engine, setEngine] = useState<Engine>("yahoo");
  const [outputDir, setOutputDir] = useState("csv");
  const [showBrowser, setShowBrowser] = useState(true);
  const [running, setRunning] = useState(false);
  const [saveAsEnabled, setSaveAsEnabled] = useState(false);
  const [saveAsFileName, setSaveAsFileName] = useState("");
  const keywordValid = keyword.trim().length > 0;
  const canRun = keywordValid && !running;

  /* =========================
     ファイル名生成用ユーティリティ
  ========================= */

  // yyyymmddhhmmss 形式のタイムスタンプ
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

  // ファイル名として使用できない文字を除去
  function sanitizeForFileName(input: string): string {
    let s = input.trim();

    // 空白はアンダースコアに変換
    s = s.replace(/\s+/g, "_");

    // Windows / macOS で使用不可の文字を除去
    s = s.replace(/[\\/:*?"<>|]/g, "");
    s = s.replace(/[\u0000-\u001f]/g, "");

    // 長すぎる場合はカット
    if (s.length > 60) s = s.slice(0, 60);

    return s || "keyword";
  }

  // 最終的な CSV ファイル名
  // 例：yahoo_検索キーワード_20260114153022.csv
  function makeCsvFileName(): string {
    const e = sanitizeForFileName(engine);
    const k = sanitizeForFileName(keyword);
    const t = createTimestamp();
    return `${e}_${k}_${t}.csv`;
  }

  /* =========================
     CSV ダウンロード（Save As 用）
  ========================= */

  // 後端から CSV 内容を取得（ファイル保存はしない）
  async function fetchCsvBlob(): Promise<Blob> {
    const res = await fetch("http://localhost:3000/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        engine,
        maxResults: 10,
        showBrowser,
      }),
    });
    if (!res.ok) throw new Error("CSV ダウンロード失敗");
    return await res.blob();
  }

  // 保存ダイアログを表示して CSV を保存
  async function saveAs(blob: Blob, fileName: string) {
    // Chromium 系ブラウザ
    // @ts-ignore
    if (window.showSaveFilePicker) {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }

    // fallback：通常ダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* =========================
     ボタンイベント
  ========================= */

  // 「別名で保存」ボタン
  const onSaveAs = async () => {
    if (!keywordValid) return;

    setRunning(true);
    try {
      const blob = await fetchCsvBlob();
      const fileName = makeCsvFileName();
      await saveAs(blob, fileName);

      setSaveAsEnabled(true);
      setSaveAsFileName(fileName);

      alert(`保存完了\nファイル名：${fileName}`);
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setRunning(false);
    }
  };

  // 「CSVを生成」ボタン
  const onGenerate = async () => {
    if (!keywordValid) return;

    // Save As モードの場合は前端保存
    if (saveAsEnabled) {
      setRunning(true);
      try {
        const blob = await fetchCsvBlob();
        const fileName = makeCsvFileName();
        await saveAs(blob, fileName);

        setSaveAsFileName(fileName);
        alert(`保存完了\nファイル名：${fileName}`);
      } catch (e) {
        console.error(e);
        alert("保存に失敗しました");
      } finally {
        setRunning(false);
      }
      return;
    }

    // 通常モード：後端でファイル生成
    setRunning(true);
    try {
      const baseName = makeCsvFileName();

      const res = await fetch("http://localhost:3000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          engine,
          maxResults: 10,
          outputDir,
          fileBaseName: baseName,
          showBrowser,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert("実行に失敗しました");
        return;
      }

      alert(`実行完了\npath:\n${data.csvFilePath}`);
    } finally {
      setRunning(false);
    }
  };

  // Save As モード解除
  const onCancelSaveAs = () => {
    setSaveAsEnabled(false);
    setSaveAsFileName("");
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="gPage">
      <div className="gCenter">
        <div className="gLogo">Search Demo</div>

        <div className="gSearchBox">
          <input
            className="gInput"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="検索キーワードを入力してください、例：LOL"
            disabled={running}
          />
        </div>

        {!keywordValid && (
          <div className="gError">※ 検索キーワードは必須です</div>
        )}

        <div className="gOptions">
          <div className="gOptionRow">
            <div className="gLabel">検索サイト</div>
            <div className="gRadios">
              {(["yahoo", "startpage", "duckduckgo"] as Engine[]).map((e) => (
                <label key={e} className="gRadio">
                  <input
                    type="radio"
                    name="engine"
                    checked={engine === e}
                    onChange={() => setEngine(e)}
                    disabled={running}
                  />
                  <span>{e}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="gOptionRow">
            <div className="gLabel">出力先</div>
            <div className="gDirRow">
              <input
                className="gSmallInput"
                value={
                  saveAsEnabled
                    ? `保存先：選択済み（${saveAsFileName}）`
                    : outputDir
                }
                placeholder="保存フォルダを入力してください、例：csv"
                onChange={(e) => setOutputDir(e.target.value)}
                disabled={running || saveAsEnabled}
              />

              {!saveAsEnabled ? (
                <button
                  className="gPickBtn"
                  onClick={onSaveAs}
                  disabled={!canRun}
                >
                  別名で保存
                </button>
              ) : (
                <button
                  className="gPickBtn"
                  onClick={onCancelSaveAs}
                  disabled={running}
                >
                  SaveAs解除
                </button>
              )}
            </div>
          </div>

          <div className="gOptionRow">
            <div className="gLabel"></div>
            <label className="gCheckbox">
              <input
                type="checkbox"
                checked={showBrowser}
                onChange={(e) => setShowBrowser(e.target.checked)}
                disabled={running}
              />
              <span>ブラウザを表示する</span>
            </label>
          </div>
        </div>

        <div className="gButtons">
          <button className="gBtn" onClick={onGenerate} disabled={!canRun}>
            {running ? "実行中…" : "CSVを生成"}
          </button>
        </div>

        {running && (
          <div className="gRunning">実行中…（しばらくお待ちください）</div>
        )}
      </div>
    </div>
  );
}
