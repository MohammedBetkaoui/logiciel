// ─────────────────────────────────────────────────────────────────
// BBA-Data – Service API (appels IPC ou fetch direct)
// Abstraction pour communiquer avec le backend Python
// ─────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:8000';

/**
 * Wrapper générique pour les appels API.
 * Utilise IPC en Electron, fetch en mode navigateur.
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const { method = 'GET', body, headers = {} } = options;

  try {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(url, config);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }
    // Handle text responses (CSV)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return await response.text();
    }
    return await response.json();
  } catch (error) {
    console.error(`[API] ${method} ${endpoint} →`, error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════

export async function getPatients(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiCall(`/api/patients${q}`);
}

export async function getPatient(id) {
  return apiCall(`/api/patients/${id}`);
}

export async function createPatient(data) {
  return apiCall('/api/patients', { method: 'POST', body: data });
}

export async function deletePatient(id) {
  return apiCall(`/api/patients/${id}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════
// EXAMENS
// ═══════════════════════════════════════════════════════════════

export async function getExamens(patientId) {
  return apiCall(`/api/patients/${patientId}/examens`);
}

export async function createExamen(data) {
  return apiCall('/api/examens', { method: 'POST', body: data });
}

export async function deleteBilan(examenId) {
  return apiCall(`/api/bilans/${examenId}`, { method: 'DELETE' });
}

export async function updateBilan(examenId, data) {
  return apiCall(`/api/bilans/${examenId}`, { method: 'PUT', body: data });
}

export async function getBilan(examenId) {
  return apiCall(`/api/bilans/${examenId}`);
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

export async function getDashboardStats() {
  return apiCall('/api/dashboard/stats');
}

export async function getAnomalies() {
  return apiCall('/api/dashboard/anomalies');
}

export async function getPioHistory() {
  return apiCall('/api/dashboard/pio-history');
}

export async function getDemographics() {
  return apiCall('/api/dashboard/demographics');
}

export async function getTendances() {
  return apiCall('/api/dashboard/tendances');
}

export async function getActiveAlerts() {
  return apiCall('/api/dashboard/alerts');
}

// ═══════════════════════════════════════════════════════════════
// RGPD
// ═══════════════════════════════════════════════════════════════

export async function exportAnonymisedCSV() {
  return apiCall('/api/rgpd/export-csv');
}

export async function exercerDroitOubli(patientId) {
  return apiCall(`/api/rgpd/droit-oubli/${patientId}`, { method: 'POST' });
}

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES CLINIQUES
// ═══════════════════════════════════════════════════════════════

export async function getOptotypeSize(acuity, distance = 5.0, ppi = 96) {
  return apiCall(`/api/clinical/optotype-size?acuity=${acuity}&distance=${distance}&ppi=${ppi}`);
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

export async function checkBackendHealth() {
  try {
    const data = await apiCall('/health');
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
}
