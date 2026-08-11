import 'dotenv/config';
import { Pool, PoolClient } from 'pg';
import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let activePool: any;
let isPgMem = false;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
});

async function runMigrationsAndSeed(poolInstance: any) {
  try {
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await poolInstance.query(schemaSql);
      console.log('Database schema verified/created successfully.');
    }

    const checkUsers = await poolInstance.query('SELECT COUNT(*)::int as count FROM users');
    if (checkUsers.rows[0].count === 0) {
      console.log('Database is empty. Seeding initial users, customers, and products...');
      const pw = await bcrypt.hash('Password123', 10);
      for (const u of [
        ['Admin', 'admin@erp.local', 'Admin'],
        ['Sales', 'sales@erp.local', 'Sales'],
        ['Warehouse', 'warehouse@erp.local', 'Warehouse'],
        ['Accounts', 'accounts@erp.local', 'Accounts']
      ]) {
        await poolInstance.query(
          'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',
          [u[0], u[1], pw, u[2]]
        );
      }
      await poolInstance.query(
        "INSERT INTO customers(name,mobile,email,business_name,customer_type,address,status,follow_up_date,notes) VALUES ('Rajesh Kumar','9876543210','rajesh@example.com','Rajesh Traders','Wholesale','Ahmedabad, Gujarat','Active',CURRENT_DATE+3,'Regular wholesale customer')"
      );
      await poolInstance.query(
        "INSERT INTO customers(name,mobile,email,business_name,customer_type,address,status) VALUES ('Priya Shah','9123456780','priya@example.com','Priya Retail','Retail','Vadodara, Gujarat','Lead')"
      );
      await poolInstance.query(
        "INSERT INTO products(name,sku,category,unit_price,current_stock,min_stock_alert,warehouse) VALUES ('Premium Rice 25kg','RICE-25','Groceries',1450,50,10,'Main Warehouse'),('Wheat Flour 10kg','FLOUR-10','Groceries',520,8,10,'Main Warehouse'),('Cooking Oil 5L','OIL-5','Grocery',780,35,8,'Main Warehouse')"
      );
      console.log('Database seeded with default accounts and demo data successfully!');
    }
  } catch (err) {
    console.error('Migration / Seed error:', err);
  }
}

async function initDb() {
  if (process.env.DATABASE_URL) {
    try {
      const client = await pgPool.connect();
      client.release();
      console.log('Connected to PostgreSQL database at:', process.env.DATABASE_URL);
      activePool = pgPool;
      await runMigrationsAndSeed(activePool);
      return;
    } catch (err: any) {
      console.error('POSTGRES ERROR:', err);
      console.log('PostgreSQL connection failed/unavailable. Falling back to in-memory PostgreSQL (pg-mem)...');
    }
  } else {
    console.log('DATABASE_URL not provided. Using in-memory PostgreSQL (pg-mem)...');
  }

  isPgMem = true;
  const db = newDb();
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.public.none(schemaSql);
  }
  
  const pgAdapter = db.adapters.createPg();
  activePool = new pgAdapter.Pool();

  try {
    const pw = await bcrypt.hash('Password123', 10);
    for (const u of [['Admin', 'admin@erp.local', 'Admin'], ['Sales', 'sales@erp.local', 'Sales'], ['Warehouse', 'warehouse@erp.local', 'Warehouse'], ['Accounts', 'accounts@erp.local', 'Accounts']]) {
      await activePool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)', [u[0], u[1], pw, u[2]]);
    }
    await activePool.query("INSERT INTO customers(name,mobile,email,business_name,customer_type,address,status,follow_up_date,notes) VALUES ('Rajesh Kumar','9876543210','rajesh@example.com','Rajesh Traders','Wholesale','Ahmedabad, Gujarat','Active',CURRENT_DATE+3,'Regular wholesale customer')");
    await activePool.query("INSERT INTO customers(name,mobile,email,business_name,customer_type,address,status) VALUES ('Priya Shah','9123456780','priya@example.com','Priya Retail','Retail','Vadodara, Gujarat','Lead')");
    await activePool.query("INSERT INTO products(name,sku,category,unit_price,current_stock,min_stock_alert,warehouse) VALUES ('Premium Rice 25kg','RICE-25','Groceries',1450,50,10,'Main Warehouse'),('Wheat Flour 10kg','FLOUR-10','Groceries',520,8,10,'Main Warehouse'),('Cooking Oil 5L','OIL-5','Grocery',780,35,8,'Main Warehouse')");
    console.log('In-memory database initialized and seeded with default demo data!');
  } catch (seedErr) {
    console.error('In-memory seed notice:', seedErr);
  }
}

const initPromise = initDb();

export const pool = {
  async query(text: string, params?: any[]) {
    await initPromise;
    return activePool.query(text, params);
  },
  async connect(): Promise<PoolClient> {
    await initPromise;
    return activePool.connect();
  },
  async end() {
    if (activePool && activePool.end) {
      return activePool.end();
    }
  }
};
