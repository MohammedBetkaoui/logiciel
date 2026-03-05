import React, { useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import MedicalDashboard from './pages/MedicalDashboard';
import Patients from './pages/Patients';
import Dashboard from './pages/Dashboard';
import Database from './pages/Database';
import Analysis from './pages/Analysis';
import Settings from './pages/Settings';
import Bilans from './pages/Bilans';
import ImportCSV from './pages/ImportCSV';
import StatisticalAnalysis from './pages/StatisticalAnalysis';
import NormesReference from './pages/NormesReference';
import GuideStatistiques from './pages/GuideStatistiques';

const pages = {
  'medical-dashboard': MedicalDashboard,
  patients: Patients,
  bilans: Bilans,
  'import-csv': ImportCSV,
  'statistical-analysis': StatisticalAnalysis,
  normes: NormesReference,
  'guide-statistiques': GuideStatistiques,
  dashboard: Dashboard,
  database: Database,
  analysis: Analysis,
  settings: Settings,
};

function AuthenticatedApp() {
  const [activePage, setActivePage] = useState('medical-dashboard');
  const [targetCard, setTargetCard] = useState(null);
  const PageComponent = pages[activePage];

  const handleNavigate = useCallback((page, card = null) => {
    setTargetCard(card);
    setActivePage(page);
  }, []);

  return (
    <MainLayout activePage={activePage} onNavigate={handleNavigate}>
      <PageComponent onNavigate={handleNavigate} targetCard={targetCard} onTargetCardConsumed={() => setTargetCard(null)} />
    </MainLayout>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthenticatedApp /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
