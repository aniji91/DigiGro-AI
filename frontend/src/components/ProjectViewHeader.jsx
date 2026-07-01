import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Code2, BarChart3 } from 'lucide-react';

export default function ProjectViewHeader({
  projectId,
  projectName,
  activeView,
  onNameChange,
  onNameBlur,
  onViewChange,
  rightSlot,
}) {
  const navigate = useNavigate();

  const goToView = (view) => {
    if (view === 'analytics') {
      navigate(`/project/${projectId}/analytics`);
      return;
    }
    if (onViewChange) {
      onViewChange(view);
      return;
    }
    navigate(`/project/${projectId}`, { state: { view } });
  };

  return (
    <header className="builder-header">
      <div className="builder-header-left">
        <Link to="/dashboard" className="builder-back">
          <ArrowLeft size={18} />
        </Link>
        <input
          className="builder-title"
          value={projectName || ''}
          onChange={onNameChange}
          onBlur={onNameBlur}
          readOnly={!onNameChange}
        />
      </div>

      <div className="builder-header-center">
        <button
          type="button"
          className={`view-toggle ${activeView === 'preview' ? 'active' : ''}`}
          onClick={() => goToView('preview')}
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          type="button"
          className={`view-toggle ${activeView === 'code' ? 'active' : ''}`}
          onClick={() => goToView('code')}
        >
          <Code2 size={14} />
          Code
        </button>
        <button
          type="button"
          className={`view-toggle ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => goToView('analytics')}
        >
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      <div className="builder-header-right">{rightSlot}</div>
    </header>
  );
}
