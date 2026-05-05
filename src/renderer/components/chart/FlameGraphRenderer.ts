import { Chart } from 'chart.js';
import { ensureChartJsRegistered } from './chartJsRegister';
import { ExplainNode, HotspotMetrics } from '../ExplainVisualizer';

/**
 * Critical path node in flame graph
 */
export interface FlamePathNode {
  name: string;
  cost: number;
  costPercent: number;
  actualTime: number;
  timePercent: number;
  rows: number;
  loops: number;
  isHotspot: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  depth: number;
}

/**
 * Flame graph rendering options
 */
export interface FlameGraphOptions {
  maxDepth?: number;
  minCostPercent?: number; // Only show nodes above this cost %
  showTimeAxis?: boolean;
  useActualTime?: boolean; // vs estimated cost
}

/**
 * Flame graph renderer using Chart.js horizontal bar chart
 * Shows critical execution path from root to hottest leaf
 */
export class FlameGraphRenderer {
  private chartInstance: Chart | null = null;
  private hotspotMetrics: HotspotMetrics[] = [];
  private flamePathNodes: FlamePathNode[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private rootNode: ExplainNode,
    private hotspots: HotspotMetrics[],
    private options: FlameGraphOptions = {}
  ) {
    this.hotspotMetrics = hotspots;
  }

  /**
   * Render the flame graph
   */
  public render(): void {
    ensureChartJsRegistered();
    this.destroy();

    // Compute critical path
    this.flamePathNodes = this.computeHotPath(this.rootNode);

    if (this.flamePathNodes.length === 0) {
      this.canvas.parentElement!.textContent = 'No flame path data available';
      return;
    }

    // Create chart data
    const chartData = this.buildChartData();

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              title: () => '',
              label: (context: any) => {
                const node = this.flamePathNodes[context.dataIndex];
                if (!node) return '';
                const metricLabel = this.options.useActualTime
                  ? `${node.actualTime.toFixed(2)}ms (${node.timePercent.toFixed(1)}%)`
                  : `$${node.cost.toFixed(2)} (${node.costPercent.toFixed(1)}%)`;
                return `${node.name}: ${metricLabel}`;
              },
              afterLabel: (context: any) => {
                const node = this.flamePathNodes[context.dataIndex];
                return node?.isHotspot ? `⚠️ ${node.severity} severity hotspot` : '';
              }
            }
          }
        },
        scales: {
          y: {
            stacked: false,
            ticks: {
              callback: (value: any, index: number) => {
                const node = this.flamePathNodes[index];
                return node?.name || '';
              },
              autoSkip: false,
              font: { size: 11 }
            }
          },
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: this.options.useActualTime
                ? 'Execution Time (%)'
                : 'Estimated Cost (%)'
            },
            ticks: {
              callback: (value: any) => `${value}%`,
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  /**
   * Compute hot path: critical execution path from root to hottest leaf
   */
  private computeHotPath(node: ExplainNode, depth = 0): FlamePathNode[] {
    const path: FlamePathNode[] = [];
    let current = node;
    const visited = new Set<ExplainNode>();

    while (current && !visited.has(current)) {
      visited.add(current);

      const totalCost = this.getTotalCost(this.rootNode);
      const totalTime = this.getTotalExecutionTime(this.rootNode);
      const costPercent = totalCost > 0 ? (current.cost || 0) / totalCost * 100 : 0;
      const timePercent = totalTime > 0 ? (current.actualTime || 0) / totalTime * 100 : 0;

      const hotspot = this.hotspotMetrics.find(h => h.node === current);

      path.push({
          name: current['Node Type'] || 'Plan',
          cost: current['Total Cost'] || 0,
          costPercent: totalCost > 0 ? ((current['Total Cost'] || 0) / totalCost * 100) : 0,
          actualTime: current['Actual Total Time'] || 0,
          timePercent: totalTime > 0 ? ((current['Actual Total Time'] || 0) / totalTime * 100) : 0,
          rows: current['Plan Rows'] || current['Actual Rows'] || 0,
          loops: current['Actual Loops'] || 1,
        isHotspot: !!hotspot,
        severity: hotspot?.severity as any,
        depth
      });

      // Find most expensive child
        const children = current.Plans || [];
      if (children.length === 0) break;

      current = children.reduce((max, child) => {
          const childCost = child['Total Cost'] || 0;
          const maxCost = max['Total Cost'] || 0;
        return childCost > maxCost ? child : max;
      }, children[0]);

      depth++;
      if (depth > (this.options.maxDepth || 50)) break;
    }

    return path;
  }

  /**
   * Build Chart.js data structure for horizontal bar chart
   */
  private buildChartData(): any {
    const colorPalette = [
      'rgba(54, 162, 235, 0.7)',    // Blue
      'rgba(75, 192, 192, 0.7)',    // Teal
      'rgba(153, 102, 255, 0.7)',   // Purple
      'rgba(255, 159, 64, 0.7)',    // Orange
    ];

    const metric = this.options.useActualTime ? 'timePercent' : 'costPercent';
    const datasets = [{
      label: this.options.useActualTime ? 'Execution Time (%)' : 'Estimated Cost (%)',
      data: this.flamePathNodes.map(node => node[metric as keyof FlamePathNode] as number),
      backgroundColor: this.flamePathNodes.map(node => {
        if (node.isHotspot) {
          switch (node.severity) {
            case 'critical': return 'rgba(255, 107, 107, 0.8)';
            case 'high': return 'rgba(255, 159, 64, 0.8)';
            case 'medium': return 'rgba(255, 215, 0, 0.8)';
            case 'low': return 'rgba(100, 200, 255, 0.8)';
            default: return colorPalette[node.depth % colorPalette.length];
          }
        }
        return colorPalette[node.depth % colorPalette.length];
      }),
      borderColor: this.flamePathNodes.map(() => 'rgba(0, 0, 0, 0.3)'),
      borderWidth: 1,
      borderRadius: 3
    }];

    return {
      labels: this.flamePathNodes.map(node => {
        const indent = '  '.repeat(node.depth);
        const hotspotBadge = node.isHotspot ? '⚠️ ' : '';
        return `${indent}${hotspotBadge}${node.name}`;
      }),
      datasets
    };
  }

  /**
   * Get total cost of plan (recursive)
   */
  private getTotalCost(node: ExplainNode): number {
    let total = node['Total Cost'] || 0;
    if (node.Plans) {
      for (const child of node.Plans) {
        total += this.getTotalCost(child);
      }
    }
    return total;
  }

  /**
   * Get total execution time of plan (recursive)
   */
  private getTotalExecutionTime(node: ExplainNode): number {
    let total = node['Actual Total Time'] || 0;
    if (node.Plans) {
      for (const child of node.Plans) {
        total += this.getTotalExecutionTime(child);
      }
    }
    return total;
  }

  /**
   * Export flame graph data as JSON
   */
  public exportData(): { path: FlamePathNode[]; options: FlameGraphOptions } {
    return {
      path: this.flamePathNodes,
      options: this.options
    };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
