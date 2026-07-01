import { Link } from 'react-router-dom';
import { TrafficChart, BreakdownList, countryLabel } from './analytics/AnalyticsCharts';
import '../pages/ProjectAnalytics.css';

const SUMMARY_TABS = [
  { key: 'visitors', label: 'Visitors', field: 'visitors' },
  { key: 'pageViews', label: 'Page views', field: 'pageViews' },
  { key: 'viewsPerVisit', label: 'Views per visit', field: 'viewsPerVisit' },
  { key: 'visitDuration', label: 'Visit duration', field: 'visitDuration' },
  { key: 'bounceRate', label: 'Bounce rate', field: 'bounceRate' },
];

export default function ProjectAnalyticsContent({
  projectId,
  data,
  range,
  onRangeChange,
  activeMetric,
  onActiveMetricChange,
}) {
  const chartMetric = activeMetric === 'pageViews' ? 'pageViews' : 'visitors';

  return (
    <div className="analytics-workspace">
      <div className="analytics-toolbar">
        <h1>Analytics</h1>
        <div className="analytics-toolbar-right">
          <span className="live-visitors">
            <span className="live-dot" />
            {data.currentVisitors} current visitor{data.currentVisitors === 1 ? '' : 's'}
          </span>
          <select value={range} onChange={(e) => onRangeChange(e.target.value)} className="range-select">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <section className="analytics-panel">
        <h2>Web traffic</h2>
        <div className="summary-tabs">
          {SUMMARY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`summary-tab ${activeMetric === tab.key ? 'active' : ''}`}
              onClick={() => onActiveMetricChange(tab.key)}
            >
              <span className="summary-value">{data.summary[tab.field]}</span>
              <span className="summary-label">{tab.label}</span>
            </button>
          ))}
        </div>
        <TrafficChart data={data.chart} metric={chartMetric} />
      </section>

      <section className="analytics-panel">
        <h2>Traffic breakdown</h2>
        <div className="breakdown-grid">
          <BreakdownList title="Source" items={data.breakdown.sources} />
          <BreakdownList title="Page" items={data.breakdown.pages} />
          <BreakdownList title="Device" items={data.breakdown.devices} showPercent />
        </div>
      </section>

      <section className="analytics-panel analytics-panel--narrow">
        <BreakdownList
          title="Country"
          items={data.breakdown.countries.map((c) => ({
            ...c,
            label: c.label === 'Unknown' ? 'Unknown' : `${c.label} ${countryLabel(c.label)}`.trim(),
          }))}
        />
      </section>

      <section className="analytics-panel analytics-panel--narrow">
        <h2>Project activity</h2>
        <div className="activity-grid">
          <div className="activity-stat">
            <span>{data.userMessages}</span>
            <label>AI prompts</label>
          </div>
          <div className="activity-stat">
            <span>{data.messageCount}</span>
            <label>Chat messages</label>
          </div>
          <div className="activity-stat">
            <span>{data.fileCount}</span>
            <label>Project files</label>
          </div>
          <div className="activity-stat">
            <span>{data.project.published ? 'Live' : 'Draft'}</span>
            <label>Publish status</label>
          </div>
        </div>
        {!data.project.published && (
          <p className="analytics-hint">
            Publish your project to start tracking live site visitors at{' '}
            <Link to={`/project/${projectId}`}>the builder</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
