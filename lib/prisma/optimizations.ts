// Sélections optimisées pour éviter de charger trop de données

export const productSelect = {
  id: true,
  name: true,
  price: true,
  stock: true,
  unit: true,
  stockAlert: true,
  supplierId: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      id: true,
      name: true
    }
  }
};

export const orderSelect = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  customerId: true,
  customer: {
    select: {
      id: true,
      name: true,
      phone: true
    }
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      price: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          unit: true
        }
      }
    }
  }
};

export const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true
};

export const supplierSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true
};
