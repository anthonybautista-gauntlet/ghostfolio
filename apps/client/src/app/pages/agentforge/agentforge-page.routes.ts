import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import { Routes } from '@angular/router';
import {
  GHOSTAGENT_API_CLIENT,
  GfGhostAgentChatComponent
} from '@ghost_agent/ui';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfGhostAgentChatComponent,
    path: '',
    providers: [{ provide: GHOSTAGENT_API_CLIENT, useExisting: DataService }],
    title: internalRoutes.ghostagent.title
  }
];
