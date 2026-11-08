// Tipos compartidos del dominio (API REST de KinesIA).

export type Rol = 'paciente' | 'coach' | 'admin';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  fotoUrl?: string | null;
  coachId?: number | null;
  coach?: Usuario | null;
  edad?: number | null;
  createdAt?: string;
}

export interface Rutina {
  id: number;
  nombre: string;
  descripcion?: string | null;
  anguloObjetivo?: number | null;
}

export interface Sesion {
  id?: number;
  usuarioId?: number;
  rutinaId?: number;
  fecha?: string;
  repeticiones?: number;
  precisionPromedio?: number | null;
  observaciones?: string | null;
  anguloObjetivo?: number | null;
  Usuario?: Usuario | null;
  Rutina?: Rutina | null;
}

export interface RutinaMasUsada {
  id: number;
  nombre: string;
  usos: number;
}

export interface Estadisticas {
  usuarioId: number;
  totalSesiones: number;
  promedioPrecision: number;
  ultimaSesion?: Sesion | null;
  rutinaMasUsada?: RutinaMasUsada | null;
}

export interface Alimento {
  id: number;
  nombre: string;
  categoria?: string | null;
  codigo?: string;
  calorias: number;
  porciones?: number;
  porcionBase?: number | null;
  unidad?: string | null;
}

export interface AlimentoPlan {
  id: number;
  nombre: string;
  porciones: number;
  porcionBase?: number | null;
  unidad?: string | null;
  calorias: number;
}

export interface ComidaAg {
  comida: number;
  total: number;
  alimentos: AlimentoPlan[];
}

export interface AgResultado {
  id: number;
  usuarioId: number;
  objetivo?: string;
  peso?: number;
  caloriasObjetivo?: number;
  totalDiario?: number;
  rangoPorComida?: [number, number];
  cumpleRestricciones?: boolean;
  mejorDistribucion?: ComidaAg[];
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}
