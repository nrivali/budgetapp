import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>$</span> Budget App
        </div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            Transactions
          </NavLink>
          <NavLink
            to="/budgets"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            Budgets
          </NavLink>
          <NavLink
            to="/accounts"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            Accounts
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#9CA3AF' }}>
            {user?.email}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
