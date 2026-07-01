import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel';
import ProjectViewHeader from '../components/ProjectViewHeader';
import ProjectHeaderActions from '../components/ProjectHeaderActions';
import ProjectAnalyticsContent from '../components/ProjectAnalyticsContent';
import { api } from '../lib/api';
import './Builder.css';
import './ProjectAnalytics.css';

export default function ProjectAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeMetric, setActiveMetric] = useState('visitors');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProject(id)
      .then(({ messages: msgs, files: projectFiles }) => {
        setMessages(msgs);
        setFiles(projectFiles);
      })
      .catch(() => navigate('/dashboard'));
  }, [id, navigate]);

  useEffect(() => {
    setLoading(true);
    api.getAnalytics(id, range)
      .then(({ analytics }) => setData(analytics))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, range, navigate]);

  const handleGenerate = async (prompt) => {
    setGenerating(true);
    const tempUserMsg = { id: `temp-${Date.now()}`, role: 'user', content: prompt };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.generate(id, prompt);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { id: `user-${Date.now()}`, role: 'user', content: prompt },
        { id: `assistant-${Date.now()}`, role: 'assistant', content: result.message },
      ]);
      navigate(`/project/${id}`, { state: { view: 'preview' } });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleNameBlur = async () => {
    if (data?.project?.name) {
      try {
        await api.updateProject(id, { name: data.project.name });
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading && !data) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="builder">
      <ProjectViewHeader
        projectId={id}
        projectName={data.project.name}
        activeView="analytics"
        onNameChange={(e) => setData((prev) => ({
          ...prev,
          project: { ...prev.project, name: e.target.value },
        }))}
        onNameBlur={handleNameBlur}
        rightSlot={(
          <ProjectHeaderActions
            projectId={id}
            project={data.project}
            onProjectUpdate={(updated) => setData((prev) => ({
              ...prev,
              project: { ...prev.project, ...updated },
            }))}
          />
        )}
      />

      <div className="builder-body">
        <div className="builder-chat">
          <ChatPanel
            messages={messages}
            onSend={handleGenerate}
            generating={generating}
            files={files}
            projectName={data.project.name}
          />
        </div>

        <div className="builder-workspace builder-workspace--analytics">
          <ProjectAnalyticsContent
            projectId={id}
            data={data}
            range={range}
            onRangeChange={setRange}
            activeMetric={activeMetric}
            onActiveMetricChange={setActiveMetric}
          />
        </div>
      </div>
    </div>
  );
}
