import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { puedeAcceder, resolverVista, VISTAS_POR_ROL } from '../lib/rutas';
import RutaGuard from './RutaGuard';

describe('RutaGuard (guard de rutas por rol)', () => {
  it('permite el acceso cuando la vista esta en el catalogo del rol', () => {
    expect(puedeAcceder('mi-panel', 'paciente')).toBe(true);
    expect(puedeAcceder('dashboard', 'coach')).toBe(true);
    expect(puedeAcceder('dashboard', 'admin')).toBe(true);
    expect(puedeAcceder('pacientes', 'coach')).toBe(true);
    expect(puedeAcceder('rutinas', 'admin')).toBe(true);
  });

  it('deniega el acceso cuando la vista no esta en el catalogo del rol', () => {
    expect(puedeAcceder('dashboard', 'paciente')).toBe(false);
    expect(puedeAcceder('rutinas', 'paciente')).toBe(false);
    expect(puedeAcceder('mi-panel', 'coach')).toBe(false);
    expect(puedeAcceder('dashboard', 'usuario-inexistente')).toBe(false);
  });

  it('normaliza las vistas de paciente (paciente-12 -> pacientes)', () => {
    expect(puedeAcceder('paciente-12', 'coach')).toBe(true);
    expect(puedeAcceder('paciente-12', 'paciente')).toBe(false);
  });

  it('resuelve la vista por defecto cuando la solicitada no es valida', () => {
    expect(resolverVista('dashboard', 'paciente')).toBe('mi-panel');
    expect(resolverVista('mi-panel', 'coach')).toBe('dashboard');
    expect(resolverVista('dashboard', 'coach')).toBe('dashboard');
    expect(VISTAS_POR_ROL.admin).toContain('dashboard');
  });
});

describe('RutaGuard', () => {
  it('renderiza los hijos cuando el rol puede acceder', () => {
    render(
      <RutaGuard rol="paciente" vista="mi-panel">
        <div>Contenido del panel</div>
      </RutaGuard>
    );
    expect(screen.getByText('Contenido del panel')).toBeInTheDocument();
  });

  it('renderiza el fallback cuando el rol no puede acceder', () => {
    render(
      <RutaGuard rol="paciente" vista="dashboard" fallback={<div>Acceso denegado</div>}>
        <div>Contenido del panel</div>
      </RutaGuard>
    );
    expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument();
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });
});
