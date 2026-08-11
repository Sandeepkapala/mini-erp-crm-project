import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([
    'Admin',
    'Sales',
    'Warehouse',
    'Accounts'
  ])
});

export const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email().or(z.literal('')).default(''),
  businessName: z.string().min(2),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().min(3),
  status: z.enum(['Lead', 'Active', 'Inactive']).default('Lead'),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().default('')
});

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  category: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative(),
  minStockAlert: z.coerce.number().int().nonnegative(),
  warehouse: z.string().min(2)
});

export const challanSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  status: z.enum(['Draft', 'Confirmed', 'Cancelled']),
  items: z.array(
    z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive()
    })
  ).min(1)
});

export const followupSchema = z.object({
  note: z.string().min(1),
  followUpDate: z.string().optional().nullable()
});

export function validate(schema: any, data: any) {
  return schema.safeParse(data);
}