/** Shared MySQL connection settings (Hostinger: use 127.0.0.1 instead of localhost to avoid ::1). */
export function getDbHost() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  return host === 'localhost' ? '127.0.0.1' : host;
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

export function getDbConnectionConfig(overrides = {}) {
  const config = {
    host: getDbHost(),
    port: getDbPort(),
    user: getDbUser(),
    database: getDbName(),
    ...overrides,
  };
  const password = getDbPassword();
  if (password) config.password = password;
  return config;
}
