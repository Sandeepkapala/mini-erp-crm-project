import 'dotenv/config';

import express, { Request, Response } from 'express';

import cors from 'cors';

import { pool } from './db';

import {
  allowRoles,
  AuthRequest,
  comparePassword,
  requireAuth,
  signToken
} from './auth';

import {
  challanSchema,
  customerSchema,
  followupSchema,
  loginSchema,
  productSchema,
  validate
} from './validation';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || true
  })
);

app.use(express.json());

const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch(e => {
      console.error(e);
      res.status(500).json({ message: 'Internal server error' });
    });

app.get(
  '/api/health',
  asyncRoute(async (_req, res) => {
    res.json({ status: 'ok' });
  })
);

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const v = validate(loginSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Invalid login data',
        errors: v.error.flatten()
      });
    }

    const { email, password, role } = v.data;

    const r = await pool.query(
      'SELECT id,name,email,password_hash,role FROM users WHERE email=$1',
      [email]
    );

    if (
      !r.rowCount ||
      !(await comparePassword(password, r.rows[0].password_hash))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }
    if (r.rows[0].role !== role) {
  return res.status(401).json({
    message: 'Invalid role for this account'
  });
}

    const u = r.rows[0];

    res.json({
      token: signToken({
        id: u.id,
        role: u.role,
        name: u.name,
        email: u.email
      }),
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }
    });
  })
);

app.get(
  '/api/dashboard',
  requireAuth,
  asyncRoute(async (_req, res) => {
    const [c, p, ch, low] = await Promise.all([
      pool.query('SELECT count(*)::int count FROM customers'),
      pool.query('SELECT count(*)::int count FROM products'),
      pool.query(
        "SELECT count(*)::int count FROM challans WHERE status='Confirmed'"
      ),
      pool.query(
        'SELECT count(*)::int count FROM products WHERE current_stock <= min_stock_alert'
      )
    ]);

    res.json({
      customers: c.rows[0].count,
      products: p.rows[0].count,
      confirmedChallans: ch.rows[0].count,
      lowStock: low.rows[0].count
    });
  })
);

app.get(
  '/api/customers',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = String(req.query.search || '').trim();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const offset = (page - 1) * limit;

    const where = q
      ? 'WHERE name ILIKE $1 OR mobile ILIKE $1 OR business_name ILIKE $1'
      : '';

    const args = q ? [`%${q}%`] : [];

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT * FROM customers ${where}
         ORDER BY id DESC
         LIMIT $${args.length + 1}
         OFFSET $${args.length + 2}`,
        [...args, limit, offset]
      ),

      pool.query(
        `SELECT count(*)::int count FROM customers ${where}`,
        args
      )
    ]);

    res.json({
      data: rows.rows,
      total: count.rows[0].count,
      page,
      limit
    });
  })
);

app.post(
  '/api/customers',
  requireAuth,
  allowRoles('Admin', 'Sales'),
  asyncRoute(async (req, res) => {
    const v = validate(customerSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    const r = await pool.query(
      `INSERT INTO customers
      (name,mobile,email,business_name,gst_number,customer_type,address,status,follow_up_date,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        x.name,
        x.mobile,
        x.email,
        x.businessName,
        x.gstNumber || null,
        x.customerType,
        x.address,
        x.status,
        x.followUpDate || null,
        x.notes
      ]
    );

    res.status(201).json(r.rows[0]);
  })
);

app.get(
  '/api/customers/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const r = await pool.query(
      'SELECT * FROM customers WHERE id=$1',
      [req.params.id]
    );

    if (!r.rowCount) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    const f = await pool.query(
      'SELECT * FROM followups WHERE customer_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      ...r.rows[0],
      followups: f.rows
    });
  })
);

app.put(
  '/api/customers/:id',
  requireAuth,
  allowRoles('Admin', 'Sales'),
  asyncRoute(async (req, res) => {
    const v = validate(customerSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    const r = await pool.query(
      `UPDATE customers
       SET name=$1,
           mobile=$2,
           email=$3,
           business_name=$4,
           gst_number=$5,
           customer_type=$6,
           address=$7,
           status=$8,
           follow_up_date=$9,
           notes=$10,
           updated_at=now()
       WHERE id=$11
       RETURNING *`,
      [
        x.name,
        x.mobile,
        x.email,
        x.businessName,
        x.gstNumber || null,
        x.customerType,
        x.address,
        x.status,
        x.followUpDate || null,
        x.notes,
        req.params.id
      ]
    );

    if (!r.rowCount) {
      return res.status(404).json({
        message: 'Customer not found'
      });
    }

    res.json(r.rows[0]);
  })
);

app.post(
  '/api/customers/:id/followups',
  requireAuth,
  allowRoles('Admin', 'Sales'),
  asyncRoute(async (req: AuthRequest, res) => {
    const v = validate(followupSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    const r = await pool.query(
      `INSERT INTO followups
      (customer_id,note,follow_up_date,created_by)
      VALUES($1,$2,$3,$4)
      RETURNING *`,
      [
        req.params.id,
        x.note,
        x.followUpDate || null,
        req.user!.id
      ]
    );

    res.status(201).json(r.rows[0]);
  })
);

app.get(
  '/api/products',
  requireAuth,
  asyncRoute(async (req, res) => {
    const q = String(req.query.search || '').trim();
    const low = req.query.lowStock === 'true';

    let where: string[] = [];
    let args: any[] = [];

    if (q) {
      args.push(`%${q}%`);

      where.push(
        `(name ILIKE $${args.length}
        OR sku ILIKE $${args.length}
        OR category ILIKE $${args.length})`
      );
    }

    if (low) {
      where.push('current_stock <= min_stock_alert');
    }

    const clause = where.length
      ? 'WHERE ' + where.join(' AND ')
      : '';

    const r = await pool.query(
      `SELECT * FROM products ${clause} ORDER BY id DESC`,
      args
    );

    res.json(r.rows);
  })
);

app.post(
  '/api/products',
  requireAuth,
  allowRoles('Admin', 'Warehouse'),
  asyncRoute(async (req, res) => {
    const v = validate(productSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    try {
      const r = await pool.query(
        `INSERT INTO products
        (name,sku,category,unit_price,current_stock,min_stock_alert,warehouse)
        VALUES($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          x.name,
          x.sku,
          x.category,
          x.unitPrice,
          x.currentStock,
          x.minStockAlert,
          x.warehouse
        ]
      );

      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      if (e.code === '23505') {
        return res.status(409).json({
          message: 'SKU already exists'
        });
      }

      throw e;
    }
  })
);

app.put(
  '/api/products/:id',
  requireAuth,
  allowRoles('Admin', 'Warehouse'),
  asyncRoute(async (req, res) => {
    const v = validate(productSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    const r = await pool.query(
      `UPDATE products
       SET name=$1,
           sku=$2,
           category=$3,
           unit_price=$4,
           current_stock=$5,
           min_stock_alert=$6,
           warehouse=$7,
           updated_at=now()
       WHERE id=$8
       RETURNING *`,
      [
        x.name,
        x.sku,
        x.category,
        x.unitPrice,
        x.currentStock,
        x.minStockAlert,
        x.warehouse,
        req.params.id
      ]
    );

    if (!r.rowCount) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.json(r.rows[0]);
  })
);

app.get(
  '/api/products/:id/movements',
  requireAuth,
  asyncRoute(async (req, res) => {
    const r = await pool.query(
      `SELECT sm.*, u.name created_by_name
       FROM stock_movements sm
       JOIN users u ON u.id = sm.created_by
       WHERE product_id=$1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json(r.rows);
  })
);

app.get(
  '/api/challans',
  requireAuth,
  asyncRoute(async (_req, res) => {
    const r = await pool.query(
      `SELECT c.*, 
              cu.name customer_name,
              cu.business_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       ORDER BY c.id DESC`
    );

    res.json(r.rows);
  })
);

app.get(
  '/api/challans/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const c = await pool.query(
      `SELECT c.*,
              cu.name customer_name,
              cu.business_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       WHERE c.id=$1`,
      [req.params.id]
    );

    if (!c.rowCount) {
      return res.status(404).json({
        message: 'Challan not found'
      });
    }

    const i = await pool.query(
      'SELECT * FROM challan_items WHERE challan_id=$1',
      [req.params.id]
    );

    res.json({
      ...c.rows[0],
      items: i.rows
    });
  })
);

app.post(
  '/api/challans',
  requireAuth,
  allowRoles('Admin', 'Sales'),
  asyncRoute(async (req: AuthRequest, res) => {
    const v = validate(challanSchema, req.body);

    if (!v.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: v.error.flatten()
      });
    }

    const x = v.data;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ids = [
        ...new Set(x.items.map((i: { productId: number }) => i.productId))
      ];

      const products = await client.query(
        'SELECT * FROM products WHERE id=ANY($1::int[]) FOR UPDATE',
        [ids]
      );

      if (products.rowCount !== ids.length) {
        throw Object.assign(
          new Error('One or more products not found'),
          { status: 404 }
        );
      }

      const map = new Map(
        products.rows.map(p => [p.id, p])
      );

      if (x.status === 'Confirmed') {
        for (const item of x.items) {
          const p = map.get(item.productId);

          if (p.current_stock < item.quantity) {
            throw Object.assign(
              new Error(
                `Insufficient stock for ${p.name}. Available: ${p.current_stock}`
              ),
              { status: 409 }
            );
          }
        }
      }

      const num = `SC-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      const c = await client.query(
        `INSERT INTO challans
        (challan_number,customer_id,status,total_quantity,created_by)
        VALUES($1,$2,$3,$4,$5)
        RETURNING *`,
        [
          num,
          x.customerId,
          x.status,
          x.items.reduce((a: number, b: { quantity: number }) => a + b.quantity, 0),
          req.user!.id
        ]
      );

      for (const item of x.items) {
        const p = map.get(item.productId);

        await client.query(
          `INSERT INTO challan_items
          (challan_id,product_id,product_name,sku,unit_price,quantity)
          VALUES($1,$2,$3,$4,$5,$6)`,
          [
            c.rows[0].id,
            p.id,
            p.name,
            p.sku,
            p.unit_price,
            item.quantity
          ]
        );

        if (x.status === 'Confirmed') {
          await client.query(
            'UPDATE products SET current_stock=current_stock-$1 WHERE id=$2',
            [item.quantity, p.id]
          );

          await client.query(
            `INSERT INTO stock_movements
            (product_id,quantity_changed,movement_type,reason,created_by)
            VALUES($1,$2,'OUT',$3,$4)`,
            [
              p.id,
              item.quantity,
              `Sales challan ${num}`,
              req.user!.id
            ]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json(c.rows[0]);
    } catch (e: any) {
      await client.query('ROLLBACK');

      res.status(e.status || 500).json({
        message: e.message || 'Could not create challan'
      });
    } finally {
      client.release();
    }
  })
);

app.use((_req, res) =>
  res.status(404).json({
    message: 'Route not found'
  })
);

const port = Number(process.env.PORT) || 5000;

app.listen(port, () =>
  console.log(`API running on http://localhost:${port}`)
);