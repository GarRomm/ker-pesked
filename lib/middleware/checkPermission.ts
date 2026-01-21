// Helper functions pour vérifier les permissions

export function checkAdmin(role: string) {
  if (role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
}

export function checkAdminOrEmployee(role: string) {
  if (role !== 'ADMIN' && role !== 'EMPLOYEE') {
    throw new Error('FORBIDDEN');
  }
}
