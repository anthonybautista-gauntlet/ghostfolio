import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfAgentForgePageComponent } from './agentforge-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAgentForgePageComponent,
    path: '',
    title: internalRoutes.agentforge.title
  }
];
