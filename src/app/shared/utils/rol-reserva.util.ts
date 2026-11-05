import { Cargo, RolReserva } from '../../core/models/auth.models';

/**
 * HU-30: cargo institucional -> rol de reserva (jerarquía de menor a mayor).
 * El administrativo reserva como docente y el administrador de salas como
 * coordinador: son los niveles equivalentes.
 */
export const ROL_RESERVA_POR_CARGO: Record<Cargo, RolReserva> = {
  ESTUDIANTE: 'ESTUDIANTE',
  DOCENTE: 'DOCENTE',
  ADMINISTRATIVO: 'DOCENTE',
  COORDINADOR_LABORATORIOS: 'COORDINADOR',
  ADMINISTRADOR_SALA: 'COORDINADOR',
  ADMINISTRADOR_SISTEMA: 'DIRECTOR'
};

/** De menor a mayor jerarquía. */
export const JERARQUIA_RESERVA: RolReserva[] = [
  'ESTUDIANTE',
  'DOCENTE',
  'COORDINADOR',
  'DIRECTOR'
];

export function rolReservaDe(cargo: Cargo | null | undefined): RolReserva {
  if (!cargo) {
    return 'ESTUDIANTE';
  }
  return ROL_RESERVA_POR_CARGO[cargo];
}

/** HU-30: solo Docente, Coordinador o Director pueden pedir el cupo de otro. */
export function puedePedirCupo(cargo: Cargo | null | undefined): boolean {
  return rolReservaDe(cargo) !== 'ESTUDIANTE';
}

export function nombreRolReserva(rol: RolReserva): string {
  const nombres: Record<RolReserva, string> = {
    ESTUDIANTE: 'Estudiante',
    DOCENTE: 'Docente',
    COORDINADOR: 'Coordinador',
    DIRECTOR: 'Director'
  };
  return nombres[rol];
}
