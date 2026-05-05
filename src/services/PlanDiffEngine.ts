import { ExplainNode } from '../renderer/components/ExplainVisualizer';

/**
 * Represents a difference between two plan nodes
 */
export interface PlanNodeDiff {
  nodeType: string;
  path: string[]; // Path in tree to reach this node
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  before?: {
    cost: number;
    rows: number;
    actualTime: number;
  };
  after?: {
    cost: number;
    rows: number;
    actualTime: number;
  };
  costDelta?: number;      // New - Old
  timeDelta?: number;      // New - Old
  rowDelta?: number;       // New - Old
  reason?: string;         // What changed and why
}

/**
 * Represents a diff between two complete EXPLAIN plans
 */
export interface PlanDiff {
  planName?: string;
  timestamp: number;
  nodeDiffs: PlanNodeDiff[];
  summary: {
    totalCostDelta: number;
    totalTimeDelta: number;
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    totalNodes: number;
    suggestion?: string;
  };
}

/**
 * Pure diff logic for comparing EXPLAIN plans
 * No side effects, no VS Code dependencies
 */
export class PlanDiffEngine {

  /**
   * Compute diff between two plans
   */
  public static diffPlans(planA: ExplainNode, planB: ExplainNode, planAName = 'Plan A', planBName = 'Plan B'): PlanDiff {
    const nodeDiffs: PlanNodeDiff[] = [];
    
    // Traverse both plans and compare nodes
    this.traverseDiffNodes(planA, planB, [], nodeDiffs);

    // Calculate summary
    const summary = this.computeSummary(nodeDiffs);

    return {
      planName: `${planAName} vs ${planBName}`,
      timestamp: Date.now(),
      nodeDiffs,
      summary
    };
  }

  /**
   * Traverse and diff nodes recursively
   */
  private static traverseDiffNodes(
    nodeA: ExplainNode | null,
    nodeB: ExplainNode | null,
    path: string[],
    diffs: PlanNodeDiff[]
  ): void {
    const typeA = nodeA?.['Node Type'] || '';
    const typeB = nodeB?.['Node Type'] || '';
    const currentPath = path.length > 0 ? path : [typeA || typeB || 'Plan'];

    // Node removed from A to B
    if (nodeA && !nodeB) {
      diffs.push({
        nodeType: typeA,
        path: currentPath,
        changeType: 'removed',
        before: {
          cost: nodeA['Total Cost'] || 0,
          rows: nodeA['Plan Rows'] || 0,
          actualTime: nodeA['Actual Total Time'] || 0
        },
        reason: `Node type "${typeA}" was removed`
      });
      // Traverse children of A
      const childrenA = nodeA.Plans || [];
      for (let i = 0; i < childrenA.length; i++) {
        this.traverseDiffNodes(childrenA[i], null, [...currentPath, `child-${i}`], diffs);
      }
      return;
    }

    // Node added in B
    if (!nodeA && nodeB) {
      diffs.push({
        nodeType: typeB,
        path: currentPath,
        changeType: 'added',
        after: {
          cost: nodeB['Total Cost'] || 0,
          rows: nodeB['Plan Rows'] || 0,
          actualTime: nodeB['Actual Total Time'] || 0
        },
        reason: `Node type "${typeB}" was added`
      });
      // Traverse children of B
      const childrenB = nodeB.Plans || [];
      for (let i = 0; i < childrenB.length; i++) {
        this.traverseDiffNodes(null, childrenB[i], [...currentPath, `child-${i}`], diffs);
      }
      return;
    }

    if (!nodeA || !nodeB) return;

    // Both exist - compare
    const costA = nodeA['Total Cost'] || 0;
    const costB = nodeB['Total Cost'] || 0;
    const rowsA = nodeA['Plan Rows'] || 0;
    const rowsB = nodeB['Plan Rows'] || 0;
    const timeA = nodeA['Actual Total Time'] || 0;
    const timeB = nodeB['Actual Total Time'] || 0;

    const costDelta = costB - costA;
    const timeDelta = timeB - timeA;
    const rowDelta = rowsB - rowsA;

    let changeType: 'modified' | 'unchanged' = 'unchanged';
    const reasons: string[] = [];

    if (costDelta !== 0) {
      changeType = 'modified';
      const costChangePercent = costA > 0 ? (costDelta / costA * 100).toFixed(1) : '0';
      reasons.push(`cost ${costDelta > 0 ? '+' : ''}${costDelta.toFixed(2)} (${costChangePercent}%)`);
    }
    if (timeDelta !== 0) {
      changeType = 'modified';
      const timeChangePercent = timeA > 0 ? (timeDelta / timeA * 100).toFixed(1) : '0';
      reasons.push(`time ${timeDelta > 0 ? '+' : ''}${timeDelta.toFixed(2)}ms (${timeChangePercent}%)`);
    }
    if (rowDelta !== 0) {
      changeType = 'modified';
      const rowChangePercent = rowsA > 0 ? (rowDelta / rowsA * 100).toFixed(1) : '0';
      reasons.push(`rows ${rowDelta > 0 ? '+' : ''}${rowDelta} (${rowChangePercent}%)`);
    }

    if (changeType === 'modified' || costDelta !== 0 || timeDelta !== 0 || rowDelta !== 0) {
      diffs.push({
        nodeType: typeA,
        path: currentPath,
        changeType,
        before: { cost: costA, rows: rowsA, actualTime: timeA },
        after: { cost: costB, rows: rowsB, actualTime: timeB },
        costDelta,
        timeDelta,
        rowDelta,
        reason: reasons.length > 0 ? `Changed: ${reasons.join(', ')}` : undefined
      });
    }

    // Recursively compare children
    const childrenA = nodeA.Plans || [];
    const childrenB = nodeB.Plans || [];
    const maxLen = Math.max(childrenA.length, childrenB.length);

    for (let i = 0; i < maxLen; i++) {
      this.traverseDiffNodes(
        childrenA[i] || null,
        childrenB[i] || null,
        [...currentPath, `child-${i}`],
        diffs
      );
    }
  }

  /**
   * Compute summary statistics
   */
  private static computeSummary(diffs: PlanNodeDiff[]): PlanDiff['summary'] {
    let totalCostDelta = 0;
    let totalTimeDelta = 0;
    let nodesAdded = 0;
    let nodesRemoved = 0;
    let nodesModified = 0;
    let functionNodeChanges = 0;
    let cteNodeChanges = 0;
    let subqueryNodeChanges = 0;

    for (const diff of diffs) {
      if (diff.changeType === 'added') {
        nodesAdded++;
        totalCostDelta += diff.after?.cost || 0;
        totalTimeDelta += diff.after?.actualTime || 0;
      } else if (diff.changeType === 'removed') {
        nodesRemoved++;
        totalCostDelta -= diff.before?.cost || 0;
        totalTimeDelta -= diff.before?.actualTime || 0;
      } else if (diff.changeType === 'modified') {
        nodesModified++;
        totalCostDelta += diff.costDelta || 0;
        totalTimeDelta += diff.timeDelta || 0;
      }
      if (/Function Scan/i.test(diff.nodeType)) {
        functionNodeChanges++;
      }
      if (/CTE Scan/i.test(diff.nodeType)) {
        cteNodeChanges++;
      }
      if (/Subquery Scan|SubPlan|InitPlan/i.test(diff.nodeType)) {
        subqueryNodeChanges++;
      }
    }

    let suggestion: string | undefined;
    if (totalCostDelta > 0) {
      suggestion = `Cost increased by ${totalCostDelta.toFixed(2)}. Review added nodes or modified costs.`;
    } else if (totalCostDelta < 0) {
      suggestion = `Cost improved by ${Math.abs(totalCostDelta).toFixed(2)}. This is a good optimization.`;
    }
    if (totalTimeDelta > 0 && (suggestion?.includes('improved') ?? true)) {
      suggestion = `Performance degraded: ${totalTimeDelta.toFixed(2)}ms slower. Check for new sequential scans or worse estimates.`;
    }
    if (cteNodeChanges > 0) {
      suggestion = `CTE topology changed (${cteNodeChanges} node changes). Validate CTE materialization and repeated scans.`;
    } else if (functionNodeChanges > 0) {
      suggestion = `Function-scan topology changed (${functionNodeChanges} node changes). Re-check set-returning function cost.`;
    } else if (subqueryNodeChanges > 0) {
      suggestion = `Subquery/subplan topology changed (${subqueryNodeChanges} node changes). Check nested plan cardinality and join rewrite opportunities.`;
    }

    return {
      totalCostDelta,
      totalTimeDelta,
      nodesAdded,
      nodesRemoved,
      nodesModified,
      totalNodes: diffs.length,
      suggestion
    };
  }
}
