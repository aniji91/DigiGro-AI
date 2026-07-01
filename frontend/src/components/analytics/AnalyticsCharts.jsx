const COUNTRY_NAMES = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', CA: 'Canada',
  AU: 'Australia', CN: 'China', DE: 'Germany', FR: 'France', Unknown: 'Unknown',
};

function countryLabel(code) {
  return COUNTRY_NAMES[code] || code;
}

function TrafficChart({ data, metric = 'visitors' }) {
  if (!data?.length) return null;

  const values = data.map((d) => d[metric === 'pageViews' ? 'pageViews' : 'visitors']);
  const max = Math.max(...values, 1);
  const width = 640;
  const height = 220;
  const padX = 8;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padY + chartH - (values[i] / max) * chartH;
    return { x, y, ...d, value: values[i] };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${points[0].x},${padY + chartH} ${line} ${points[points.length - 1].x},${padY + chartH}`;

  return (
    <div className="traffic-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(241, 78, 39, 0.25)" />
            <stop offset="100%" stopColor="rgba(241, 78, 39, 0.02)" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padY + chartH * (1 - t)}
            y2={padY + chartH * (1 - t)}
            stroke="#e5e5e5"
            strokeWidth="1"
          />
        ))}
        <polygon points={area} fill="url(#chartFill)" />
        <polyline points={line} fill="none" stroke="#f14e27" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="3.5" fill="#f14e27" />
        ))}
      </svg>
      <div className="chart-labels">
        {data.filter((_, i) => i % Math.ceil(data.length / 4) === 0 || i === data.length - 1).map((d) => (
          <span key={d.date}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function BreakdownList({ title, items, showPercent }) {
  const max = Math.max(...items.map((i) => i.visitors), 1);

  return (
    <div className="breakdown-card">
      <div className="breakdown-head">
        <span>{title}</span>
        <span>Visitors</span>
      </div>
      {items.length === 0 ? (
        <p className="breakdown-empty">No data yet</p>
      ) : (
        items.map((item) => (
          <div key={item.label} className="breakdown-row">
            <div className="breakdown-bar-wrap">
              <div className="breakdown-bar" style={{ width: `${(item.visitors / max) * 100}%` }} />
              <span className="breakdown-label">{item.label}</span>
            </div>
            <span className="breakdown-value">
              {showPercent && item.percent != null ? `${item.percent}%` : item.visitors}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export { TrafficChart, BreakdownList, countryLabel };
