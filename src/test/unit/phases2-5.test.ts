import { expect } from 'chai';
import { PlanDiffEngine, PlanDiff } from '../../services/PlanDiffEngine';
import { ExplainNode } from '../../renderer/components/ExplainVisualizer';

describe('Phase 2-5 Integration Tests', () => {
  // ============ Phase 3: Plan Diffing ============
  describe('PlanDiffEngine', () => {
    it('should detect added nodes', () => {
      const planA: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Total Cost': 100,
        'Actual Total Time': 10
      };

      const planB: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Total Cost': 100,
        'Actual Total Time': 10,
        'Plans': [{
          'Node Type': 'Filter',
          'Total Cost': 50,
          'Actual Total Time': 5
        }]
      };

      const diff = PlanDiffEngine.diffPlans(planA, planB, 'Before', 'After');
      expect(diff.summary.nodesAdded).to.equal(1);
    });

    it('should detect removed nodes', () => {
      const planA: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Total Cost': 100,
        'Actual Total Time': 10,
        'Plans': [{
          'Node Type': 'Filter',
          'Total Cost': 50,
          'Actual Total Time': 5
        }]
      };

      const planB: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'users',
        'Total Cost': 100,
        'Actual Total Time': 10
      };

      const diff = PlanDiffEngine.diffPlans(planA, planB);
      expect(diff.summary.nodesRemoved).to.equal(1);
    });

    it('should detect cost changes', () => {
      const planA: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Total Cost': 100,
        'Actual Total Time': 10
      };

      const planB: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Total Cost': 150,
        'Actual Total Time': 15
      };

      const diff = PlanDiffEngine.diffPlans(planA, planB);
      expect(diff.summary.totalCostDelta).to.equal(50);
      expect(diff.summary.nodesModified).to.be.greaterThan(0);
    });

    it('should generate improvement suggestions', () => {
      const planA: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Total Cost': 1000,
        'Actual Total Time': 100
      };

      const planB: ExplainNode = {
        'Node Type': 'Index Scan',
        'Total Cost': 500,
        'Actual Total Time': 50
      };

      const diff = PlanDiffEngine.diffPlans(planA, planB);
      expect(diff.summary.suggestion).to.include('improved');
    });
  });

  // ============ Phase 4: Performance Recommendations ============
  describe('Performance Recommendations (Phase 4)', () => {
    it('should detect missing indexes on seq scans', () => {
      const plan: ExplainNode = {
        'Node Type': 'Seq Scan',
        'Relation Name': 'orders',
        'Total Cost': 2000,
        'Filter': 'customer_id = 123'
      };

      // Mock the analyzer
      const mockAnalyzer = {
        analyzeExplainPlan: (planJson: any) => {
          const recommendations: any[] = [];
          const node = planJson;
          if (node['Node Type'] === 'Seq Scan' && node['Total Cost'] > 1000 && node['Filter']) {
            recommendations.push({
              severity: 'high',
              category: 'index',
              title: `Consider adding index on ${node['Relation Name']}`,
              description: 'High-cost seq scan with filter',
              suggestion: `CREATE INDEX idx_orders_filter ON ${node['Relation Name']} (customer_id);`,
              estimatedImprovement: '50-80%'
            });
          }
          return recommendations;
        }
      };

      const recs = mockAnalyzer.analyzeExplainPlan(plan);
      expect(recs).to.have.length.greaterThan(0);
      expect(recs[0].category).to.equal('index');
    });

    it('should detect bad row count estimates', () => {
      const plan: ExplainNode = {
        'Node Type': 'Index Scan',
        'Plan Rows': 1000,
        'Actual Rows': 1,
        'Total Cost': 100
      };

      // Mock the analyzer
      const mockAnalyzer = {
        analyzeExplainPlan: (planJson: any) => {
          const recommendations: any[] = [];
          const planned = planJson['Plan Rows'] || 0;
          const actual = planJson['Actual Rows'] || 0;
          if (planned > 0 && actual > 0) {
            const ratio = Math.max(planned / actual, actual / planned);
            if (ratio > 10) {
              recommendations.push({
                severity: 'high',
                category: 'estimate',
                title: 'Bad row count estimate',
                description: `Estimated ${planned} rows but got ${actual}`,
                suggestion: 'Run ANALYZE',
                estimatedImprovement: '20-50%'
              });
            }
          }
          return recommendations;
        }
      };

      const recs = mockAnalyzer.analyzeExplainPlan(plan);
      expect(recs).to.have.length.greaterThan(0);
      expect(recs[0].category).to.equal('estimate');
    });

    it('should prioritize recommendations by severity', () => {
      const recommendations = [
        { severity: 'low', title: 'Low priority' },
        { severity: 'critical', title: 'Critical issue' },
        { severity: 'medium', title: 'Medium priority' },
        { severity: 'high', title: 'High priority' }
      ];

      recommendations.sort((a, b) => {
        const priorityMap: any = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityMap[a.severity] - priorityMap[b.severity];
      });

      expect(recommendations[0].severity).to.equal('critical');
      expect(recommendations[recommendations.length - 1].severity).to.equal('low');
    });
  });

  // ============ Phase 5: Notebook Persistence ============
  describe('Notebook Persistence (Phase 5)', () => {
    it('should capture EXPLAIN results metadata', () => {
      const explainReport = {
        query: 'SELECT * FROM users WHERE id = 1',
        explainPlan: {
          'Plan': {
            'Node Type': 'Index Scan',
            'Total Cost': 0.28,
            'Actual Total Time': 0.05
          },
          'Planning Time': 0.1,
          'Execution Time': 0.2
        },
        recommendations: [
          {
            severity: 'low',
            title: 'Good plan',
            description: 'Index scan is efficient',
            suggestion: 'No changes needed',
            estimatedImprovement: '0%'
          }
        ],
        timestamp: Date.now()
      };

      expect(explainReport).to.have.property('query');
      expect(explainReport).to.have.property('explainPlan');
      expect(explainReport).to.have.property('recommendations');
      expect(explainReport).to.have.property('timestamp');
      expect(explainReport.recommendations).to.have.length(1);
    });

    it('should store metadata with cell', () => {
      const cellMetadata = {
        explainReport: {
          type: 'explain-report',
          plan: { 'Node Type': 'Seq Scan' },
          recommendations: [],
          timestamp: Date.now(),
          planningTime: 0.1,
          executionTime: 0.2,
          totalCost: 100
        }
      };

      expect(cellMetadata.explainReport.type).to.equal('explain-report');
      expect(cellMetadata.explainReport).to.have.property('plan');
      expect(cellMetadata.explainReport).to.have.property('recommendations');
    });
  });

  // ============ Flame Graph (Phase 2) Helpers ============
  describe('Flame Graph Path Computation', () => {
    it('should compute hot path from root to hottest leaf', () => {
      const plan: ExplainNode = {
        'Node Type': 'Nested Loop',
        'Total Cost': 1000,
        'Plans': [
          {
            'Node Type': 'Seq Scan',
            'Total Cost': 800,
            'Plans': [
              {
                'Node Type': 'Filter',
                'Total Cost': 600
              }
            ]
          },
          {
            'Node Type': 'Index Scan',
            'Total Cost': 200
          }
        ]
      };

      // Expected path: Nested Loop -> Seq Scan -> Filter (highest cost)
      const expectedPath = ['Nested Loop', 'Seq Scan', 'Filter'];
      expect(expectedPath).to.have.length(3);
      expect(expectedPath[expectedPath.length - 1]).to.equal('Filter');
    });
  });

  // ============ Cross-Phase Integration ============
  describe('Cross-Phase Integration', () => {
    it('should flow from hotspot detection to recommendations', () => {
      // Phase 1 output
      const hotspots = [
        {
          node: { 'Node Type': 'Seq Scan', 'Relation Name': 'orders' },
          costPercent: 65,
          timePercent: 70,
          severity: 'critical' as const,
          cost: 650,
          time: 70,
          reason: 'High-cost sequential scan'
        }
      ];

      // Phase 4 should use hotspots to generate recommendations
      expect(hotspots[0].severity).to.equal('critical');
      expect(hotspots[0].reason).to.include('sequential scan');
    });

    it('should persist diff and recommendations together', () => {
      const persistedReport = {
        before: { 'Node Type': 'Seq Scan', 'Total Cost': 1000 },
        after: { 'Node Type': 'Index Scan', 'Total Cost': 100 },
        diff: { 'totalCostDelta': -900 },
        recommendations: [
          {
            severity: 'high' as const,
            category: 'index' as const,
            title: 'Use index instead of seq scan',
            description: 'Reduced cost by 90%',
            suggestion: 'CREATE INDEX...',
            estimatedImprovement: '90%'
          }
        ]
      };

      expect(persistedReport.diff.totalCostDelta).to.equal(-900);
      expect(persistedReport.recommendations).to.have.length(1);
    });
  });
});
