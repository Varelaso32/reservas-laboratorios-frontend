import { Component } from '@angular/core';

interface Espacio {
  nombre: string;
  piso: number;
  capacidad: number;
  estado: 'Disponible' | 'Ocupado' | 'Reservado';
  equipos: string[];
}

@Component({
  selector: 'app-espacios',
  imports: [],
  templateUrl: './espacios.component.html',
  styleUrl: './espacios.component.scss'
})
export class EspaciosComponent {

  espacios: Espacio[] = [
    {
      nombre: 'Lab. Programación I',
      piso: 1,
      capacidad: 30,
      estado: 'Disponible',
      equipos: ['Proyector', 'Pizarra', 'TV']
    },
    {
      nombre: 'Lab. Redes',
      piso: 1,
      capacidad: 25,
      estado: 'Disponible',
      equipos: ['Proyector', 'TV', 'Videoconf.']
    },
    {
      nombre: 'Lab. Bases de Datos',
      piso: 2,
      capacidad: 28,
      estado: 'Disponible',
      equipos: ['Proyector', 'Pizarra']
    },
    {
      nombre: 'Sala de Reuniones A',
      piso: 3,
      capacidad: 12,
      estado: 'Disponible',
      equipos: ['TV', 'Videoconf.', 'Café']
    },
    {
      nombre: 'Sala de Reuniones B',
      piso: 3,
      capacidad: 10,
      estado: 'Ocupado',
      equipos: ['TV', 'Pizarra']
    },
    {
      nombre: 'Lab. Inteligencia Art.',
      piso: 2,
      capacidad: 24,
      estado: 'Disponible',
      equipos: ['Proyector', 'GPU', 'AC']
    },
    {
      nombre: 'Aula Magna',
      piso: 4,
      capacidad: 80,
      estado: 'Ocupado',
      equipos: ['Proyector', 'Micrófono', 'AC']
    },
    {
      nombre: 'Sala de Estudio 1',
      piso: 1,
      capacidad: 8,
      estado: 'Disponible',
      equipos: ['TV', 'Pizarra']
    },
    {
      nombre: 'Lab. Seguridad',
      piso: 3,
      capacidad: 20,
      estado: 'Reservado',
      equipos: ['Proyector', 'Pizarra']
    }
  ];
}