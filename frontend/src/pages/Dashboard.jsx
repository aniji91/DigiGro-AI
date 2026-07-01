import { useState, useEffect, useMemo } from 'react';
import { Plus, FolderOpen, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProjectCard from '../components/ProjectCard';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import './Dashboard.css';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  const loadProjects = () => {
    api.listProjects()
      .then(({ projects: list }) => setProjects(list))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    const { project } = await api.createProject({ name: 'Untitled Project' });
    window.location.href = `/project/${project.id}`;
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdate = (updated) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const folders = useMemo(
    () => [...new Set(projects.map((p) => p.folder).filter(Boolean))],
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.folder && p.folder.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const activeProjects = filtered.filter(
    (p) => Date.now() - new Date(p.updated_at).getTime() < FOURTEEN_DAYS_MS
  );
  const olderProjects = filtered.filter(
    (p) => Date.now() - new Date(p.updated_at).getTime() >= FOURTEEN_DAYS_MS
  );

  const renderGrid = (list) => (
    <div className="projects-grid">
      {list.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          folders={folders}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  return (
    <div className="dashboard">
      <Navbar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>{user?.name ? `${user.name}'s projects` : 'Your Projects'}</h1>
            <p>Create and manage your AI-generated apps</p>
          </div>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            New project
          </button>
        </div>

        {projects.length > 0 && (
          <div className="dashboard-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="dashboard-empty">
            <FolderOpen size={48} strokeWidth={1.5} />
            <h2>No projects yet</h2>
            <p>Create your first app by describing what you want to build.</p>
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={18} />
              Create your first project
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dashboard-empty">
            <p>No projects match your search.</p>
          </div>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <section className="project-section">
                <h2 className="section-title">Active in last 14 days</h2>
                {renderGrid(activeProjects)}
              </section>
            )}
            {olderProjects.length > 0 && (
              <section className="project-section">
                <h2 className="section-title">Older projects</h2>
                {renderGrid(olderProjects)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
