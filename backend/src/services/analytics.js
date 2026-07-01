function parseDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'Tablet';
  if (/mobile|android|iphone|ipod/.test(ua)) return 'Mobile';
  return 'Desktop';
}

function parseSource(referer) {
  if (!referer) return 'Direct';
  try {
    const host = new URL(referer).hostname.replace(/^www\./, '');
    return host || 'Direct';
  } catch {
    return 'Direct';
  }
}

function parseCountry(req) {
  return req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'Unknown';
}

function getRangeDays(range) {
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return 7;
}

function emptyDaySeries(days) {
  const series = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    series.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      visitors: 0,
      pageViews: 0,
    });
  }
  return series;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export { parseDevice, parseSource, parseCountry, getRangeDays, emptyDaySeries, formatDuration };

export async function aggregateAnalytics(pool, projectId, range = '7d') {
  const days = getRangeDays(range);

  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS page_views,
       COUNT(DISTINCT session_id) AS visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [projectId, days]
  );

  const [[live]] = await pool.query(
    `SELECT COUNT(DISTINCT session_id) AS current_visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    [projectId]
  );

  const [dailyRows] = await pool.query(
    `SELECT DATE(created_at) AS day,
            COUNT(DISTINCT session_id) AS visitors,
            COUNT(*) AS page_views
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [projectId, days]
  );

  const [sourceRows] = await pool.query(
    `SELECT source, COUNT(DISTINCT session_id) AS visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY source
     ORDER BY visitors DESC
     LIMIT 10`,
    [projectId, days]
  );

  const [pageRows] = await pool.query(
    `SELECT page, COUNT(DISTINCT session_id) AS visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY page
     ORDER BY visitors DESC
     LIMIT 10`,
    [projectId, days]
  );

  const [deviceRows] = await pool.query(
    `SELECT device, COUNT(DISTINCT session_id) AS visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY device
     ORDER BY visitors DESC`,
    [projectId, days]
  );

  const [countryRows] = await pool.query(
    `SELECT country, COUNT(DISTINCT session_id) AS visitors
     FROM project_views
     WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY country
     ORDER BY visitors DESC
     LIMIT 10`,
    [projectId, days]
  );

  const [[bounceStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_sessions,
       SUM(view_count = 1) AS bounced_sessions,
       AVG(view_count) AS avg_views
     FROM (
       SELECT session_id, COUNT(*) AS view_count
       FROM project_views
       WHERE project_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY session_id
     ) sessions`,
    [projectId, days]
  );

  const visitors = totals.visitors || 0;
  const pageViews = totals.page_views || 0;
  const viewsPerVisit = visitors > 0 ? (pageViews / visitors).toFixed(2) : '0';
  const bounceRate = bounceStats.total_sessions > 0
    ? Math.round((bounceStats.bounced_sessions / bounceStats.total_sessions) * 100)
    : 0;
  const avgDurationSec = visitors > 0 ? Math.round((bounceStats.avg_views || 1) * 45) : 0;

  const series = emptyDaySeries(days);
  const dayMap = Object.fromEntries(dailyRows.map((r) => [String(r.day).slice(0, 10), r]));
  for (const point of series) {
    const row = dayMap[point.date];
    if (row) {
      point.visitors = row.visitors;
      point.pageViews = row.page_views;
    }
  }

  const deviceTotal = deviceRows.reduce((s, r) => s + r.visitors, 0) || 1;

  return {
    currentVisitors: live.current_visitors || 0,
    summary: {
      visitors,
      pageViews,
      viewsPerVisit,
      visitDuration: formatDuration(avgDurationSec),
      bounceRate: `${bounceRate}%`,
    },
    chart: series,
    breakdown: {
      sources: sourceRows.map((r) => ({ label: r.source, visitors: r.visitors })),
      pages: pageRows.map((r) => ({ label: r.page || '/', visitors: r.visitors })),
      devices: deviceRows.map((r) => ({
        label: r.device,
        visitors: r.visitors,
        percent: Math.round((r.visitors / deviceTotal) * 1000) / 10,
      })),
      countries: countryRows.map((r) => ({ label: r.country, visitors: r.visitors })),
    },
  };
}
