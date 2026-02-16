import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import MedicalDashboard from './pages/MedicalDashboard';
import Patients from './pages/Patients';
import Dashboard from './pages/Dashboard';
import Database from './pages/Database';
import Analysis from './pages/Analysis';
import Settings from './pages/Settings';
import Bilans from './pages/Bilans';
import ImportCSV from './pages/ImportCSV';
import StatisticalAnalysis from './pages/StatisticalAnalysis';

const pages = {
  'medical-dashboard': MedicalDashboard,
  patients: Patients,
  bilans: Bilans,
  'import-csv': ImportCSV,
  'statistical-analysis': StatisticalAnalysis,
  dashboard: Dashboard,
  database: Database,
  analysis: Analysis,
  settings: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState('medical-dashboard');
  const PageComponent = pages[activePage];

  return (
    <ThemeProvider>
      <MainLayout activePage={activePage} onNavigate={setActivePage}>
        <PageComponent />
      </MainLayout>
    </ThemeProvider>
  );
}
