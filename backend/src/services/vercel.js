const VERCEL_API = 'https://api.vercel.com';

function getConfig() {
  return {
    token: process.env.VERCEL_TOKEN || '',
    teamId: process.env.VERCEL_TEAM_ID || '',
  };
}

export function isVercelConfigured() {
  return Boolean(getConfig().token);
}

function withTeam(path) {
  const { teamId } = getConfig();
  if (!teamId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

async function vercelFetch(path, options = {}) {
  const { token } = getConfig();
  if (!token) {
    throw new Error('Vercel is not configured. Add VERCEL_TOKEN to backend/.env');
  }

  const res = await fetch(`${VERCEL_API}${withTeam(path)}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Vercel API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function toBase64(content) {
  return Buffer.from(content, 'utf8').toString('base64');
}

function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'digigro-app';
}

/**
 * Deploy static index.html to Vercel (production).
 */
export async function deployStaticSite({ slug, html, vercelProjectId }) {
  const name = sanitizeProjectName(slug);
  const body = {
    name,
    files: [
      {
        file: 'index.html',
        data: toBase64(html),
        encoding: 'base64',
      },
    ],
    projectSettings: {
      framework: null,
    },
    target: 'production',
  };

  if (vercelProjectId) {
    body.project = vercelProjectId;
  }

  const deployment = await vercelFetch('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const url = deployment.url
    ? `https://${deployment.url}`
    : deployment.alias?.[0]
      ? `https://${deployment.alias[0]}`
      : null;

  return {
    deploymentId: deployment.id,
    projectId: deployment.projectId || vercelProjectId,
    url,
    readyState: deployment.readyState,
  };
}

/**
 * Add a custom domain to a Vercel project.
 */
export async function addProjectDomain(vercelProjectId, domain) {
  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const data = await vercelFetch(`/v10/projects/${vercelProjectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: normalized }),
  });

  const dns = await getDomainDnsInstructions(normalized).catch(() => ({
    domain: normalized,
    configuredBy: 'CNAME',
    records: [{ type: 'CNAME', name: '@', value: 'cname.vercel-dns.com' }],
  }));

  return {
    domain: normalized,
    verified: data.verified,
    verification: data.verification || [],
    dns,
  };
}

/**
 * Fetch DNS records the user must add at their registrar.
 */
export async function getDomainDnsInstructions(domain) {
  const normalized = domain.trim().toLowerCase();
  const config = await vercelFetch(`/v6/domains/${encodeURIComponent(normalized)}/config`);

  const records = [];

  if (config.recommendedCNAME?.length) {
    for (const row of config.recommendedCNAME) {
      const value = row.value?.[0];
      if (value) records.push({ type: 'CNAME', name: '@', value });
    }
  } else if (config.cname?.length) {
    records.push({ type: 'CNAME', name: '@', value: config.cname[0] });
  }

  if (config.recommendedIPv4?.length) {
    for (const row of config.recommendedIPv4) {
      for (const ip of row.value || []) {
        records.push({ type: 'A', name: '@', value: ip });
      }
    }
  } else if (config.aValues?.length) {
    for (const ip of config.aValues) {
      records.push({ type: 'A', name: '@', value: ip });
    }
  }

  if (records.length === 0) {
    records.push({ type: 'CNAME', name: '@', value: 'cname.vercel-dns.com' });
  }

  return {
    domain: normalized,
    configuredBy: config.configuredBy || 'CNAME',
    records,
    misconfigured: config.misconfigured,
  };
}

export async function removeProjectDomain(vercelProjectId, domain) {
  const normalized = domain.trim().toLowerCase();
  await vercelFetch(
    `/v9/projects/${vercelProjectId}/domains/${encodeURIComponent(normalized)}`,
    { method: 'DELETE' },
  );
}
