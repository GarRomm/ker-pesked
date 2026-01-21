// Versions allégées sans relations inutiles

export interface ProductData {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  supplierId?: string | null;
  supplier?: { name: string } | null;
}

export interface OrderData {
  id: string;
  status: string;
  total: number;
  createdAt: Date | string;
  customerId: string;
  customer?: { name: string } | null;
  orderItems?: unknown[];
}

export interface CustomerData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface SupplierData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export function productLight(product: ProductData) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    supplierId: product.supplierId,
    supplierName: product.supplier?.name
  };
}

export function orderLight(order: OrderData) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    customerId: order.customerId,
    customerName: order.customer?.name,
    itemCount: order.orderItems?.length || 0
  };
}

export function customerLight(customer: CustomerData) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email
  };
}

export function supplierLight(supplier: SupplierData) {
  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email
  };
}
