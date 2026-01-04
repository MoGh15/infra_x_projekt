import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { SubmissionDetailsComponent } from './features/submission-details/submission-details.component';
import { PatientFormComponent } from './features/patient-form/patient-form.component';
import { SubmissionSuccessComponent } from './features/submission-success/submission-success.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'admin/submissions/:id', canActivate: [authGuard], component: SubmissionDetailsComponent },
  { path: 'form/success', component: SubmissionSuccessComponent },
  { path: 'form', component: PatientFormComponent },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
