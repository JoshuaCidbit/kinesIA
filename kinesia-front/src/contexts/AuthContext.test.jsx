import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Consumer() {
  const { usuario, login, logout } = useAuth();
  return (
    <>
      <span data-testid="rol">{usuario?.rol ?? 'anon'}</span>
      <button onClick={() => login('ana@test.com', 'Test1234!')} type="button">iniciar</button>
      <button onClick={() => logout()} type="button">salir</button>
    </>
  );
}

function renderAuth() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('guarda el token y el usuario al iniciar sesion', async () => {
    vi.mocked(api).mockResolvedValue({
      token: 'token-valido',
      usuario: { id: 1, nombre: 'Ana', email: 'ana@test.com', rol: 'paciente' },
    });

    renderAuth();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /iniciar/i }));

    expect(await screen.findByTestId('rol')).toHaveTextContent('paciente');
    expect(localStorage.getItem('kinesia_token')).toBe('token-valido');
  });

  it('limpia el token y el usuario al cerrar sesion', async () => {
    localStorage.setItem('kinesia_token', 'token-valido');
    vi.mocked(api).mockResolvedValue({
      id: 1,
      nombre: 'Ana',
      email: 'ana@test.com',
      rol: 'paciente',
    });

    renderAuth();
    const user = userEvent.setup();
    // Espera a restaurar la sesion desde el token (useEffect al montar).
    expect(await screen.findByTestId('rol')).toHaveTextContent('paciente');
    await user.click(screen.getByRole('button', { name: /salir/i }));

    await waitFor(() => expect(screen.getByTestId('rol')).toHaveTextContent('anon'));
    expect(localStorage.getItem('kinesia_token')).toBeNull();
  });
});
