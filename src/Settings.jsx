import { useState, useEffect } from 'react';
import './Settings.css';

const STORAGE_KEY = 'vs_api_keys';

export function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

export function saveKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export default function Settings({ onClose }) {
  const [keys, setKeys] = useState({ anthropic: '', openai: '', gemini: '', custom: [] });
  const [customName, setCustomName] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadKeys();
    setKeys({
      anthropic: stored.anthropic || '',
      openai: stored.openai || '',
      gemini: stored.gemini || '',
      custom: stored.custom || [],
    });
  }, []);

  const handleSave = () => {
    saveKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customKey.trim()) return;
    setKeys(k => ({ ...k, custom: [...k.custom, { name: customName.trim(), key: customKey.trim() }] }));
    setCustomName('');
    setCustomKey('');
  };

  const handleRemoveCustom = (i) => {
    setKeys(k => ({ ...k, custom: k.custom.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">API Keys 設定</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-note">
            Keys 只存在你的瀏覽器（localStorage），不會傳到任何伺服器。<br/>
            Sync 時會自動注入為 <code>window.__VS_KEYS__</code>，代碼可直接調用。
          </div>

          <div className="settings-section">
            <label className="settings-label">Anthropic（Claude）</label>
            <input
              className="settings-input"
              type="password"
              placeholder="sk-ant-..."
              value={keys.anthropic}
              onChange={e => setKeys(k => ({ ...k, anthropic: e.target.value }))}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label">OpenAI</label>
            <input
              className="settings-input"
              type="password"
              placeholder="sk-..."
              value={keys.openai}
              onChange={e => setKeys(k => ({ ...k, openai: e.target.value }))}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label">Google Gemini</label>
            <input
              className="settings-input"
              type="password"
              placeholder="AIza..."
              value={keys.gemini}
              onChange={e => setKeys(k => ({ ...k, gemini: e.target.value }))}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label">自訂 Keys</label>
            {keys.custom.map((c, i) => (
              <div key={i} className="custom-row">
                <span className="custom-name">{c.name}</span>
                <span className="custom-key">{'•'.repeat(8)}</span>
                <button className="btn-remove-key" onClick={() => handleRemoveCustom(i)}>移除</button>
              </div>
            ))}
            <div className="custom-add">
              <input
                className="settings-input settings-input-half"
                placeholder="名稱（例如 Gemini）"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
              <input
                className="settings-input settings-input-half"
                type="password"
                placeholder="Key 值"
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              />
              <button className="btn-add-key" onClick={handleAddCustom} disabled={!customName.trim() || !customKey.trim()}>
                新增
              </button>
            </div>
          </div>

          <div className="settings-usage">
            <label className="settings-label">在代碼中使用方式</label>
            <pre className="settings-code">{`// Claude
const key = window.__VS_KEYS__?.anthropic;

// OpenAI
const key = window.__VS_KEYS__?.openai;

// Gemini
const key = window.__VS_KEYS__?.gemini;

// 自訂
const key = window.__VS_KEYS__?.custom?.名稱;`}</pre>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-save-keys" onClick={handleSave}>
            {saved ? '已儲存 ✓' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
