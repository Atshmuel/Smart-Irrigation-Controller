import mysql from 'mysql2/promise'
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('.env') });

const { DB_PASSWORD, DB_HOST, DB_NAME, DB_USER } = process.env


export const pool = mysql.createPool({
    host: `${DB_HOST}`,
    user: `${DB_USER}`,
    password: `${DB_PASSWORD}`,
    database: `${DB_NAME}`,
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true,
});

