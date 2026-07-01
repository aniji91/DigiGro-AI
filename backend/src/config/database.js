import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createPoolOptions } from './dbConfig.js';

dotenv.config();

const pool = mysql.createPool(createPoolOptions());

export default pool;
