import { useEffect, useRef, useState } from 'react';
import { useStore, sendPreviewToSW } from './store';
import Home from './Home';
import AssetSwapper, { extractAssets } from './AssetSwapper';
import { loadKeys } from './Settings';
import './App.css';

const PREVIEW_URL = '/preview/';

export default function App() {
  const {
    swReady, initSW,
    projects, loadProjects,
    currentProjectId, openProject,
    code, setCode,
    snapshots, currentSnapshotIndex,
    sync, jumpToSnapshot,
    updateProjectThumbnail,
  } = useStore();

  const iframeRef = useRef(null);
  const [view, setView] = useState('home');
  const [editorOpen, setEditorOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [erudaOn, setErudaOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [assetOpen, setAssetOpen] = useState(false);
  const [assets, setAssets] = useState({});

  useEffect(() => {
    initSW();
    loadProjects();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
        setEditorOpen(true);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('code');
    if (encoded) {
      try {
        const html = decodeURIComponent(atob(encoded));
        setCode(html);
        const interval = setInterval(() => {
          const sw = navigator.serviceWorker?.controller;
          if (sw) {
            sw.postMessage({ type: 'SET_HTML', html });
            clearInterval(interval);
            setView('editor');
          }
        }, 200);
      } catch (_) {}
    }
  }, []);

  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = PREVIEW_URL + '?v=' + Date.now();
    }
  };

  const handleOpenProject = async (id) => {
    await openProject(id);
    setView('editor');
    setEditorOpen(true);
    setFullscreen(false);
    setAssets({});
    setTimeout(async () => {
      const { code: newCode } = useStore.getState();
      if (!newCode) return;
      const keys = loadKeys();
      await new Promise((resolve) => {
        const sw = navigator.serviceWorker?.controller;
        if (!sw) { resolve(); return; }
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        sw.postMessage({ type: 'SET_PREVIEW', data: { html: newCode, assets: {}, keys } }, [channel.port2]);
        setTimeout(resolve, 1000);
      });
      reloadPreview();
    }, 100);
  };

  const handleSync = async () => {
    setSyncing(true);
    const keys = loadKeys();

    // Use MessageChannel to wait for SW to confirm receipt before reloading iframe
    await new Promise((resolve) => {
      const sw = navigator.serviceWorker?.controller;
      if (!sw) { resolve(); return; }
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      sw.postMessage(
        { type: 'SET_PREVIEW', data: { html: code, assets, keys } },
        [channel.port2]
      );
      setTimeout(resolve, 1000); // fallback in case SW doesn't reply
    });

    await sync();
    reloadPreview();

    setTimeout(async () => {
      setSyncing(false);
      if (iframeRef.current && currentProjectId) {
        try {
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(iframeRef.current.contentDocument?.body || iframeRef.current, { scale: 0.3 });
          updateProjectThumbnail(currentProjectId, canvas.toDataURL('image/jpeg', 0.6));
        } catch (_) {}
      }
    }, 600);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(text);
    } catch (e) {
      alert('無法讀取剪貼簿，請確認已授予權限');
    }
  };

  const handleClear = () => {
    if (window.confirm('確定要清除所有代碼嗎？')) {
      setCode('');
      setAssets({});
    }
  };

  const handleSlider = async (e) => {
    const idx = parseInt(e.target.value);
    jumpToSnapshot(idx);
    const snap = useStore.getState().snapshots[idx];
    if (!snap) return;
    const keys = loadKeys();
    await new Promise((resolve) => {
      const sw = navigator.serviceWorker?.controller;
      if (!sw) { resolve(); return; }
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      sw.postMessage({ type: 'SET_PREVIEW', data: { html: snap.html, assets, keys } }, [channel.port2]);
      setTimeout(resolve, 1000);
    });
    reloadPreview();
  };

  const toggleEruda = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!erudaOn) {
      const s = doc.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/eruda/3.0.1/eruda.min.js';
      s.onload = () => { if (win.eruda) { win.eruda.init(); win.eruda.show(); } };
      doc.head.appendChild(s);
    } else {
      try { win.eruda && win.eruda.destroy(); } catch (_) {}
    }
    setErudaOn(!erudaOn);
  };

  const handleShare = () => {
    if (!code.trim()) {
      setShareToast('請先 Sync 代碼');
      setTimeout(() => setShareToast(''), 2000);
      return;
    }
    try {
      const encoded = btoa(encodeURIComponent(code));
      const url = window.location.origin + '/?code=' + encoded;
      navigator.clipboard.writeText(url).then(() => {
        setShareToast('連結已複製！');
        setTimeout(() => setShareToast(''), 2500);
      });
    } catch (_) {
      setShareToast('產生連結失敗');
      setTimeout(() => setShareToast(''), 2000);
    }
  };

  const handleAssetsChange = (newAssets) => {
    setAssets(newAssets);
    sendAssetsToSW(newAssets);
  };

  const snapshotCount = snapshots.length;
  const currentProject = useStore.getState().projects.find(p => p.id === currentProjectId);
  const assetCount = extractAssets(code).length;
  const mappedCount = Object.keys(assets).length;

  if (view === 'home') {
    return <Home onOpen={handleOpenProject} />;
  }

  return (
    <div className="app">
      {editorOpen && !fullscreen && (
        <div className="editor-panel">
          <div className="editor-toolbar">
            <button className="btn-back" onClick={() => setView('home')} title="回首頁">←</button>
            <span className="editor-label">{currentProject?.name || '專案'}</span>
            <div className="paste-hint">⚠️ 請用「貼上」勿直接貼上</div>
            <button className="btn-ghost" onClick={handlePaste}>貼上</button>
            <button className="btn-ghost btn-clear" onClick={handleClear}>清除</button>
            <button
              className={"btn-sync " + (syncing ? 'syncing' : '')}
              onClick={handleSync}
              disabled={syncing || !swReady}
            >
              {syncing ? '同步中…' : 'Sync'}
            </button>
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="← 用「貼上」按鈕貼入 AI 生成的 HTML，手動貼上可能會不完整"
            spellCheck={false}
          />
        </div>
      )}

      <div className="preview-container">
        {!swReady && (
          <div className="sw-loading"><span>初始化沙盒環境…</span></div>
        )}

        {assetOpen && (
          <AssetSwapper
            html={code}
            assets={assets}
            onAssetsChange={handleAssetsChange}
            onClose={() => setAssetOpen(false)}
          />
        )}

        <iframe
          ref={iframeRef}
          className="preview-iframe"
          src={PREVIEW_URL}
          title="Preview"
          allow="camera; microphone; geolocation"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />

        {!fullscreen && (
          <button
            className="preview-toggle-btn"
            onClick={() => setEditorOpen(!editorOpen)}
            title={editorOpen ? '隱藏代碼' : '顯示代碼'}
          >
            {editorOpen ? '▲' : '▼'}
          </button>
        )}

        {!fullscreen && (
          <button
            className={"eruda-btn" + (erudaOn ? ' active' : '')}
            onClick={toggleEruda}
            title="虛擬控制台"
          >
            {'{.}'}
          </button>
        )}

        {shareToast && <div className="share-toast">{shareToast}</div>}
      </div>

      {!fullscreen && (
        <div className="toolbar">
          <div className="slider-section">
            <span className="slider-label">
              {snapshotCount > 0 ? ('v' + (currentSnapshotIndex + 1) + ' / ' + snapshotCount) : '無版本'}
            </span>
            <input
              type="range"
              className="vibe-slider"
              min={0}
              max={Math.max(0, snapshotCount - 1)}
              value={currentSnapshotIndex >= 0 ? currentSnapshotIndex : 0}
              onChange={handleSlider}
              disabled={snapshotCount <= 1}
            />
          </div>

          {assetCount > 0 && (
            <button
              className={"btn-toolbar" + (assetOpen ? ' active' : '')}
              onClick={() => setAssetOpen(!assetOpen)}
              title="素材映射"
            >
              {'素材' + (mappedCount > 0 ? ' ' + mappedCount + '/' + assetCount : ' ' + assetCount)}
            </button>
          )}

          <button className="btn-toolbar" onClick={handleShare} title="分享連結">分享</button>
          <button
            className="btn-toolbar"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                  setFullscreen(true);
                  setEditorOpen(false);
                }).catch(() => {});
              } else {
                document.exitFullscreen();
              }
            }}
            title="全螢幕預覽"
          >
            全螢幕
          </button>
          <span className={"sw-dot" + (swReady ? ' ready' : '')} />
        </div>
      )}
    </div>
  );
}
