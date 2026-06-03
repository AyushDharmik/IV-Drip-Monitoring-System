// ================================================
// js/api.js - Frontend API Integration Layer
// ================================================
// This file coordinates all HTTP requests from our HTML pages
// to the backend Node/Express server.
//
// Key Feature: Automatically loads and attaches the JWT token
// to ensure secure database queries.
// ================================================

// Use relative URLs since frontend is served directly by the backend server
const API_BASE = '';

// ── Generic Fetch Helper ────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('mf_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();
    
    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${res.status}`
      };
    }
    return data;
  } catch (err) {
    console.error(`API Call failed (${method} ${endpoint}):`, err);
    return {
      success: false,
      message: 'Connection to server failed. Is backend running?'
    };
  }
}

// ── Authentication Endpoints ────────────────────
async function apiLogin(email, password) {
  return await apiCall('/api/auth/login', 'POST', { email, password });
}

async function apiGetMe() {
  return await apiCall('/api/auth/me', 'GET');
}

// ── Nurse Management Endpoints ──────────────────
async function apiGetNurses() {
  return await apiCall('/api/nurses', 'GET');
}

async function apiGetNurse(id) {
  return await apiCall(`/api/nurses/${id}`, 'GET');
}

async function apiAddNurse(data) {
  return await apiCall('/api/nurses', 'POST', data);
}

async function apiUpdateNurse(id, data) {
  return await apiCall(`/api/nurses/${id}`, 'PUT', data);
}

async function apiDeleteNurse(id) {
  return await apiCall(`/api/nurses/${id}`, 'DELETE');
}

// ── Patient Management Endpoints ────────────────
async function apiGetPatients() {
  return await apiCall('/api/patients', 'GET');
}

async function apiGetMyPatients() {
  return await apiCall('/api/patients/mine', 'GET');
}

async function apiGetPatient(id) {
  return await apiCall(`/api/patients/${id}`, 'GET');
}

async function apiAddPatient(data) {
  return await apiCall('/api/patients', 'POST', data);
}

async function apiUpdatePatient(id, data) {
  return await apiCall(`/api/patients/${id}`, 'PUT', data);
}

async function apiDeletePatient(id) {
  return await apiCall(`/api/patients/${id}`, 'DELETE');
}

async function apiAssignNurse(patientId, nurseId) {
  return await apiCall(`/api/patients/${patientId}/assign`, 'PUT', { nurse_id: nurseId });
}

// ── Alerts Logging & Retrieval ──────────────────
async function apiSaveAlert(data) {
  return await apiCall('/api/alerts', 'POST', data);
}

async function apiGetAlerts(limit = 100) {
  return await apiCall(`/api/alerts?limit=${limit}`, 'GET');
}

async function apiGetMyAlerts() {
  return await apiCall('/api/alerts/mine', 'GET');
}

async function apiGetPatientAlerts(patientId, limit = 30) {
  return await apiCall(`/api/alerts/patient/${patientId}?limit=${limit}`, 'GET');
}

async function apiDeleteAlert(id) {
  return await apiCall(`/api/alerts/${id}`, 'DELETE');
}

// ── Sensor Readings Endpoints ───────────────────
async function apiSaveReading(data) {
  return await apiCall('/api/readings', 'POST', data);
}

async function apiGetReadings(patientId, limit = 30) {
  return await apiCall(`/api/readings/patient/${patientId}?limit=${limit}`, 'GET');
}

async function apiClearReadings(patientId) {
  return await apiCall(`/api/readings/patient/${patientId}`, 'DELETE');
}
