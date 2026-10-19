import type { DepartmentTreeNode } from '@/types/organisation';
import type { QueueItem } from '@/types/queue';

/** Depth-first, so the flat list keeps the org chart's reading order. */
export function flattenTree(nodes: readonly DepartmentTreeNode[]): DepartmentTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

/**
 * Departments this order can move to. The backend rejects the rest anyway — this
 * only keeps the dialog from offering a choice that is certain to fail:
 * departments already on the order (409), inactive ones (400), and the sales
 * department, which never quotes (400).
 *
 * `departmentId` is the caller's own department, which is always on the order but
 * is not derivable from `DepartmentTreeNode` or `QueueItem` alone.
 */
export function transferTargets(
  nodes: readonly DepartmentTreeNode[],
  item: Pick<QueueItem, 'participatingDeptIds'>,
  departmentId: number,
): DepartmentTreeNode[] {
  const taken = new Set([...item.participatingDeptIds, departmentId]);
  return flattenTree(nodes).filter(
    (node) => node.isActive && node.isSales !== true && !taken.has(node.id),
  );
}
