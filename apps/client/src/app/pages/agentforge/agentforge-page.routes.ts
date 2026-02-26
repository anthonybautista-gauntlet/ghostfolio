import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfGhostAgentChatComponent } from '@ghostfolio/ghostagent-ui/index';

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfGhostAgentChatComponent,
    path: '',
    title: internalRoutes.ghostagent.title
  }
];
