import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/AppShell';
import { AmbassadorsPage } from '@/features/ambassadors/AmbassadorsPage';
import { AmbassadorsProvider } from '@/features/ambassadors/AmbassadorsProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { CommunitiesPage } from '@/features/communities/CommunitiesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { VendorsPage } from '@/features/vendors/VendorsPage';
import { setMockFailure } from '@/mocks/store';

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <AmbassadorsProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/external-ambassador/login" element={<LoginPage />} />
            <Route path="/external-ambassador" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="ambassadors" element={<AmbassadorsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="communities" element={<CommunitiesPage />} />
              <Route path="vendors" element={<VendorsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AmbassadorsProvider>
    </AuthProvider>,
  );
}

describe('external ambassador experience', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ id: 11 }), { status: 201 });
        }
        return new Response(
          JSON.stringify([
            {
              id: 1,
              name: 'Leanne Graham',
              username: 'Bret',
              email: 'Sincere@april.biz',
              phone: '1-770-736-8031',
              website: 'hildegard.org',
              address: { city: 'Gwenborough' },
              company: { name: 'Romaguera-Crona' },
            },
          ]),
          { status: 200 },
        );
      }),
    );
  });

  it('shows ambassador and community lists without signing in', async () => {
    const user = userEvent.setup();
    renderAt('/external-ambassador');
    expect(await screen.findByRole('heading', { name: 'Student Ambassadors' })).toBeInTheDocument();
    expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
    expect(screen.getByText('Arrival Circle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login/ Signup' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Login/ Signup' }));
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'ambassador@intoto.example');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'ambassador');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Student Ambassadors' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('link', { name: 'Login/ Signup' })).toBeInTheDocument();
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
  });

  it('keeps the ambassador list visible when communities fail', async () => {
    setMockFailure('communities', true);
    renderAt('/external-ambassador');
    expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
  });

  it('creates an ambassador through the fake API and shows it in the list', async () => {
    const user = userEvent.setup();
    renderAt('/external-ambassador/ambassadors');
    expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add ambassador' }));
    await user.type(screen.getByLabelText('Name'), 'New Ambassador');
    await user.type(screen.getByLabelText('Username'), 'newambassador');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('New Ambassador')).toBeInTheDocument();
    expect(screen.getByText(/created for this browser session/i)).toBeInTheDocument();
  });

  it('shows community records and an empty search', async () => {
    const user = userEvent.setup();
    renderAt('/external-ambassador/login');
    await user.type(screen.getByLabelText('Password'), 'ambassador');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.click(await screen.findByRole('link', { name: 'See More communities' }));
    expect(await screen.findByText('Arrival Circle')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Search communities'), 'zzzz-no-match');
    expect(await screen.findByText('No communities')).toBeInTheDocument();
  });

  it('shows a chat send failure without losing the conversation', async () => {
    const user = userEvent.setup();
    setMockFailure('chat-send', true);
    renderAt('/external-ambassador/chat');
    expect(await screen.findByText('Student support')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Hello there');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Not sent')).toBeInTheDocument();
    expect(screen.getByText('Student support')).toBeInTheDocument();
  });

  it('shows the vendor error state and recovers', async () => {
    const user = userEvent.setup();
    renderAt('/external-ambassador/vendors');
    expect(await screen.findByText('Northline Housing')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simulate API error' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Northline Housing')).toBeInTheDocument();
  });
});
