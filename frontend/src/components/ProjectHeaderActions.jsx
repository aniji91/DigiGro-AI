import { useState, useRef } from 'react';
import ShareModal from './ShareModal';
import PublishPopover from './PublishPopover';
import './Navbar.css';
import './ShareModal.css';
import './PublishPopover.css';

export default function ProjectHeaderActions({
  projectId,
  project,
  onProjectUpdate,
  ensureSaved,
  children,
}) {
  const [showShare, setShowShare] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const publishBtnRef = useRef(null);

  return (
    <>
      {children}

      <button
        type="button"
        className="btn-secondary btn-sm share-header-btn"
        onClick={() => {
          setShowPublish(false);
          setShowShare(true);
        }}
      >
        Share
      </button>

      <div className="publish-popover-wrap">
        <button
          ref={publishBtnRef}
          type="button"
          className={`btn-secondary btn-sm publish-trigger ${project?.published ? 'is-published' : ''}`}
          onClick={() => {
            setShowShare(false);
            setShowPublish((v) => !v);
          }}
        >
          {project?.published ? 'Published' : 'Publish'}
        </button>

        {showPublish && (
          <PublishPopover
            projectId={projectId}
            project={project}
            anchorRef={publishBtnRef}
            onClose={() => setShowPublish(false)}
            ensureSaved={ensureSaved}
            onPublished={(updated) => onProjectUpdate?.(updated)}
          />
        )}
      </div>

      {showShare && (
        <ShareModal
          projectId={projectId}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
