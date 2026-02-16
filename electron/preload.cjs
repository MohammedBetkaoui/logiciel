const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Window Controls ──────────────────────────────────────
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // ─── Python Backend ───────────────────────────────────────
  checkHealth: () => ipcRenderer.invoke('python:health'),
  runScript: (scriptName) => ipcRenderer.invoke('python:run-script', scriptName),

  // ─── Database ─────────────────────────────────────────────
  dbQuery: (query) => ipcRenderer.invoke('db:query', query),

  // ─── Medical API ──────────────────────────────────────────
  getPatients: (search) => ipcRenderer.invoke('medical:patients', search),
  getPatient: (id) => ipcRenderer.invoke('medical:patient', id),
  createPatient: (data) => ipcRenderer.invoke('medical:create-patient', data),
  createExamen: (data) => ipcRenderer.invoke('medical:create-examen', data),
  getDashboardStats: () => ipcRenderer.invoke('medical:dashboard-stats'),
  getAnomalies: () => ipcRenderer.invoke('medical:anomalies'),
  getPioHistory: () => ipcRenderer.invoke('medical:pio-history'),
  getDemographics: () => ipcRenderer.invoke('medical:demographics'),
  getActiveAlerts: () => ipcRenderer.invoke('medical:alerts'),
  exportRGPD: () => ipcRenderer.invoke('medical:export-rgpd'),
});
