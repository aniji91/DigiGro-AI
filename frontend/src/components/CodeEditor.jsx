import { FileCode } from 'lucide-react';
import './CodeEditor.css';

export default function CodeEditor({ files, activeFile, onSelectFile, onChangeFile }) {
  const current = files.find((f) => f.path === activeFile) || files[0];

  return (
    <div className="code-editor">
      <div className="code-toolbar">
        <FileCode size={14} />
        <span>Code</span>
      </div>

      <div className="code-body">
        <div className="file-tabs">
          {files.map((file) => (
            <button
              key={file.path}
              className={`file-tab ${file.path === (current?.path) ? 'active' : ''}`}
              onClick={() => onSelectFile(file.path)}
            >
              {file.path}
            </button>
          ))}
        </div>

        {current ? (
          <textarea
            className="code-textarea"
            value={current.content}
            onChange={(e) => onChangeFile(current.path, e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="code-empty">No files yet</div>
        )}
      </div>
    </div>
  );
}
