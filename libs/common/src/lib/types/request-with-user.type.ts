import { UserWithSettings } from '@ghostfolio/common/types';

import type { Request } from 'express';

export type RequestWithUser = Request & { user: UserWithSettings };
