import type { Routes } from '@angular/router';
import { EspaciosComponent } from './features/espacios/pages/espacios/espacios.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'espacios',
    pathMatch: 'full'
  },
  {
    path: 'espacios',
    component: EspaciosComponent
  }
];