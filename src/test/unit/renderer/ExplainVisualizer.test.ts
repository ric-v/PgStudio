import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { ExplainVisualizer, ExplainNode, HotspotMetrics } from '../../../renderer/components/ExplainVisualizer';

describe('ExplainVisualizer', () => {
  let dom: JSDOM;
  let window: any;
  let document: any;
  let container: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    window = dom.window;
    document = window.document;
    
    // Setup global objects
    (global as any).window = window;
    (global as any).document = document;
    
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    (global as any).window = undefined;
    (global as any).document = undefined;
  });

  /**
   * Helper to create a mock plan JSON structure.
   */
  function createMockPlan(nodes: Array<{ type: string; cost: number; time?: number; rows?: number; childCosts?: number[] }>): any {
    const createNode = (n: any, depth = 0): ExplainNode => {
      const children = (n.childCosts || []).map(cost => createNode({ type: 'Seq Scan', cost, time: cost * 0.5, rows: 100 }));
      return {
        'Node Type': n.type,
        'Total Cost': n.cost,
        'Startup Cost': n.cost * 0.1,
        'Plan Rows': n.rows ?? 100,
        'Actual Rows': n.rows ?? 100,
        'Actual Total Time': n.time ?? n.cost * 0.5,
        'Actual Loops': 1,
        Plans: children.length > 0 ? children : undefined,
      };
    };

    const root = createNode(nodes[0]);
    return [
      {
        'Execution Time': nodes[0].time ?? nodes[0].cost * 0.5,
        'Planning Time': 0.1,
        Plan: root,
      },
    ];
  }

  describe('Hotspot Detection', () => {
    it('should detect nodes above cost threshold as hotspots', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 1000,
          time: 500,
          childCosts: [200, 800], // 80% and 20% of plan cost
        },
      ]);

      const viz = new ExplainVisualizer(container, plan, { costThresholdPercent: 10, timeThresholdPercent: 10 });
      const hotspots = viz.getHotspots();

      // Should have hotspots (the 800 cost node is >10% of 1000)
      expect(hotspots.length).to.be.greaterThan(0);
      expect(hotspots.some(h => h.costPercent >= 75)).to.be.true;
    });

    it('should not detect low-cost nodes as hotspots', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 1000,
          time: 500,
          childCosts: [10, 20], // Each <10% of plan cost (0.1% and 0.2%)
        },
      ]);

      const viz = new ExplainVisualizer(container, plan, { costThresholdPercent: 15 });
      const hotspots = viz.getHotspots();

      // Should have no child hotspots with 15% threshold
      const childHotspots = hotspots.filter(h => h.costPercent < 15);
      expect(childHotspots.length).to.equal(0);
    });

    it('should assign correct severity levels', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [45, 35, 15], // 45%, 35%, 15% of plan cost
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      // Find the 45% cost node
      const critical = hotspots.find(h => h.costPercent >= 40);
      if (critical) {
        expect(critical.severity).to.equal('critical');
      }

      // Find the 35% cost node
      const high = hotspots.find(h => h.costPercent >= 30 && h.costPercent < 45);
      if (high) {
        expect(['high', 'critical']).to.include(high.severity);
      }
    });

    it('should handle plans with no timing data', () => {
      const plan: any = [
        {
          'Planning Time': 0.1,
          'Execution Time': null,
          Plan: {
            'Node Type': 'Seq Scan',
            'Total Cost': 100,
            'Startup Cost': 10,
            Plans: [],
          },
        },
      ];

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      // Should fall back to cost-based analysis
      expect(hotspots).to.be.an('array');
    });

    it('should handle deeply nested plans', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 1000,
          time: 500,
          childCosts: [900], // Create deep nesting
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      // Should find hotspots even in deep plans
      expect(hotspots.length).to.be.greaterThan(0);
    });

    it('should calculate cost percentage correctly', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 100,
          time: 50,
          childCosts: [25, 25], // 25% each
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      hotspots.forEach(h => {
        expect(h.costPercent).to.be.greaterThan(0);
        expect(h.costPercent).to.be.lessThanOrEqual(100);
      });
    });

    it('should include reason string for hotspots', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 1000,
          time: 1000,
          childCosts: [900], // 90% of plan cost
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      hotspots.forEach(h => {
        expect(h.reason).to.be.a('string');
        expect(h.reason.length).to.be.greaterThan(0);
        expect(h.reason).to.include('%');
      });
    });

    it('should sort hotspots by cost percentage descending', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 1000,
          time: 1000,
          childCosts: [500, 300, 100], // 50%, 30%, 10%
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      // Check that they're sorted
      for (let i = 1; i < hotspots.length; i++) {
        expect(hotspots[i - 1].costPercent).to.be.greaterThanOrEqual(hotspots[i].costPercent);
      }
    });

    it('should respect custom threshold configuration', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [15, 5], // 15% and 5%
        },
      ]);

      // With threshold 10%, both should be hotspots
      const viz1 = new ExplainVisualizer(container, plan, { costThresholdPercent: 10 });
      const hotspots1 = viz1.getHotspots();
      const count1 = hotspots1.filter(h => h.costPercent >= 5).length;

      // With threshold 20%, only the first should be
      const viz2 = new ExplainVisualizer(container, plan, { costThresholdPercent: 20 });
      const hotspots2 = viz2.getHotspots();
      const count2 = hotspots2.filter(h => h.costPercent >= 15).length;

      expect(count1).to.be.greaterThan(count2);
    });
  });

  describe('Public API', () => {
    it('should provide getHotspots() method', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [50, 50],
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();

      expect(hotspots).to.be.an('array');
      hotspots.forEach(h => {
        expect(h).to.have.all.keys(
          'node',
          'costPercent',
          'timePercent',
          'severity',
          'cost',
          'time',
          'reason'
        );
      });
    });

    it('should provide getTotalExecutionTime() method', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 123.45,
          childCosts: [],
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const totalTime = viz.getTotalExecutionTime();

      expect(totalTime).to.be.a('number');
      expect(totalTime).to.be.greaterThan(0);
    });

    it('should return a copy of hotspots array', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [50],
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      const hotspots1 = viz.getHotspots();
      const hotspots2 = viz.getHotspots();

      expect(hotspots1).to.not.equal(hotspots2);
      expect(hotspots1).to.deep.equal(hotspots2);
    });
  });

  describe('Rendering', () => {
    it('should render without errors on valid plan', () => {
      const plan = createMockPlan([
        {
          type: 'Nested Loop',
          cost: 100,
          time: 50,
          childCosts: [50, 50],
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      expect(() => viz.render()).to.not.throw();
      expect(container.innerHTML.length).to.be.greaterThan(0);
    });

    it('should render hotspot badges for hotspot nodes', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [80], // 80% hotspot
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      viz.render();

      // Check that hotspot badges are rendered
      const badges = container.querySelectorAll('.hotspot-badge');
      expect(badges.length).to.be.greaterThan(0);
    });

    it('should apply severity classes to hotspot nodes', () => {
      const plan = createMockPlan([
        {
          type: 'Seq Scan',
          cost: 100,
          time: 100,
          childCosts: [50], // 50% hotspot
        },
      ]);

      const viz = new ExplainVisualizer(container, plan);
      viz.render();

      // Check that severity classes exist
      const hasHotspotClass = container.innerHTML.includes('hotspot-critical') ||
        container.innerHTML.includes('hotspot-high') ||
        container.innerHTML.includes('hotspot-medium');
      expect(hasHotspotClass).to.be.true;
    });

    it('should render empty state for invalid plan', () => {
      const viz = new ExplainVisualizer(container, null);
      viz.render();

      expect(container.querySelector('.explain-empty')).to.exist;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty plan', () => {
      const viz = new ExplainVisualizer(container, {});
      expect(() => viz.render()).to.not.throw();
    });

    it('should handle plan with single node', () => {
      const plan: any = [
        {
          'Execution Time': 10,
          'Planning Time': 0.1,
          Plan: {
            'Node Type': 'Seq Scan',
            'Total Cost': 100,
            'Startup Cost': 10,
          },
        },
      ];

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();
      expect(hotspots).to.be.an('array');
      expect(() => viz.render()).to.not.throw();
    });

    it('should handle plan with zero execution time', () => {
      const plan: any = [
        {
          'Execution Time': 0,
          'Planning Time': 0.1,
          Plan: {
            'Node Type': 'Seq Scan',
            'Total Cost': 100,
            'Startup Cost': 10,
            'Actual Rows': 0,
          },
        },
      ];

      const viz = new ExplainVisualizer(container, plan);
      const hotspots = viz.getHotspots();
      expect(hotspots).to.be.an('array');
    });

    it('should handle plan with missing cost data', () => {
      const plan: any = [
        {
          'Execution Time': 10,
          'Planning Time': 0.1,
          Plan: {
            'Node Type': 'Seq Scan',
            'Actual Rows': 100,
          },
        },
      ];

      const viz = new ExplainVisualizer(container, plan);
      expect(() => viz.render()).to.not.throw();
    });
  });
});
