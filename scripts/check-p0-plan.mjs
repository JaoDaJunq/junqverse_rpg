import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('execucao/manifest.json', 'utf8'));
const requiredIds = Array.from({ length: 17 }, (_, index) =>
  `T${String(index + 1).padStart(3, '0')}`
);
const byId = new Map(manifest.tasks.map((task) => [task.id, task]));

const failures = [];

for (const id of requiredIds) {
  if (!byId.has(id)) {
    failures.push(`manifest missing ${id}`);
  }

  const ticketPath = `execucao/tarefas/${id}.md`;
  if (!existsSync(ticketPath)) {
    failures.push(`missing ticket ${ticketPath}`);
  }
}

for (const id of requiredIds) {
  const task = byId.get(id);
  if (!task) continue;

  for (const dependency of task.deps ?? []) {
    if (!byId.has(dependency)) {
      failures.push(`${id} depends on missing task ${dependency}`);
    }
  }

  for (const ref of task.refs ?? []) {
    if (!existsSync(ref)) {
      failures.push(`${id} references missing file ${ref}`);
    }
  }
}

if (failures.length > 0) {
  console.error('P0 planning integrity failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 planning integrity: PASS');
