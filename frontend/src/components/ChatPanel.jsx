import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Loader2, Plus, Mic, Square, ChevronDown,
  Shield, X, FileText, AtSign,
} from 'lucide-react';
import ChatAttachMenu, {
  BUILD_MODES, SKILL_SUGGESTIONS, countSecurityIssues, ChatPopup,
} from './ChatAttachMenu';
import './ChatPanel.css';
import './ChatAttachMenu.css';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatPromptWithAttachments(text, attachments, references) {
  let prompt = text.trim();
  const parts = [];

  if (references.length > 0) {
    parts.push(`References:\n${references.map((r) => `- ${r.path}:\n\`\`\`\n${r.content.slice(0, 2000)}\n\`\`\``).join('\n')}`);
  }

  if (attachments.length > 0) {
    const fileList = attachments.map((a) => `- ${a.name} (${a.type})`).join('\n');
    parts.push(`Attached files:\n${fileList}`);
    for (const a of attachments) {
      if (a.textContent) {
        parts.push(`Content of ${a.name}:\n\`\`\`\n${a.textContent.slice(0, 3000)}\n\`\`\``);
      }
    }
  }

  if (parts.length > 0) {
    prompt = `${prompt}\n\n${parts.join('\n\n')}`;
  }
  return prompt;
}

export default function ChatPanel({
  messages,
  onSend,
  generating,
  files = [],
  onOpenGithub,
  projectName,
}) {
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refMenuOpen, setRefMenuOpen] = useState(false);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [buildMode, setBuildMode] = useState('build');
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [references, setReferences] = useState([]);
  const [securityDismissed, setSecurityDismissed] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const addBtnRef = useRef(null);
  const messagesRef = useRef(null);

  const securityIssues = countSecurityIssues(files);
  const suggestions = SKILL_SUGGESTIONS.slice(0, 3);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating, attachments]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === '.') {
        e.preventDefault();
        setShowKnowledge((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addFiles = useCallback(async (fileList) => {
    const next = [];
    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || /\.(jsx?|tsx?|css|json|md|html)$/i.test(file.name);
      let preview = null;
      let textContent = null;

      if (isImage) {
        preview = await readFileAsDataUrl(file);
      } else if (isText) {
        textContent = await file.text();
      }

      next.push({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        type: file.type || 'file',
        preview,
        textContent,
      });
    }
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const takeScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      const preview = canvas.toDataURL('image/png');
      setAttachments((prev) => [...prev, {
        id: `screenshot-${Date.now()}`,
        name: 'screenshot.png',
        type: 'image/png',
        preview,
        textContent: null,
      }]);
    } catch {
      /* user cancelled */
    }
  };

  const handleMenuAction = (actionId) => {
    setMenuOpen(false);

    switch (actionId) {
      case 'settings':
        setShowKnowledge((v) => !v);
        break;
      case 'history':
        messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'knowledge':
        setShowKnowledge(true);
        break;
      case 'github':
        onOpenGithub?.();
        break;
      case 'firecrawl':
        setInput((v) => `${v}${v ? ' ' : ''}[Use Firecrawl to scrape a URL and add content] `);
        break;
      case 'connectors':
        alert('Connectors: Firecrawl, GitHub, and more coming soon.');
        break;
      case 'screenshot':
        takeScreenshot();
        break;
      case 'reference':
        setRefMenuOpen(true);
        setSkillMenuOpen(false);
        break;
      case 'skill':
        setSkillMenuOpen(true);
        setRefMenuOpen(false);
        break;
      case 'attach':
        fileInputRef.current?.click();
        break;
      default:
        break;
    }
  };

  const addReference = (file) => {
    if (references.some((r) => r.path === file.path)) return;
    setReferences((prev) => [...prev, { path: file.path, content: file.content }]);
    setInput((v) => `${v}${v ? ' ' : ''}@${file.path} `);
    setRefMenuOpen(false);
  };

  const applySkill = (skill) => {
    setInput((v) => (v ? `${v} ${skill}` : skill));
    setSkillMenuOpen(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || generating) return;

    let prompt = input.trim() || 'Use the attached files as reference.';
    if (buildMode === 'plan') {
      prompt = `[Plan mode — describe steps first, then implement]\n${prompt}`;
    } else if (buildMode === 'fix') {
      prompt = `[Fix mode — focus on bug fixes only]\n${prompt}`;
    }

    onSend(formatPromptWithAttachments(prompt, attachments, references));
    setInput('');
    setAttachments([]);
    setReferences([]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const removeReference = (path) => {
    setReferences((prev) => prev.filter((r) => r.path !== path));
    setInput((v) => v.replace(new RegExp(`@${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), ''));
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>{projectName || 'Chat'}</h2>
        <span className="chat-hint">Describe changes to your app</span>
      </div>

      {showKnowledge && (
        <div className="chat-knowledge">
          <p><strong>Project knowledge</strong> — context the AI uses for this app.</p>
          <ul>
            <li>Stack: React + Vite</li>
            <li>Files: {files.length} in project</li>
            <li>Press <kbd>Ctrl</kbd> + <kbd>.</kbd> to toggle</li>
          </ul>
          <button type="button" onClick={() => setShowKnowledge(false)}>Close</button>
        </div>
      )}

      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0 && !generating && (
          <div className="chat-empty">
            <Bot size={32} strokeWidth={1.5} />
            <p>Start by describing what you want to build or change.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="chat-bubble">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}

        {generating && (
          <div className="chat-message chat-assistant">
            <div className="chat-avatar"><Bot size={16} /></div>
            <div className="chat-bubble chat-generating">
              <Loader2 size={16} className="spin" />
              <span>Building your app...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-composer-wrap">
        {suggestions.length > 0 && messages.length > 0 && (
          <div className="chat-suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chat-suggestion-chip" onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {securityIssues > 0 && !securityDismissed && (
          <div className="chat-security-bar">
            <Shield size={15} />
            <span>Security</span>
            <span className="chat-security-badge">{securityIssues} Issues</span>
            <button type="button" className="chat-security-link">View issues</button>
            <button type="button" className="chat-security-dismiss" onClick={() => setSecurityDismissed(true)}>
              <X size={14} />
            </button>
          </div>
        )}

        {(attachments.length > 0 || references.length > 0) && (
          <div className="chat-attachments-preview">
            {attachments.map((a) => (
              <div key={a.id} className="chat-attachment-chip">
                {a.preview ? (
                  <img src={a.preview} alt={a.name} />
                ) : (
                  <FileText size={14} />
                )}
                <span>{a.name}</span>
                <button type="button" onClick={() => removeAttachment(a.id)}><X size={12} /></button>
              </div>
            ))}
            {references.map((r) => (
              <div key={r.path} className="chat-attachment-chip ref">
                <AtSign size={14} />
                <span>{r.path}</span>
                <button type="button" onClick={() => removeReference(r.path)}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.css,.js,.jsx,.ts,.tsx,.html"
            className="chat-file-input"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="chat-composer-inner">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={generating ? 'Queue follow-up...' : 'Ask DigiGro...'}
              rows={3}
              disabled={generating}
            />

            <div className="chat-composer-actions">
              <button
                ref={addBtnRef}
                type="button"
                className={`chat-add-btn ${menuOpen ? 'active' : ''}`}
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setRefMenuOpen(false);
                  setSkillMenuOpen(false);
                  setBuildMenuOpen(false);
                }}
                title={menuOpen ? 'Close menu' : 'Add attachment or tool'}
              >
                {menuOpen ? <X size={18} /> : <Plus size={18} />}
              </button>

              <ChatAttachMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onAction={handleMenuAction}
                anchorRef={addBtnRef}
              />

              <ChatPopup open={refMenuOpen} onClose={() => setRefMenuOpen(false)} anchorRef={addBtnRef} width={220}>
                <div className="chat-ref-menu">
                  {files.length === 0 ? (
                    <p className="chat-ref-empty">No project files yet</p>
                  ) : (
                    files.map((f) => (
                      <button key={f.path} type="button" className="chat-ref-item" onClick={() => addReference(f)}>
                        {f.path}
                      </button>
                    ))
                  )}
                </div>
              </ChatPopup>

              <ChatPopup open={skillMenuOpen} onClose={() => setSkillMenuOpen(false)} anchorRef={addBtnRef} width={240}>
                <div className="chat-skill-menu">
                  {SKILL_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chat-skill-item" onClick={() => applySkill(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </ChatPopup>

              <div className="chat-build-wrap">
                <button
                  type="button"
                  className="chat-build-btn"
                  onClick={() => setBuildMenuOpen((v) => !v)}
                >
                  {BUILD_MODES.find((m) => m.id === buildMode)?.label || 'Build'}
                  <ChevronDown size={14} />
                </button>
                {buildMenuOpen && (
                  <div className="chat-build-menu">
                    {BUILD_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setBuildMode(m.id); setBuildMenuOpen(false); }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className="chat-icon-btn" title="Voice input (coming soon)">
                <Mic size={16} />
              </button>

              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim() && attachments.length === 0}
                title={generating ? 'Queue message' : 'Send'}
              >
                {generating ? <Square size={14} fill="currentColor" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
