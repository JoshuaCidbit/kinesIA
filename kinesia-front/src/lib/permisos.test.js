import { describe, it, expect } from 'vitest';
import { puedeEliminar } from './permisos';

describe('puedeEliminar', () => {
  const admin = { id: 1, rol: 'admin' };
  const coach = { id: 2, rol: 'coach' };

  it('admin puede eliminar a un paciente', () => {
    expect(puedeEliminar({ actor: admin, target: { id: 10, rol: 'paciente', coachId: null } })).toBe(true);
  });

  it('admin puede eliminar a un coach', () => {
    expect(puedeEliminar({ actor: admin, target: { id: 2, rol: 'coach' } })).toBe(true);
  });

  it('admin no puede eliminar a otro admin', () => {
    expect(puedeEliminar({ actor: admin, target: { id: 3, rol: 'admin' } })).toBe(false);
  });

  it('admin no puede eliminarse a si mismo', () => {
    expect(puedeEliminar({ actor: admin, target: { id: 1, rol: 'admin' } })).toBe(false);
  });

  it('coach puede eliminar a su propio paciente', () => {
    expect(puedeEliminar({ actor: coach, target: { id: 10, rol: 'paciente', coachId: 2 } })).toBe(true);
  });

  it('coach no puede eliminar a otro coach', () => {
    expect(puedeEliminar({ actor: coach, target: { id: 2, rol: 'coach' } })).toBe(false);
  });

  it('coach no puede eliminar a un paciente que no le pertenece', () => {
    expect(puedeEliminar({ actor: coach, target: { id: 11, rol: 'paciente', coachId: 99 } })).toBe(false);
  });

  it('coach no puede eliminar un paciente sin coach asignado', () => {
    expect(puedeEliminar({ actor: coach, target: { id: 11, rol: 'paciente', coachId: null } })).toBe(false);
  });

  it('coach no puede eliminarse a si mismo', () => {
    expect(puedeEliminar({ actor: coach, target: { id: 2, rol: 'coach' } })).toBe(false);
  });

  it('paciente y actores sin datos no pueden eliminar', () => {
    expect(puedeEliminar({ actor: { id: 10, rol: 'paciente' }, target: { id: 10, rol: 'paciente' } })).toBe(false);
    expect(puedeEliminar({ actor: null, target: { id: 10, rol: 'paciente' } })).toBe(false);
  });

  it('los ids llegados como string se comparan igual', () => {
    expect(puedeEliminar({ actor: { id: '2', rol: 'coach' }, target: { id: '10', rol: 'paciente', coachId: '2' } })).toBe(true);
  });
});
