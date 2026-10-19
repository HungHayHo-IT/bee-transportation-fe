import type { Department } from '@/types/organisation';

/**
 * Departments this one may sit under. The backend rejects cycles with a 400;
 * this keeps the dropdown from offering a choice that is certain to fail —
 * itself, and anything already below it.
 */
export function parentOptions(all: readonly Department[], id: number): Department[] {
  const banned = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const dept of all) {
      if (banned.has(dept.id)) continue;
      if (dept.parentId !== null && banned.has(dept.parentId)) {
        banned.add(dept.id);
        grew = true;
      }
    }
  }
  return all.filter((dept) => !banned.has(dept.id));
}
