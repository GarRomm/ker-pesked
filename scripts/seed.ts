import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const adminPassword = await hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kerpesked.fr' },
    update: {},
    create: {
      email: 'admin@kerpesked.fr',
      password: adminPassword,
      name: 'Administrateur',
      role: 'ADMIN'
    }
  })
  console.log('Created admin user:', admin.email)

  // Create employee user
  const employeePassword = await hash('employee123', 10)
  const employee = await prisma.user.upsert({
    where: { email: 'employee@kerpesked.fr' },
    update: {},
    create: {
      email: 'employee@kerpesked.fr',
      password: employeePassword,
      name: 'Employé',
      role: 'EMPLOYEE'
    }
  })
  console.log('Created employee user:', employee.email)

  // Create suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Marée Atlantique',
      email: 'contact@maree-atlantique.fr',
      phone: '02 98 12 34 56',
      address: '12 Quai du Port, 29900 Concarneau'
    }
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Pêche Bretonne',
      email: 'info@peche-bretonne.fr',
      phone: '02 98 98 76 54',
      address: '5 Rue des Pêcheurs, 29000 Quimper'
    }
  })
  console.log('Created suppliers')

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Saumon frais',
        description: 'Saumon de Norvège frais, qualité supérieure',
        price: 24.90,
        stock: 15.5,
        unit: 'kg',
        stockAlert: 5,
        supplierId: supplier1.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Bar entier',
        description: 'Bar de ligne, pêché en Atlantique',
        price: 18.50,
        stock: 8.2,
        unit: 'kg',
        stockAlert: 3,
        supplierId: supplier1.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Crevettes roses',
        description: 'Crevettes roses cuites',
        price: 32.00,
        stock: 4.5,
        unit: 'kg',
        stockAlert: 2,
        supplierId: supplier2.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Sole',
        description: 'Sole fraîche du jour',
        price: 28.00,
        stock: 6.0,
        unit: 'kg',
        stockAlert: 3,
        supplierId: supplier1.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Moules',
        description: 'Moules de bouchot de Bretagne',
        price: 4.50,
        stock: 25.0,
        unit: 'kg',
        stockAlert: 10,
        supplierId: supplier2.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Huîtres',
        description: 'Huîtres creuses n°3',
        price: 8.90,
        stock: 12.0,
        unit: 'douzaine',
        stockAlert: 5,
        supplierId: supplier2.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Thon rouge',
        description: 'Thon rouge de Méditerranée',
        price: 35.00,
        stock: 3.5,
        unit: 'kg',
        stockAlert: 2,
        supplierId: supplier1.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cabillaud',
        description: 'Filet de cabillaud frais',
        price: 16.90,
        stock: 10.0,
        unit: 'kg',
        stockAlert: 4,
        supplierId: supplier1.id
      }
    })
  ])
  console.log('Created products')

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        phone: '06 12 34 56 78',
        address: '15 Rue de la République, 29000 Quimper'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Marie Martin',
        email: 'marie.martin@example.com',
        phone: '06 98 76 54 32',
        address: '8 Avenue de la Gare, 29200 Brest'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Restaurant Le Goéland',
        email: 'contact@legoeland.fr',
        phone: '02 98 45 67 89',
        address: '3 Place du Port, 29900 Concarneau'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Sophie Bernard',
        email: 'sophie.bernard@example.com',
        phone: '06 23 45 67 89',
        address: '22 Rue Victor Hugo, 29000 Quimper'
      }
    })
  ])
  console.log('Created customers')

  // Create some orders
  const order1 = await prisma.order.create({
    data: {
      customerId: customers[0].id,
      status: 'DELIVERED',
      total: 0,
      notes: 'Commande pour le weekend',
      orderItems: {
        create: [
          {
            productId: products[0].id,
            quantity: 2,
            price: products[0].price
          },
          {
            productId: products[4].id,
            quantity: 3,
            price: products[4].price
          }
        ]
      }
    }
  })
  await prisma.order.update({
    where: { id: order1.id },
    data: { total: (products[0].price * 2) + (products[4].price * 3) }
  })

  const order2 = await prisma.order.create({
    data: {
      customerId: customers[2].id,
      status: 'PENDING',
      total: 0,
      notes: 'Livraison urgente',
      orderItems: {
        create: [
          {
            productId: products[1].id,
            quantity: 5,
            price: products[1].price
          },
          {
            productId: products[3].id,
            quantity: 4,
            price: products[3].price
          },
          {
            productId: products[2].id,
            quantity: 2,
            price: products[2].price
          }
        ]
      }
    }
  })
  await prisma.order.update({
    where: { id: order2.id },
    data: { 
      total: (products[1].price * 5) + (products[3].price * 4) + (products[2].price * 2) 
    }
  })

  const order3 = await prisma.order.create({
    data: {
      customerId: customers[1].id,
      status: 'DELIVERED',
      total: 0,
      orderItems: {
        create: [
          {
            productId: products[5].id,
            quantity: 6,
            price: products[5].price
          }
        ]
      }
    }
  })
  await prisma.order.update({
    where: { id: order3.id },
    data: { total: products[5].price * 6 }
  })

  console.log('Created orders')
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
