import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { api } from '../lib/api';
import Login from './Login';

vi.mock('../lib/api', () => ({ api: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderLogin() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('iniciar sesion con credenciales validas guarda el token', async () => {
    vi.mocked(api).mockResolvedValue({
      token: 'token-valido',
      usuario: { id: 1, nombre: 'Ana', email: 'ana@test.com', rol: 'paciente' },
    });

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Test1234!');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(localStorage.getItem('kinesia_token')).toBe('token-valido'));
    expect(api).toHaveBeenCalledWith('/api/usuarios/login', {
      method: 'POST',
      body: { email: 'ana@test.com', password: 'Test1234!' },
    });
  });

  it('mostrar error cuando las credenciales son invalidas', async () => {
    vi.mocked(api).mockRejectedValue({ status: 401, message: 'Credenciales inválidas' });

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect(localStorage.getItem('kinesia_token')).toBeNull();
  });
});
