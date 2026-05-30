import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Candidates } from '@/pages/Candidates';
import { Jobs } from '@/pages/Jobs';
import { Messages } from '@/pages/Messages';
import { Settings } from '@/pages/Settings';
import { Reports } from '@/pages/Reports';
import { Agents } from '@/pages/Agents';
import { WhatsAppAccounts } from '@/pages/WhatsAppAccounts';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/whatsapp" element={<WhatsAppAccounts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
