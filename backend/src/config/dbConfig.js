/** Shared MySQL connection settings for local dev and Hostinger production. */

export function getDbHost() {
  return process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
}

export function getDbPort() {
  return parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
}

export function getDbUser() {
  return process.env.DB_USER || process.env.MYSQL_USER || 'root';
}

export function getDbName() {
  return process.env.DB_NAME || process.env.MYSQL_DATABASE || 'digigro_ai';
}

export function getDbPassword() {
  if (process.env.DB_PASSWORD_B64) {
    return Buffer.from(process.env.DB_PASSWORD_B64, 'base64').toString('utf8');
  }
  return process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || undefined;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL || null;
}

/** Hostinger docs: host localhost + port 3306. Optional DB_SOCKET for socket-only setups. */
export function getDbConnectionConfig(overrides = {}) {
  const config = {
    user: getDbUser(),
    database: getDbName(),
    ...overrides,
  };
  const password = getDbPassword();
  if (password) config.password = password;

  const socketPath = process.env.DB_SOCKET;
  if (socketPath) {
    config.socketPath = socketPath;
    return config;
  }

  config.host = getDbHost();
  config.port = getDbPort();
  return config;
}

export function getDbConnectionMode() {
  if (getDatabaseUrl()) return 'url:DATABASE_URL';
  if (process.env.DB_SOCKET) return `socket:${process.env.DB_SOCKET}`;
  return `tcp:${getDbHost()}:${getDbPort()}`;
}

export function getDbEnvDiagnostics() {
  const password = getDbPassword();
  return {
    dbMode: getDbConnectionMode(),
    dbUser: getDbUser(),
    dbName: getDbName(),
    dbHost: getDbHost(),
    dbPasswordSet: Boolean(password),
    dbPasswordLength: password?.length ?? 0,
    usingDatabaseUrl: Boolean(getDatabaseUrl()),
    usingPasswordB64: Boolean(process.env.DB_PASSWORD_B64),
  };
}

export function createPoolOptions() {
  const url = getDatabaseUrl();
  if (url) {
    return url;
  }
  return {
    ...getDbConnectionConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}
