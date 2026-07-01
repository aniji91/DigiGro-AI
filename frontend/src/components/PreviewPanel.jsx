import { Monitor, RefreshCw } from 'lucide-react';
import './PreviewPanel.css';

export default function PreviewPanel({ previewHtml, status }) {
  return (
    <div className="preview-panel">
      <div className="preview-toolbar">
        <div className="preview-toolbar-left">
          <Monitor size={14} />
          <span>Preview</span>
        </div>
        <div className="preview-toolbar-right">
          {status === 'building' && (
            <span className="preview-status building">Building...</span>
          )}
          {status === 'ready' && (
            <span className="preview-status ready">Live</span>
          )}
        </div>
      </div>
      <div className="preview-frame-wrap">
        {previewHtml ? (
          <iframe
            title="App Preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="preview-iframe"
          />
        ) : (
          <div className="preview-placeholder">
            <RefreshCw size={32} strokeWidth={1.5} />
            <p>Your app preview will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
