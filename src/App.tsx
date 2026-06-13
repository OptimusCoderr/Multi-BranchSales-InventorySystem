import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import DailyReportPage from './pages/DailyReportPage';
import BranchStockPage from './pages/BranchStockPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import BranchesPage from './pages/admin/BranchesPage';
import WarehousesPage from './pages/admin/WarehousesPage';
import ProductsPage from './pages/admin/ProductsPage';
import SalesReportsPage from './pages/admin/SalesReportsPage';
import DebtorsPage from './pages/admin/DebtorsPage';
import { Shield } from 'lucide-react';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500">Admin access required.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AppInner() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    if (!user) setCurrentPage('dashboard');
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  function renderPage() {
    if (user!.role === 'staff') {
      switch (currentPage) {
        case 'sales':        return <SalesPage />;
        case 'daily-report': return <DailyReportPage />;
        case 'branch-stock': return <BranchStockPage />;
        default:             return <DashboardPage />;
      }
    }
    // Admin
    switch (currentPage) {
      case 'sales':        return <SalesPage />;
      case 'daily-report': return <DailyReportPage />;
      case 'branch-stock': return <BranchStockPage />;
      case 'staff':        return <AdminGuard><StaffManagementPage /></AdminGuard>;
      case 'branches':     return <AdminGuard><BranchesPage /></AdminGuard>;
      case 'warehouses':   return <AdminGuard><WarehousesPage /></AdminGuard>;
      case 'products':     return <AdminGuard><ProductsPage /></AdminGuard>;
      case 'reports':      return <AdminGuard><SalesReportsPage /></AdminGuard>;
      case 'debtors':      return <AdminGuard><DebtorsPage /></AdminGuard>;
      default:             return <DashboardPage />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
