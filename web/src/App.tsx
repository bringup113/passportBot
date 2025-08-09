import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, theme, Grid, Button } from 'antd';
import type { ReactElement } from 'react';
import { DashboardOutlined, TeamOutlined, IdcardOutlined, AlertOutlined, UserOutlined, BellOutlined, FileProtectOutlined } from '@ant-design/icons';
import './App.css';
import LoginPage from './pages/LoginPage';
import ClientList from './pages/clients/ClientList';
import PassportList from './pages/passports/PassportList';
import OverduePage from './pages/overdue/OverduePage';
import UserList from './pages/users/UserList';
import NotifySettingPage from './pages/notify/NotifySettingPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import DashboardPage from './pages/dashboard/DashboardPage';

const { Header, Content, Sider } = Layout;

function RequireAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppLayout() {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();

  const pathSeg = location.pathname.split('/')[1];
  const selectedKey = pathSeg || 'dashboard';
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{ position: 'sticky', top: 0, height: '100vh' }}
        breakpoint="lg"
        collapsedWidth={56}
        collapsible
      >
        <div style={{ color: '#fff', padding: 16, fontWeight: 700, letterSpacing: 0.3 }}>Visa Admin</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
            { key: 'clients', icon: <TeamOutlined />, label: '客户管理' },
            { key: 'passports', icon: <IdcardOutlined />, label: '护照管理' },
            { key: 'overdue', icon: <AlertOutlined />, label: '逾期管理' },
            { key: 'users', icon: <UserOutlined />, label: '用户管理' },
            { key: 'notify', icon: <BellOutlined />, label: '通知设置' },
            { key: 'audit', icon: <FileProtectOutlined />, label: '操作日志' },
          ]}
          onClick={({ key }) => {
            navigate(key === 'dashboard' ? '/' : `/${key}`);
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: colorBgContainer, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>护照签证管理系统</div>
          <Button type="link" danger onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>退出登录</Button>
        </Header>
        <Content style={{ margin: screens.lg ? 16 : 8 }}>
          <div className="page-container">
            <div className="page-card">
              <Outlet />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="passports" element={<PassportList />} />
        <Route path="overdue" element={<OverduePage />} />
        <Route path="users" element={<UserList />} />
        <Route path="notify" element={<NotifySettingPage />} />
        <Route path="audit" element={<AuditLogPage />} />
      </Route>
    </Routes>
  );
}
