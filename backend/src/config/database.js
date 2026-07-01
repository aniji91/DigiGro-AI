import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'digigro_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD;
if (dbPassword) {
  dbConfig.password = dbPassword;
}

const pool = mysql.createPool(dbConfig);

export default pool;
