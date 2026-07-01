import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'digigro_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
if (process.env.DB_PASSWORD) {
  dbConfig.password = process.env.DB_PASSWORD;
}

const pool = mysql.createPool(dbConfig);

export default pool;
