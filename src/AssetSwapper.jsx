import { useState } from 'react';
import './AssetSwapper.css';

function extractAssets(html) {
  if (!html) return [];
  const found = new Set();
  // src="..." or src='...'
  const srcReg = /src=["']([^"']+)["']/g;
  // url(...) in CSS
  const urlReg = /url\(["']?([^)"']+)["']?\)/g;
  let m;
  while ((m = srcReg.exec(html)) !== null) {
    const v = m[1].trim();
    if (!v.startsWith('http') && !v.startsWith('data:') && !v.startsWith('//')) found.add(v);
  }
  while ((m = urlReg.exec(html)) !== null) {
    const v = m[1].trim();
    if (!v.startsWith('http') && !v.startsWith('data:') && !v.startsWith('//')) found.add(v);
  }
  return [...found];
}

export { extractAssets };

export default function AssetSwapper({ html, assets, onAssetsChange, onClose }) {
  const paths = extractAssets(html);
  const [previews, setPreviews] = useState({});

  const handleUpload = (path, file) => {
    if (!file) return;
    // Revoke old blob if exists
    if (assets[path]) URL.revokeObjectURL(assets[path]);
    const blobUrl = URL.createObjectURL(file);
    const previewUrl = URL.createObjectURL(file);
    setPreviews(p => ({ ...p, [path]: previewUrl }));
    onAssetsChange({ ...assets, [path]: blobUrl });
  };

  const handleRemove = (path) => {
    if (assets[path]) URL.revokeObjectURL(assets[path]);
    const next = { ...assets };
    delete next[path];
    onAssetsChange(next);
    setPreviews(p => { const n = { ...p }; delete n[path]; return n; });
  };

  if (paths.length === 0) {
    return (
      <div className="asset-panel">
        <div className="asset-header">
          <span className="asset-title">素材映射</span>
          <button className="asset-close" onClick={onClose}>✕</button>
        </div>
        <div className="asset-empty">代碼中沒有偵測到本地素材路徑</div>
      </div>
    );
  }

  return (
    <div className="asset-panel">
      <div className="asset-header">
        <span className="asset-title">素材映射 <span className="asset-count">{paths.length}</span></span>
        <button className="asset-close" onClick={onClose}>✕</button>
      </div>
      <div className="asset-list">
        {paths.map(path => (
          <div key={path} className={"asset-row" + (assets[path] ? ' mapped' : '')}>
            <div className="asset-thumb">
              {previews[path]
                ? <img src={previews[path]} alt="" />
                : <div className="asset-placeholder">{path.split('.').pop().toUpperCase()}</div>
              }
            </div>
            <div className="asset-info">
              <div className="asset-path">{path}</div>
              <div className="asset-status">{assets[path] ? '已對應' : '未對應'}</div>
            </div>
            <div className="asset-actions">
              <label className="btn-upload">
                {assets[path] ? '更換' : '上傳'}
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  style={{ display: 'none' }}
                  onChange={e => handleUpload(path, e.target.files[0])}
                />
              </label>
              {assets[path] && (
                <button className="btn-remove" onClick={() => handleRemove(path)}>移除</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="asset-footer">
        上傳後需重新 Sync 才會生效
      </div>
    </div>
  );
}
