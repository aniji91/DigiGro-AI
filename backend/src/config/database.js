import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getDbConnectionConfig } from './dbConfig.js';

dotenv.config();

const pool = mysql.createPool({
  ...getDbConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
