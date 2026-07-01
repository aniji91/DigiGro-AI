import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings, History, BookOpen, Github, Flame, Network,
  Camera, AtSign, FilePlus, Paperclip,
} from 'lucide-react';
import './ChatAttachMenu.css';

const MENU_SECTIONS = [
  {
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'Ctrl .' },
      { id: 'history', label: 'History', icon: History },
      { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
      { id: 'github', label: 'GitHub', icon: Github },
    ],
  },
  {
    title: 'Linked app connectors',
    items: [
      { id: 'firecrawl', label: 'Firecrawl', icon: Flame },
      { id: 'connectors', label: 'View all connectors', icon: Network },
    ],
  },
  {
    items: [
      { id: 'screenshot', label: 'Take a screenshot', icon: Camera },
      { id: 'reference', label: 'Add reference', icon: AtSign },
      { id: 'skill', label: 'Add skill', icon: FilePlus },
      { id: 'attach', label: 'Attach', icon: Paperclip },
    ],
  },
];

function useAnchorPosition(open, anchorRef) {
  const [pos, setPos] = useState({ left: 0, bottom: 0 });

  useEffect(() => {
    if (!open || !anchorRef?.current) return undefined;

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  return pos;
}

export function ChatPopup({ open, onClose, anchorRef, children, width = 260 }) {
  const pos = useAnchorPosition(open, anchorRef);
  if (!open) return null;

  return createPortal(
    <>
      <div className="chat-attach-backdrop" onClick={onClose} />
      <div
        className="chat-attach-menu chat-attach-menu--portal"
        style={{ left: pos.left, bottom: pos.bottom, width }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export default function ChatAttachMenu({ open, onClose, onAction, anchorRef }) {
  return (
    <ChatPopup open={open} onClose={onClose} anchorRef={anchorRef}>
      {MENU_SECTIONS.map((section, i) => (
        <div key={i} className="chat-attach-section">
          {section.title && (
            <p className="chat-attach-section-title">{section.title}</p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="chat-attach-item"
                onClick={() => onAction(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="chat-attach-shortcut">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </ChatPopup>
  );
}

export const BUILD_MODES = [
  { id: 'build', label: 'Build' },
  { id: 'plan', label: 'Plan' },
  { id: 'fix', label: 'Fix' },
];

export const SKILL_SUGGESTIONS = [
  'Fix download button',
  'Add PDF export',
  'Add drill-down activity',
  'Persist filters',
  'Improve mobile layout',
];

export function countSecurityIssues(files = []) {
  const patterns = [/eval\s*\(/, /innerHTML\s*=/, /dangerouslySetInnerHTML/, /document\.write\s*\(/];
  let count = 0;
  for (const file of files) {
    for (const pattern of patterns) {
      if (pattern.test(file.content || '')) count += 1;
    }
  }
  return count;
}
