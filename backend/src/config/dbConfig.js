/** Shared MySQL connection settings for local dev and Hostinger production. */

const DEFAULT_SOCKET = '/var/lib/mysql/mysql.sock';

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

/** Hostinger MySQL users are user@localhost — must use Unix socket, not TCP ::1. */
function shouldUseSocket() {
  if (process.env.DB_SOCKET) return process.env.DB_SOCKET;
  if (process.platform === 'win32') return false;
  const host = getDbHost();
  return host === 'localhost' || host === '127.0.0.1';
}

export function getDbConnectionConfig(overrides = {}) {
  const config = {
    user: getDbUser(),
    database: getDbName(),
    ...overrides,
  };
  const password = getDbPassword();
  if (password) config.password = password;

  const socket = shouldUseSocket();
  if (socket) {
    config.socketPath = typeof socket === 'string' ? socket : DEFAULT_SOCKET;
    return config;
  }

  config.host = getDbHost() === 'localhost' ? '127.0.0.1' : getDbHost();
  config.port = getDbPort();
  return config;
}

export function getDbConnectionMode() {
  const socket = shouldUseSocket();
  if (socket) {
    return `socket:${typeof socket === 'string' ? socket : DEFAULT_SOCKET}`;
  }
  if (getDatabaseUrl()) return 'url:DATABASE_URL';
  const host = getDbHost() === 'localhost' ? '127.0.0.1' : getDbHost();
  return `tcp:${host}:${getDbPort()}`;
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
  const user = getDbUser();
  const database = getDbName();
  const password = getDbPassword();
  const poolExtras = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  // Hostinger: always prefer socket when credentials are in separate env vars
  const socket = shouldUseSocket();
  if (socket && user && database && password) {
    return {
      socketPath: typeof socket === 'string' ? socket : DEFAULT_SOCKET,
      user,
      password,
      database,
      ...poolExtras,
    };
  }

  const url = getDatabaseUrl();
  if (url) {
    return url.replace(/@localhost/i, '@127.0.0.1');
  }

  return { ...getDbConnectionConfig(), ...poolExtras };
}
