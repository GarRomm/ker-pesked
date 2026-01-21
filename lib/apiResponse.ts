// Helper functions pour les réponses API standardisées

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return Response.json({ success: false, error }, { status });
}

export function unauthorizedResponse(error = "Non authentifié") {
  return Response.json({ success: false, error }, { status: 401 });
}

export function forbiddenResponse(error = "Non autorisé") {
  return Response.json({ success: false, error }, { status: 403 });
}

export function notFoundResponse(error = "Ressource non trouvée") {
  return Response.json({ success: false, error }, { status: 404 });
}
