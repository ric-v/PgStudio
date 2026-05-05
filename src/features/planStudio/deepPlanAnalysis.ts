import { normalizeExplainPlan, PlanNodeSummary } from './planModel';

const CRITICAL_PERCENT = 40;
const HIGH_PERCENT = 25;
const MEDIUM_PERCENT = 15;
const SKEW_SEVERE_RATIO = 10;
const SKEW_HIGH_RATIO = 4;
const SKEW_MEDIUM_RATIO = 2;
const EXPENSIVE_NODE_TIME_MS = 1000;

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SqlShape {
  cteNames: string[];
  fromFunctionNames: string[];
}

export interface FunctionFinding {
  functionName: string;
  nodeType: string;
  path: string;
  cumulativeTimeMs: number;
  cumulativeCost: number;
  loops: number;
  estimatedRows: number;
  actualRows: number;
  severity: FindingSeverity;
  reason: string;
}

export interface CteFinding {
  cteName: string;
  scans: number;
  cumulativeTimeMs: number;
  cumulativeCost: number;
  rowsRead: number;
  severity: FindingSeverity;
  reason: string;
}

export interface SubqueryFinding {
  nodeType: string;
  path: string;
  subplanName?: string;
  timeMs: number;
  cost: number;
  severity: FindingSeverity;
  reason: string;
}

export interface EstimateSkewFinding {
  nodeType: string;
  path: string;
  planRows: number;
  actualRows: number;
  skewRatio: number;
  severity: FindingSeverity;
  reason: string;
}

export interface DeepPlanAnalysis {
  sqlShape: SqlShape;
  functions: FunctionFinding[];
  ctes: CteFinding[];
  subqueries: SubqueryFinding[];
  estimateSkew: EstimateSkewFinding[];
  recommendations: string[];
}

interface TraversalContext {
  path: string;
  totalCost: number;
  totalExecutionTime: number;
}

function severityFromPercent(percent: number): FindingSeverity {
  if (percent >= CRITICAL_PERCENT) {
    return 'critical';
  }
  if (percent >= HIGH_PERCENT) {
    return 'high';
  }
  if (percent >= MEDIUM_PERCENT) {
    return 'medium';
  }
  return 'low';
}

function severityFromSkew(skewRatio: number): FindingSeverity {
  if (skewRatio >= SKEW_SEVERE_RATIO) {
    return 'critical';
  }
  if (skewRatio >= SKEW_HIGH_RATIO) {
    return 'high';
  }
  if (skewRatio >= SKEW_MEDIUM_RATIO) {
    return 'medium';
  }
  return 'low';
}

function toPercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (part / total) * 100;
}

function extractSqlShape(query: string): SqlShape {
  const cteNames: string[] = [];
  const fromFunctionNames: string[] = [];
  const withMatch = query.match(/\bwith\b([\s\S]+?)\bselect\b/i);
  if (withMatch?.[1]) {
    const cteRegex = /([a-zA-Z_][\w$]*)\s+as\s*\(/gi;
    let cteMatch: RegExpExecArray | null;
    while ((cteMatch = cteRegex.exec(withMatch[1])) !== null) {
      cteNames.push(cteMatch[1]);
    }
  }
  const fromJoinFunctionRegex = /\b(?:from|join)\s+([a-zA-Z_][\w$]*(?:\.[a-zA-Z_][\w$]*)?)\s*\(/gi;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = fromJoinFunctionRegex.exec(query)) !== null) {
    fromFunctionNames.push(fnMatch[1]);
  }
  return {
    cteNames: [...new Set(cteNames)],
    fromFunctionNames: [...new Set(fromFunctionNames)],
  };
}

function walkPlan(
  node: PlanNodeSummary,
  context: TraversalContext,
  out: {
    functions: FunctionFinding[];
    ctes: Map<string, CteFinding>;
    subqueries: SubqueryFinding[];
    estimateSkew: EstimateSkewFinding[];
  },
): void {
  const nodePath = `${context.path}/${node.nodeType}`;
  const costPercent = toPercent(node.totalCost, context.totalCost);
  const timePercent = toPercent(node.actualTotalTime, context.totalExecutionTime);
  const dominantPercent = Math.max(costPercent, timePercent);

  if (node.nodeType.includes('Function Scan') || node.functionName) {
    const functionName = node.functionName || 'unknown_function';
    const severity = severityFromPercent(dominantPercent);
    out.functions.push({
      functionName,
      nodeType: node.nodeType,
      path: nodePath,
      cumulativeTimeMs: node.actualTotalTime,
      cumulativeCost: node.totalCost,
      loops: node.actualLoops,
      estimatedRows: node.planRows,
      actualRows: node.actualRows,
      severity,
      reason: `${functionName} contributes ${dominantPercent.toFixed(1)}% of dominant plan weight`,
    });
  }

  if (node.nodeType.includes('CTE Scan') || node.cteName) {
    const cteName = node.cteName || 'unnamed_cte';
    const existing = out.ctes.get(cteName) ?? {
      cteName,
      scans: 0,
      cumulativeTimeMs: 0,
      cumulativeCost: 0,
      rowsRead: 0,
      severity: 'low' as FindingSeverity,
      reason: '',
    };
    existing.scans += 1;
    existing.cumulativeTimeMs += node.actualTotalTime;
    existing.cumulativeCost += node.totalCost;
    existing.rowsRead += node.actualRows;
    const ctePercent = Math.max(
      toPercent(existing.cumulativeCost, context.totalCost),
      toPercent(existing.cumulativeTimeMs, context.totalExecutionTime),
    );
    existing.severity = severityFromPercent(ctePercent);
    existing.reason = `${cteName} scanned ${existing.scans} time(s), ${ctePercent.toFixed(1)}% dominant contribution`;
    out.ctes.set(cteName, existing);
  }

  if (
    node.nodeType.includes('Subquery Scan') ||
    node.nodeType.includes('InitPlan') ||
    node.subplanName ||
    node.nodeType.includes('SubPlan')
  ) {
    const severity = severityFromPercent(dominantPercent);
    out.subqueries.push({
      nodeType: node.nodeType,
      path: nodePath,
      subplanName: node.subplanName,
      timeMs: node.actualTotalTime,
      cost: node.totalCost,
      severity,
      reason: `${node.nodeType} contributes ${dominantPercent.toFixed(1)}% of dominant plan weight`,
    });
  }

  if (node.planRows > 0 && node.actualRows > 0) {
    const skewRatio = Math.max(node.actualRows / node.planRows, node.planRows / node.actualRows);
    if (skewRatio >= SKEW_MEDIUM_RATIO) {
      const severity = severityFromSkew(skewRatio);
      out.estimateSkew.push({
        nodeType: node.nodeType,
        path: nodePath,
        planRows: node.planRows,
        actualRows: node.actualRows,
        skewRatio,
        severity,
        reason: `Planner skew ${skewRatio.toFixed(1)}x between estimated and actual rows`,
      });
    }
  }

  for (const child of node.children) {
    walkPlan(child, { ...context, path: nodePath }, out);
  }
}

function buildRecommendations(analysis: Omit<DeepPlanAnalysis, 'recommendations'>): string[] {
  const recommendations: string[] = [];
  const severeFunction = analysis.functions.find((f) => f.severity === 'critical' || f.severity === 'high');
  if (severeFunction) {
    recommendations.push(
      `Function scan hotspot on ${severeFunction.functionName}. Inspect function logic and ensure predicates push down before invocation.`,
    );
  }
  const expensiveCte = analysis.ctes.find((c) => c.scans > 1 || c.severity === 'critical');
  if (expensiveCte) {
    recommendations.push(
      `CTE ${expensiveCte.cteName} is reused ${expensiveCte.scans} times. Consider inline rewrite or reducing CTE output width/rows.`,
    );
  }
  const severeSkew = analysis.estimateSkew.find((s) => s.severity === 'critical');
  if (severeSkew) {
    recommendations.push(
      `Severe estimate skew (${severeSkew.skewRatio.toFixed(1)}x) in ${severeSkew.nodeType}. Run ANALYZE and review predicate selectivity/index coverage.`,
    );
  }
  const slowSubquery = analysis.subqueries.find((s) => s.timeMs >= EXPENSIVE_NODE_TIME_MS);
  if (slowSubquery) {
    recommendations.push(
      `Expensive ${slowSubquery.nodeType} detected (${slowSubquery.timeMs.toFixed(1)}ms). Evaluate join rewrite or pre-aggregation.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('No deep function/CTE/subquery anti-patterns detected in current plan.');
  }
  return recommendations;
}

export function analyzeDeepPlan(rawPlan: unknown, query = ''): DeepPlanAnalysis | null {
  const normalized = normalizeExplainPlan(rawPlan);
  if (!normalized) {
    return null;
  }
  const totalCost = Math.max(normalized.root.totalCost, 1);
  const totalExecutionTime = Math.max(normalized.root.actualTotalTime, 1);
  const cteMap = new Map<string, CteFinding>();
  const partial = {
    sqlShape: extractSqlShape(query),
    functions: [] as FunctionFinding[],
    ctes: [] as CteFinding[],
    subqueries: [] as SubqueryFinding[],
    estimateSkew: [] as EstimateSkewFinding[],
  };
  walkPlan(
    normalized.root,
    { path: 'root', totalCost, totalExecutionTime },
    {
      functions: partial.functions,
      ctes: cteMap,
      subqueries: partial.subqueries,
      estimateSkew: partial.estimateSkew,
    },
  );
  partial.ctes = Array.from(cteMap.values()).sort((a, b) => b.cumulativeCost - a.cumulativeCost);
  partial.functions.sort((a, b) => b.cumulativeCost - a.cumulativeCost);
  partial.subqueries.sort((a, b) => b.cost - a.cost);
  partial.estimateSkew.sort((a, b) => b.skewRatio - a.skewRatio);
  return {
    ...partial,
    recommendations: buildRecommendations(partial),
  };
}
