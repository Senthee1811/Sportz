import 'dotenv/config'; 
import { drizzle } from 'drizzle-orm/node-postgres'; 
import pg from 'pg'; 

if(!process.env.DATABASE_URL){
    throw new Error('Database URL is not defined');
} 

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl:{
        rejectUnauthorized: true,
    }
}); 

export const db = drizzle(pool);