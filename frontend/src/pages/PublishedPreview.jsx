import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { api } from '../lib/api';
import './PublishedPreview.css';

function getSessionId() {
  const key = 'digigro_session';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function PublishedPreview() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/preview/${id}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setData(body);
      })
      .catch(() => setError('Failed to load site'));
  }, [id]);

  useEffect(() => {
    if (!data) return;
    api.trackView(id, { sessionId: getSessionId(), page: '/' }).catch(() => {});
  }, [id, data]);

  if (error) {
    return (
      <div className="published-page">
        <header className="published-header">
          <Logo size="sm" linkTo="/" />
        </header>
        <div className="published-error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="published-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="published-page">
      <iframe title={data.name} srcDoc={data.previewHtml} sandbox="allow-scripts allow-same-origin" className="published-iframe" />
    </div>
  );
}
