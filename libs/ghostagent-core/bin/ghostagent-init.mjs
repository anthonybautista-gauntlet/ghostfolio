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

  const summary = {
    actions: {
      createMigration: shouldCreateMigration,
      createFeedbackMigration: shouldCreateFeedbackMigration,
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

  console.log('\nGhostAgent init complete.');
  console.log('Next steps:');
  console.log('1) npm run database:migrate');
  console.log('2) npm run start:server');
  console.log(
    '3) Verify /api/v1/ai/chat/session, /api/v1/ai/model, and /api/v1/ai/feedback'
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
