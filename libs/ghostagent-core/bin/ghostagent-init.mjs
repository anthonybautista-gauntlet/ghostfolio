#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const isDryRun = !shouldApply;

const workspaceRoot = process.cwd();
const envExamplePath = path.join(workspaceRoot, '.env.example');
const prismaSchemaPath = path.join(workspaceRoot, 'prisma', 'schema.prisma');
const migrationOutputPath = path.join(
  workspaceRoot,
  'prisma',
  'migrations',
  'ghostagent_001_chat_session',
  'migration.sql'
);
const feedbackMigrationOutputPath = path.join(
  workspaceRoot,
  'prisma',
  'migrations',
  'ghostagent_002_ai_feedback',
  'migration.sql'
);
const prismaSnippetPath = path.join(
  __dirname,
  '..',
  'prisma',
  'schema.chat-session.prisma'
);
const feedbackPrismaSnippetPath = path.join(
  __dirname,
  '..',
  'prisma',
  'schema.ai-feedback.prisma'
);
const migrationTemplatePath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '001_chat_session',
  'migration.sql'
);
const feedbackMigrationTemplatePath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '002_ai_feedback',
  'migration.sql'
);
const migrationsDir = path.join(workspaceRoot, 'prisma', 'migrations');
const scaffoldRoot = path.join(__dirname, '..', 'scaffolds');

const scaffoldTargets = [
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'ai.module.ts'
    ),
    source: path.join(scaffoldRoot, 'api', 'endpoints', 'ai', 'ai.module.ts')
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'ai.controller.ts'
    ),
    source: path.join(
      scaffoldRoot,
      'api',
      'endpoints',
      'ai',
      'ai.controller.ts'
    )
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'ai.service.ts'
    ),
    source: path.join(scaffoldRoot, 'api', 'endpoints', 'ai', 'ai.service.ts')
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'dtos',
      'ai-chat-request.dto.ts'
    ),
    source: path.join(
      scaffoldRoot,
      'api',
      'endpoints',
      'ai',
      'dtos',
      'ai-chat-request.dto.ts'
    )
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'dtos',
      'create-ai-feedback.dto.ts'
    ),
    source: path.join(
      scaffoldRoot,
      'api',
      'endpoints',
      'ai',
      'dtos',
      'create-ai-feedback.dto.ts'
    )
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'dtos',
      'get-ai-feedback-query.dto.ts'
    ),
    source: path.join(
      scaffoldRoot,
      'api',
      'endpoints',
      'ai',
      'dtos',
      'get-ai-feedback-query.dto.ts'
    )
  },
  {
    destination: path.join(
      workspaceRoot,
      'apps',
      'api',
      'src',
      'app',
      'endpoints',
      'ai',
      'dtos',
      'update-ai-model-preference.dto.ts'
    ),
    source: path.join(
      scaffoldRoot,
      'api',
      'endpoints',
      'ai',
      'dtos',
      'update-ai-model-preference.dto.ts'
    )
  }
];

const requiredEnvLines = [
  'ENABLE_FEATURE_AGENTFORGE=true',
  'OPENROUTER_API_KEY=',
  'OPENROUTER_MODEL=anthropic/claude-sonnet-4.5',
  'AI_MODEL_CATALOG=',
  'LANGSMITH_TRACING=false',
  'LANGSMITH_API_KEY=',
  'LANGSMITH_PROJECT=ghostfolio-ghost-agent',
  'LANGSMITH_ENDPOINT=https://api.smith.langchain.com',
  'LANGSMITH_WORKSPACE_ID='
];

function logHeader() {
  console.log(
    JSON.stringify(
      {
        apply: shouldApply,
        command: 'ghostagent init',
        mode: isDryRun ? 'dry-run' : 'apply'
      },
      null,
      2
    )
  );
}

function buildEnvPatch({ content }) {
  const missing = requiredEnvLines.filter((line) => !content.includes(line));

  if (missing.length === 0) {
    return { changed: false, nextContent: content };
  }

  const prefix = content.endsWith('\n') ? '' : '\n';
  const nextContent =
    content +
    `${prefix}\n# GhostAgent runtime\n${missing.map((line) => `${line}\n`).join('')}`;

  return { changed: true, nextContent };
}

function injectUserRelation({ schemaContent }) {
  const userModelPattern = /model User \{[\s\S]*?\n\}/m;
  const userModelMatch = userModelPattern.exec(schemaContent);

  if (!userModelMatch) {
    throw new Error('Could not locate `model User` in prisma/schema.prisma');
  }

  const userModelBlock = userModelMatch[0];
  let insertion = '';
  if (!schemaContent.includes('chatSessions  ChatSession[]')) {
    insertion += '  chatSessions  ChatSession[]\n';
  }
  if (!schemaContent.includes('aiFeedback    AiFeedback[]')) {
    insertion += '  aiFeedback    AiFeedback[]\n';
  }

  if (!insertion) {
    return { changed: false, nextContent: schemaContent };
  }

  const updatedUserModelBlock = userModelBlock.replace(
    /\n\}$/,
    `\n${insertion}}`
  );
  const nextContent = schemaContent.replace(
    userModelBlock,
    updatedUserModelBlock
  );

  return { changed: true, nextContent };
}

function injectChatSessionModel({ schemaContent, chatSessionSnippet }) {
  if (schemaContent.includes('model ChatSession {')) {
    return { changed: false, nextContent: schemaContent };
  }

  const prefix = schemaContent.endsWith('\n') ? '' : '\n';
  const nextContent = `${schemaContent}${prefix}\n${chatSessionSnippet}\n`;

  return { changed: true, nextContent };
}

function injectAiFeedbackModel({ feedbackSnippet, schemaContent }) {
  if (schemaContent.includes('model AiFeedback {')) {
    return { changed: false, nextContent: schemaContent };
  }

  const prefix = schemaContent.endsWith('\n') ? '' : '\n';
  const nextContent = `${schemaContent}${prefix}\n${feedbackSnippet}\n`;

  return { changed: true, nextContent };
}

async function hasExistingMigration({ migrationOutputSqlPath, tableName }) {
  if (!existsSync(migrationsDir)) {
    return false;
  }

  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationSqlPaths = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, 'migration.sql'))
    .filter((sqlPath) => existsSync(sqlPath));

  for (const sqlPath of migrationSqlPaths) {
    if (sqlPath === migrationOutputSqlPath) {
      continue;
    }

    const sql = await readFile(sqlPath, 'utf8');
    if (sql.includes(`CREATE TABLE "${tableName}"`)) {
      return true;
    }
  }

  return false;
}

async function computeScaffoldActions() {
  return Promise.all(
    scaffoldTargets.map(async ({ destination, source }) => {
      const exists = existsSync(destination);
      const sourceContent = await readFile(source, 'utf8');
      return {
        create: !exists,
        destination,
        sourceContent
      };
    })
  );
}

function ensureLineImport({ content, importLine }) {
  if (content.includes(importLine)) {
    return { changed: false, nextContent: content };
  }

  const lines = content.split('\n');
  const lastImportIndex = lines.reduce((lastIndex, line, index) => {
    return line.startsWith('import ') ? index : lastIndex;
  }, -1);

  if (lastImportIndex === -1) {
    return {
      changed: true,
      nextContent: `${importLine}\n${content}`
    };
  }

  lines.splice(lastImportIndex + 1, 0, importLine);
  return { changed: true, nextContent: lines.join('\n') };
}

function ensureAiModuleInAppModule({ content }) {
  const importPatch = ensureLineImport({
    content,
    importLine: "import { AiModule } from './endpoints/ai/ai.module';"
  });
  let nextContent = importPatch.nextContent;
  let changed = importPatch.changed;

  if (nextContent.includes('AiModule,')) {
    return { changed, nextContent };
  }

  const importsArrayMatch = /imports:\s*\[/.exec(nextContent);
  if (!importsArrayMatch) {
    return { changed, nextContent };
  }

  const insertIndex = importsArrayMatch.index + importsArrayMatch[0].length;
  nextContent =
    nextContent.slice(0, insertIndex) +
    '\n    AiModule,' +
    nextContent.slice(insertIndex);
  changed = true;

  return { changed, nextContent };
}

function ensureGhostAgentRoutes({ content }) {
  let nextContent = content;
  let changed = false;

  if (!nextContent.includes("path: 'agentforge'")) {
    const routesArrayMatch = /export const routes:\s*Routes\s*=\s*\[/.exec(
      nextContent
    );
    if (routesArrayMatch) {
      const insertIndex = routesArrayMatch.index + routesArrayMatch[0].length;
      const routeBlock = `
  {
    path: 'agentforge',
    redirectTo: internalRoutes.ghostagent.path,
    pathMatch: 'full'
  },
  {
    path: internalRoutes.ghostagent.path,
    loadChildren: () =>
      import('./pages/agentforge/agentforge-page.routes').then((m) => m.routes)
  },`;
      nextContent =
        nextContent.slice(0, insertIndex) +
        routeBlock +
        nextContent.slice(insertIndex);
      changed = true;
    }
  }

  return { changed, nextContent };
}

function ensureDataServiceGhostAgentMethods({ content }) {
  const hasSessionMethod = content.includes(
    'public getAiChatSession({ sessionId }'
  );
  const hasFeedbackMethod = content.includes(
    'public getAiSessionFeedback({ sessionId }'
  );

  if (hasSessionMethod && hasFeedbackMethod) {
    return { changed: false, nextContent: content };
  }

  const markerStart = '  // GHOSTAGENT_SCAFFOLD_START';
  const markerEnd = '  // GHOSTAGENT_SCAFFOLD_END';
  if (content.includes(markerStart)) {
    return { changed: false, nextContent: content };
  }

  const insertionPoint = content.indexOf('  public fetchAiAdminFeedback({');
  if (insertionPoint === -1) {
    return { changed: false, nextContent: content };
  }

  const methodBlock = `

  // GHOSTAGENT_SCAFFOLD_START
  public getAiChatSession({ sessionId }: { sessionId?: string } = {}) {
    let params = new HttpParams();

    if (sessionId) {
      params = params.append('sessionId', sessionId);
    }

    return this.http.get<AiChatSessionResponse>('/api/v1/ai/chat/session', {
      params
    });
  }

  public getAiSessionFeedback({ sessionId }: { sessionId: string }) {
    const params = new HttpParams().append('sessionId', sessionId);

    return this.http.get<{
      feedback: {
        assistantReply: string;
        comment?: string;
        id: string;
        query: string;
        rating: 'down' | 'up';
      }[];
    }>('/api/v1/ai/feedback/session', { params });
  }
  // GHOSTAGENT_SCAFFOLD_END
`;

  return {
    changed: true,
    nextContent:
      content.slice(0, insertionPoint) +
      methodBlock +
      content.slice(insertionPoint)
  };
}

function verifyRuntimeIntegration({
  aiControllerContent,
  appModuleContent,
  appRoutesContent,
  dataServiceContent
}) {
  const missing = [];

  if (
    aiControllerContent &&
    !aiControllerContent.includes("@Get('feedback/session')")
  ) {
    missing.push('AiController missing GET /ai/feedback/session endpoint');
  }

  if (
    aiControllerContent &&
    !aiControllerContent.includes("@Query('sessionId') sessionId?: string")
  ) {
    missing.push(
      'AiController missing optional sessionId restore query support'
    );
  }

  if (
    dataServiceContent &&
    !dataServiceContent.includes('getAiSessionFeedback')
  ) {
    missing.push('DataService missing getAiSessionFeedback() client method');
  }

  if (
    dataServiceContent &&
    !dataServiceContent.includes('getAiChatSession({ sessionId }')
  ) {
    missing.push(
      'DataService missing parameterized getAiChatSession({ sessionId }) support'
    );
  }

  if (appModuleContent && !appModuleContent.includes('AiModule')) {
    missing.push('AppModule missing AiModule import/registration');
  }

  if (
    appRoutesContent &&
    (!appRoutesContent.includes("path: 'agentforge'") ||
      !appRoutesContent.includes('internalRoutes.ghostagent.path'))
  ) {
    missing.push('App routes missing ghostagent route registration');
  }

  return missing;
}

async function main() {
  logHeader();

  if (!existsSync(envExamplePath)) {
    throw new Error(`Missing ${envExamplePath}`);
  }

  if (!existsSync(prismaSchemaPath)) {
    throw new Error(`Missing ${prismaSchemaPath}`);
  }

  const envExampleContent = await readFile(envExamplePath, 'utf8');
  const prismaSchemaContent = await readFile(prismaSchemaPath, 'utf8');
  const chatSessionSnippet = await readFile(prismaSnippetPath, 'utf8');
  const feedbackSnippet = await readFile(feedbackPrismaSnippetPath, 'utf8');
  const migrationTemplate = await readFile(migrationTemplatePath, 'utf8');
  const feedbackMigrationTemplate = await readFile(
    feedbackMigrationTemplatePath,
    'utf8'
  );

  const envPatch = buildEnvPatch({ content: envExampleContent });
  let updatedSchema = prismaSchemaContent;
  const relationPatch = injectUserRelation({ schemaContent: updatedSchema });
  updatedSchema = relationPatch.nextContent;
  const modelPatch = injectChatSessionModel({
    chatSessionSnippet,
    schemaContent: updatedSchema
  });
  updatedSchema = modelPatch.nextContent;
  const feedbackModelPatch = injectAiFeedbackModel({
    feedbackSnippet,
    schemaContent: updatedSchema
  });
  updatedSchema = feedbackModelPatch.nextContent;
  const migrationExists = existsSync(migrationOutputPath);
  const feedbackMigrationExists = existsSync(feedbackMigrationOutputPath);
  const chatSessionMigrationExists = await hasExistingMigration({
    migrationOutputSqlPath: migrationOutputPath,
    tableName: 'ChatSession'
  });
  const aiFeedbackMigrationExists = await hasExistingMigration({
    migrationOutputSqlPath: feedbackMigrationOutputPath,
    tableName: 'AiFeedback'
  });
  const shouldCreateMigration = !migrationExists && !chatSessionMigrationExists;
  const shouldCreateFeedbackMigration =
    !feedbackMigrationExists && !aiFeedbackMigrationExists;
  const scaffoldActions = await computeScaffoldActions();

  const aiControllerPath = path.join(
    workspaceRoot,
    'apps',
    'api',
    'src',
    'app',
    'endpoints',
    'ai',
    'ai.controller.ts'
  );
  const dataServicePath = path.join(
    workspaceRoot,
    'libs',
    'ui',
    'src',
    'lib',
    'services',
    'data.service.ts'
  );
  const aiControllerContent = existsSync(aiControllerPath)
    ? await readFile(aiControllerPath, 'utf8')
    : undefined;
  const dataServiceContent = existsSync(dataServicePath)
    ? await readFile(dataServicePath, 'utf8')
    : undefined;
  const appModulePath = path.join(
    workspaceRoot,
    'apps',
    'api',
    'src',
    'app',
    'app.module.ts'
  );
  const appRoutesPath = path.join(
    workspaceRoot,
    'apps',
    'client',
    'src',
    'app',
    'app.routes.ts'
  );
  const appModuleContent = existsSync(appModulePath)
    ? await readFile(appModulePath, 'utf8')
    : undefined;
  const appRoutesContent = existsSync(appRoutesPath)
    ? await readFile(appRoutesPath, 'utf8')
    : undefined;
  const appModulePatch = appModuleContent
    ? ensureAiModuleInAppModule({ content: appModuleContent })
    : { changed: false, nextContent: appModuleContent };
  const appRoutesPatch = appRoutesContent
    ? ensureGhostAgentRoutes({ content: appRoutesContent })
    : { changed: false, nextContent: appRoutesContent };
  const dataServicePatch = dataServiceContent
    ? ensureDataServiceGhostAgentMethods({ content: dataServiceContent })
    : { changed: false, nextContent: dataServiceContent };
  const missingRuntimeIntegration = verifyRuntimeIntegration({
    aiControllerContent,
    appModuleContent: appModulePatch.nextContent,
    appRoutesContent: appRoutesPatch.nextContent,
    dataServiceContent: dataServicePatch.nextContent
  });

  const summary = {
    actions: {
      createMigration: shouldCreateMigration,
      createFeedbackMigration: shouldCreateFeedbackMigration,
      createScaffoldFiles: scaffoldActions.filter((action) => action.create)
        .length,
      patchAppModule: appModulePatch.changed,
      patchAppRoutes: appRoutesPatch.changed,
      patchDataService: dataServicePatch.changed,
      updateEnvExample: envPatch.changed,
      updatePrismaSchema:
        relationPatch.changed ||
        modelPatch.changed ||
        feedbackModelPatch.changed
    },
    files: {
      envExamplePath,
      feedbackMigrationOutputPath,
      migrationOutputPath,
      prismaSchemaPath
    },
    runtimeChecks: {
      missingIntegration: missingRuntimeIntegration
    },
    scaffoldTargets: scaffoldActions.map(({ create, destination }) => ({
      create,
      destination
    })),
    mode: isDryRun ? 'dry-run' : 'apply'
  };

  console.log(JSON.stringify(summary, null, 2));

  if (isDryRun) {
    console.log('\nRun with --apply to write changes.');
    return;
  }

  if (envPatch.changed) {
    await writeFile(envExamplePath, envPatch.nextContent, 'utf8');
  }

  if (
    relationPatch.changed ||
    modelPatch.changed ||
    feedbackModelPatch.changed
  ) {
    await writeFile(prismaSchemaPath, updatedSchema, 'utf8');
  }

  if (shouldCreateMigration) {
    await mkdir(path.dirname(migrationOutputPath), { recursive: true });
    await writeFile(migrationOutputPath, migrationTemplate, 'utf8');
  }

  if (shouldCreateFeedbackMigration) {
    await mkdir(path.dirname(feedbackMigrationOutputPath), { recursive: true });
    await writeFile(
      feedbackMigrationOutputPath,
      feedbackMigrationTemplate,
      'utf8'
    );
  }

  for (const scaffoldAction of scaffoldActions) {
    if (!scaffoldAction.create) {
      continue;
    }

    await mkdir(path.dirname(scaffoldAction.destination), { recursive: true });
    await writeFile(
      scaffoldAction.destination,
      scaffoldAction.sourceContent,
      'utf8'
    );
  }

  if (appModulePatch.changed) {
    await writeFile(appModulePath, appModulePatch.nextContent, 'utf8');
  }

  if (appRoutesPatch.changed) {
    await writeFile(appRoutesPath, appRoutesPatch.nextContent, 'utf8');
  }

  if (dataServicePatch.changed) {
    await writeFile(dataServicePath, dataServicePatch.nextContent, 'utf8');
  }

  console.log('\nGhostAgent init complete.');
  console.log('Next steps:');
  console.log('1) npm run database:migrate');
  console.log('2) npm run start:server');
  console.log(
    '3) Verify /api/v1/ai/chat/session, /api/v1/ai/model, and /api/v1/ai/feedback'
  );
  if (missingRuntimeIntegration.length > 0) {
    console.log('\nAdditional integration checks:');
    for (const missingItem of missingRuntimeIntegration) {
      console.log(`- ${missingItem}`);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
