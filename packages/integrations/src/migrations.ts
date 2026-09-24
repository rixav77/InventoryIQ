import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Migration {
  name: string;
  sql: string;
}

const MIGRATION_NAMES: readonly string[] = ['001_initial_schema.sql'];

export function listMigrations(): readonly Migration[] {
  return MIGRATION_NAMES.map((name) => ({
    name,
    sql: readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8'),
  }));
}

export function extractTableNames(sql: string): readonly string[] {
  const names = new Set<string>();
  const pattern = /CREATE TABLE (?:IF NOT EXISTS )?([a-z_][a-z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const name = match[1];
    if (name !== undefined) {
      names.add(name.toLowerCase());
    }
  }
  return [...names].sort();
}
