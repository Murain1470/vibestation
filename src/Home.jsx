import { useState, useEffect } from 'react';
import { useStore } from './store';
import Settings from './Settings';
import './Home.css';

export default function Home({ onOpen }) {
  const { projects, loadProjects, createProject, removeProject } = useStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createProject(name);
    setNewName('');
    setCreating(false);
    onOpen(id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (deleteConfirm === id) {
      await removeProject(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - ts;
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';
    return d.toLocaleDateString('zh-TW');
  };

  return (
    <div className="home">
      <div className="home-header">
        <div className="home-logo">
          <span className="logo-icon">V</span>
          <span className="logo-text">VibeStation</span>
        </div>
        <button className="btn-settings" onClick={() => setSettingsOpen(true)} title="API Keys 設定">⚙</button>
        <button className="btn-new" onClick={() => setCreating(true)}>+ 新增專案</button>
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}

      {creating && (
        <div className="create-overlay" onClick={() => setCreating(false)}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-title">新增專案</div>
            <input
              className="create-input"
              autoFocus
              placeholder="專案名稱（例如：景觀模擬展示）"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />
            <div className="create-actions">
              <button className="btn-cancel" onClick={() => setCreating(false)}>取消</button>
              <button className="btn-confirm" onClick={handleCreate} disabled={!newName.trim()}>建立</button>
            </div>
          </div>
        </div>
      )}

      <div className="projects-grid">
        {projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">[  ]</div>
            <div className="empty-text">還沒有專案</div>
            <div className="empty-sub">點擊「新增專案」開始</div>
          </div>
        )}
        {projects.map(p => (
          <div key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
            <div className="card-thumb">
              {p.thumbnail
                ? <img src={p.thumbnail} alt="preview" />
                : <div className="card-thumb-empty"><span>{'</>'}</span></div>
              }
            </div>
            <div className="card-body">
              <div className="card-name">{p.name}</div>
              <div className="card-time">{formatTime(p.updatedAt)}</div>
            </div>
            <button
              className={"card-delete" + (deleteConfirm === p.id ? ' confirm' : '')}
              onClick={e => handleDelete(e, p.id)}
              title={deleteConfirm === p.id ? '再按一次確認刪除' : '刪除'}
            >
              {deleteConfirm === p.id ? '確認?' : 'x'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
