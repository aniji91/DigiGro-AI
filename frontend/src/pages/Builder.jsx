import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Download, Github } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import PreviewPanel from '../components/PreviewPanel';
import CodeEditor from '../components/CodeEditor';
import GitHubPushModal from '../components/GitHubPushModal';
import ProjectViewHeader from '../components/ProjectViewHeader';
import ProjectHeaderActions from '../components/ProjectHeaderActions';
import { api, ApiError } from '../lib/api';
import './Builder.css';

export default function Builder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoGenerateRef = useRef(false);

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeFile, setActiveFile] = useState('App.jsx');
  const [view, setView] = useState('preview');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [aiWarning, setAiWarning] = useState(null);

  const loadProject = useCallback(async () => {
    try {
      const data = await api.getProject(id);
      setProject(data.project);
      setFiles(data.files);
      setMessages(data.messages);
      setPreviewHtml(data.project.preview_html || '');
      if (data.files.length > 0) {
        setActiveFile(data.files[0].path);
      }
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (location.state?.view === 'code' || location.state?.view === 'preview') {
      setView(location.state.view);
    }
  }, [location.state]);

  const handleGenerate = useCallback(async (prompt) => {
    setGenerating(true);
    const tempUserMsg = { id: `temp-${Date.now()}`, role: 'user', content: prompt };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.generate(id, prompt);
      setFiles(result.files);
      setPreviewHtml(result.previewHtml);
      setProject((p) => ({ ...p, status: 'ready' }));
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { id: `user-${Date.now()}`, role: 'user', content: prompt },
        { id: `assistant-${Date.now()}`, role: 'assistant', content: result.message },
      ]);
      if (result.aiWarning) {
        setAiWarning(result.aiWarning);
      } else {
        setAiWarning(null);
      }
      setDirty(false);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [id]);

  useEffect(() => {
    if (loading || autoGenerateRef.current) return;
    if (location.state?.autoGenerate && messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg && !messages.some((m) => m.role === 'assistant')) {
        autoGenerateRef.current = true;
        handleGenerate(firstUserMsg.content);
      }
    }
  }, [loading, messages, location.state, handleGenerate]);

  const handleChangeFile = (path, content) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content } : f))
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.updateFiles(id, files);
      setPreviewHtml(result.previewHtml);
      setProject((p) => ({ ...p, status: 'ready' }));
      setDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const ensureSaved = async () => {
    if (dirty) await handleSave();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await ensureSaved();
      const slug = (project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await api.downloadProject(id, `${slug}.zip`);
    } catch (err) {
      console.error(err);
      alert(err instanceof ApiError ? err.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="builder">
      <ProjectViewHeader
        projectId={id}
        projectName={project?.name || ''}
        activeView={view}
        onViewChange={setView}
        onNameChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
        onNameBlur={async () => {
          if (project?.name) {
            await api.updateProject(id, { name: project.name });
          }
        }}
        rightSlot={(
          <ProjectHeaderActions
            projectId={id}
            project={project}
            ensureSaved={ensureSaved}
            onProjectUpdate={(updated) => setProject((p) => ({ ...p, ...updated, published: updated.published }))}
          >
            <button
              className="btn-secondary btn-sm"
              onClick={handleDownload}
              disabled={downloading}
              title="Download as ZIP"
            >
              <Download size={14} />
              {downloading ? 'Exporting...' : 'Download'}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowGithubModal(true)}
              title="Push to GitHub"
            >
              <Github size={14} />
              GitHub
            </button>
            {dirty && (
              <button className="btn-secondary btn-sm" onClick={handleSave} disabled={saving}>
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </ProjectHeaderActions>
        )}
      />

      {showGithubModal && (
        <GitHubPushModal
          projectId={id}
          projectName={project?.name}
          onClose={() => setShowGithubModal(false)}
          onBeforePush={ensureSaved}
        />
      )}

      {aiWarning && (
        <div className="builder-warning">
          ⚠️ {aiWarning}
        </div>
      )}

      <div className="builder-body">
        <div className="builder-chat">
          <ChatPanel
            messages={messages}
            onSend={handleGenerate}
            generating={generating}
            files={files}
            projectName={project?.name}
            onOpenGithub={() => setShowGithubModal(true)}
          />
        </div>

        <div className="builder-workspace">
          {view === 'preview' ? (
            <PreviewPanel previewHtml={previewHtml} status={generating ? 'building' : project?.status} />
          ) : (
            <CodeEditor
              files={files}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              onChangeFile={handleChangeFile}
            />
          )}
        </div>
      </div>
    </div>
  );
}
