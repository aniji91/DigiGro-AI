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
  return process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || undefined;
}

function useSocketConnection(host) {
  if (process.env.DB_SOCKET) return true;
  // Hostinger grants DB users as user@localhost (socket), not user@127.0.0.1 (TCP)
  return host === 'localhost' && process.platform !== 'win32';
}

export function getDbConnectionConfig(overrides = {}) {
  const host = getDbHost();
  const config = {
    user: getDbUser(),
    database: getDbName(),
    ...overrides,
  };
  const password = getDbPassword();
  if (password) config.password = password;

  if (useSocketConnection(host)) {
    config.socketPath = process.env.DB_SOCKET || '/var/lib/mysql/mysql.sock';
    return config;
  }

  config.host = host;
  config.port = getDbPort();
  return config;
}

export function getDbConnectionMode() {
  const host = getDbHost();
  if (useSocketConnection(host)) {
    return `socket:${process.env.DB_SOCKET || '/var/lib/mysql/mysql.sock'}`;
  }
  return `tcp:${host}:${getDbPort()}`;
}
