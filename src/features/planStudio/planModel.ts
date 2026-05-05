export interface PlanNodeSummary {
  nodeType: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  actualRows: number;
  actualTotalTime: number;
  actualLoops: number;
  children: PlanNodeSummary[];
  relationName?: string;
  indexName?: string;
  filter?: string;
  functionName?: string;
  cteName?: string;
  subplanName?: string;
  parallelAware?: boolean;
  rowsRemovedByFilter?: number;
}

export interface NormalizedExplainPlan {
  root: PlanNodeSummary;
  totalNodes: number;
}

export interface PlanHotspot {
  nodeType: string;
  cost: number;
  costSharePercent: number;
  actualTimeMs: number;
  reason: string;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toSummaryNode(rawNode: any): PlanNodeSummary {
  const childrenRaw = Array.isArray(rawNode?.Plans) ? rawNode.Plans : [];
  return {
    nodeType: String(rawNode?.['Node Type'] ?? 'Unknown'),
    startupCost: asNumber(rawNode?.['Startup Cost']),
    totalCost: asNumber(rawNode?.['Total Cost']),
    planRows: asNumber(rawNode?.['Plan Rows']),
    actualRows: asNumber(rawNode?.['Actual Rows']),
    actualTotalTime: asNumber(rawNode?.['Actual Total Time']),
    actualLoops: asNumber(rawNode?.['Actual Loops']),
    relationName: typeof rawNode?.['Relation Name'] === 'string' ? rawNode['Relation Name'] : undefined,
    indexName: typeof rawNode?.['Index Name'] === 'string' ? rawNode['Index Name'] : undefined,
    filter: typeof rawNode?.Filter === 'string' ? rawNode.Filter : undefined,
    functionName: typeof rawNode?.['Function Name'] === 'string' ? rawNode['Function Name'] : undefined,
    cteName: typeof rawNode?.['CTE Name'] === 'string' ? rawNode['CTE Name'] : undefined,
    subplanName: typeof rawNode?.['Subplan Name'] === 'string' ? rawNode['Subplan Name'] : undefined,
    parallelAware: typeof rawNode?.['Parallel Aware'] === 'boolean' ? rawNode['Parallel Aware'] : undefined,
    rowsRemovedByFilter: typeof rawNode?.['Rows Removed by Filter'] === 'number'
      ? rawNode['Rows Removed by Filter']
      : undefined,
    children: childrenRaw.map((child: any) => toSummaryNode(child)),
  };
}

function parsePayload(rawPayload: unknown): any | null {
  if (!rawPayload) {
    return null;
  }
  const parsed = typeof rawPayload === 'string'
    ? (() => {
      try {
        return JSON.parse(rawPayload);
      } catch {
        return null;
      }
    })()
    : rawPayload;
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const wrapped = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!wrapped || typeof wrapped !== 'object') {
    return null;
  }
  const root = wrapped?.Plan ?? wrapped;
  if (!root || typeof root !== 'object') {
    return null;
  }
  if (!('Node Type' in root) && !Array.isArray(root?.Plans)) {
    return null;
  }
  return root;
}

function countNodes(node: PlanNodeSummary): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

function flatten(node: PlanNodeSummary, out: PlanNodeSummary[]): void {
  out.push(node);
  for (const child of node.children) {
    flatten(child, out);
  }
}

export function normalizeExplainPlan(rawPayload: unknown): NormalizedExplainPlan | null {
  const parsedRoot = parsePayload(rawPayload);
  if (!parsedRoot) {
    return null;
  }
  const root = toSummaryNode(parsedRoot);
  return {
    root,
    totalNodes: countNodes(root),
  };
}

export function computePlanHotspots(plan: NormalizedExplainPlan, maxItems = 5): PlanHotspot[] {
  const nodes: PlanNodeSummary[] = [];
  flatten(plan.root, nodes);
  const totalCost = Math.max(plan.root.totalCost, 1);
  return nodes
    .map((node) => {
      const reason = node.nodeType.includes('Seq Scan')
        ? 'Sequential scan likely dominates I/O'
        : node.actualTotalTime > 0
          ? 'High observed execution time'
          : 'High estimated planner cost';
      return {
        nodeType: node.nodeType,
        cost: node.totalCost,
        costSharePercent: (node.totalCost / totalCost) * 100,
        actualTimeMs: node.actualTotalTime,
        reason,
      };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, maxItems);
}
