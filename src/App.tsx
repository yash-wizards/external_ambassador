import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { getConfig } from '@/config/env';
import { AccountPage } from '@/features/account/AccountPage';
import { AmbassadorDetailPage } from '@/features/ambassadors/AmbassadorDetailPage';
import { AmbassadorsPage } from '@/features/ambassadors/AmbassadorsPage';
import { AmbassadorsProvider } from '@/features/ambassadors/AmbassadorsProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ChatPage } from '@/features/chat/ChatPage';
import { CommunitiesPage, CommunityDetailPage } from '@/features/communities/CommunitiesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { VendorDetailPage, VendorsPage } from '@/features/vendors/VendorsPage';
import { captureEmbedderUrl } from '@/services/embedderUrl';
import { installParentBridge } from '@/services/parentBridge';

export function App() {
  useEffect(() => {
    captureEmbedderUrl();
    return installParentBridge(getConfig().frameAncestors);
  }, []);

  return (
    <AuthProvider>
      <AmbassadorsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/external-ambassador" replace />} />
            <Route path="/external-ambassador/login" element={<LoginPage />} />
            <Route path="/external-ambassador" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="ambassadors" element={<AmbassadorsPage />} />
              <Route path="ambassadors/:ambassadorId" element={<AmbassadorDetailPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="communities" element={<CommunitiesPage />} />
              <Route path="communities/:communityId" element={<CommunityDetailPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="vendors/:vendorId" element={<VendorDetailPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/external-ambassador" replace />} />
          </Routes>
        </BrowserRouter>
      </AmbassadorsProvider>
    </AuthProvider>
  );
}
