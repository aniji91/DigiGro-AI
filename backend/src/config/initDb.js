import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'digigro_ai';

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('draft', 'building', 'ready', 'archived') DEFAULT 'draft',
  preview_html LONGTEXT,
  folder VARCHAR(255) DEFAULT NULL,
  published TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_projects (user_id)
);

CREATE TABLE IF NOT EXISTS project_files (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  path VARCHAR(512) NOT NULL,
  content LONGTEXT NOT NULL,
  language VARCHAR(50) DEFAULT 'javascript',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_path (project_id, path)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_messages (project_id)
);

CREATE TABLE IF NOT EXISTS project_views (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  source VARCHAR(255) DEFAULT 'Direct',
  page VARCHAR(512) DEFAULT '/',
  device VARCHAR(50) DEFAULT 'Desktop',
  country VARCHAR(10) DEFAULT 'Unknown',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_views_project (project_id),
  INDEX idx_project_views_created (created_at),
  INDEX idx_project_views_session (session_id)
);
`;

async function init() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    database: dbName,
    multipleStatements: true,
  };
  if (process.env.DB_PASSWORD) {
    connectionConfig.password = process.env.DB_PASSWORD;
  }

  const connection = await mysql.createConnection(connectionConfig);

  try {
    // Local dev: create database if missing (Hostinger/shared hosting already has one)
    if (!process.env.DB_PASSWORD || process.env.DB_USER === 'root') {
      try {
        const bootstrap = await mysql.createConnection({
          host: connectionConfig.host,
          port: connectionConfig.port,
          user: connectionConfig.user,
          password: connectionConfig.password,
          multipleStatements: true,
        });
        await bootstrap.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await bootstrap.end();
      } catch {
        /* database already exists or user cannot create DB */
      }
    }

    await connection.query(schema);
    const migrations = [
      'ALTER TABLE projects ADD COLUMN folder VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN published TINYINT(1) DEFAULT 0',
      `CREATE TABLE IF NOT EXISTS project_views (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(64) NOT NULL,
        source VARCHAR(255) DEFAULT 'Direct',
        page VARCHAR(512) DEFAULT '/',
        device VARCHAR(50) DEFAULT 'Desktop',
        country VARCHAR(10) DEFAULT 'Unknown',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_views_project (project_id),
        INDEX idx_project_views_created (created_at),
        INDEX idx_project_views_session (session_id)
      )`,
      'ALTER TABLE projects ADD COLUMN slug VARCHAR(255) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN published_at TIMESTAMP NULL DEFAULT NULL',
      "ALTER TABLE projects ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'",
      'ALTER TABLE projects ADD COLUMN invite_link_enabled TINYINT(1) DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN invite_token VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN custom_domain VARCHAR(255) DEFAULT NULL',
      "ALTER TABLE projects ADD COLUMN workspace_access VARCHAR(20) DEFAULT 'edit'",
      `CREATE TABLE IF NOT EXISTS project_members (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
        status ENUM('pending', 'accepted', 'declined') DEFAULT 'accepted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_project_member (project_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS project_invites (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role ENUM('editor', 'viewer') DEFAULT 'editor',
        status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
        invited_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_project_invites_project (project_id)
      )`,
      'ALTER TABLE projects ADD COLUMN vercel_project_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN vercel_deployment_id VARCHAR(64) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN vercel_url VARCHAR(512) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN vercel_domain_status VARCHAR(32) DEFAULT NULL',
      'ALTER TABLE projects ADD COLUMN vercel_domain_dns TEXT DEFAULT NULL',
    ];
    for (const sql of migrations) {
      try {
        await connection.query(sql);
      } catch {
        /* column already exists */
      }
    }
    console.log('✅ DIGIGRO AI database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('Continuing without db:init — check DB_* environment variables.');
    } else {
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

init();
