import { expect } from 'chai';

import { analyzeDeepPlan } from '../../features/planStudio/deepPlanAnalysis';

describe('deepPlanAnalysis', () => {
  it('extracts function, cte, subquery, and skew findings', () => {
    const payload = [{
      'Planning Time': 5.1,
      'Execution Time': 1800,
      Plan: {
        'Node Type': 'Nested Loop',
        'Total Cost': 1200,
        'Actual Total Time': 1500,
        'Plan Rows': 100,
        'Actual Rows': 1000,
        Plans: [
          {
            'Node Type': 'Function Scan',
            'Function Name': 'public.function_name',
            'Total Cost': 800,
            'Actual Total Time': 1300,
            'Plan Rows': 25,
            'Actual Rows': 900,
            'Actual Loops': 3,
          },
          {
            'Node Type': 'CTE Scan',
            'CTE Name': 'heavy_cte',
            'Total Cost': 300,
            'Actual Total Time': 400,
            'Plan Rows': 10,
            'Actual Rows': 200,
            Plans: [
              {
                'Node Type': 'Subquery Scan',
                'Subplan Name': 'SubPlan 1',
                'Total Cost': 100,
                'Actual Total Time': 200,
                'Plan Rows': 5,
                'Actual Rows': 120,
              },
            ],
          },
        ],
      },
    }];

    const result = analyzeDeepPlan(payload, 'WITH heavy_cte AS (SELECT 1) SELECT * FROM public.function_name(1) JOIN heavy_cte ON true');
    expect(result).to.not.equal(null);
    expect(result?.functions[0].functionName).to.equal('public.function_name');
    expect(result?.ctes[0].cteName).to.equal('heavy_cte');
    expect(result?.subqueries[0].nodeType).to.equal('Subquery Scan');
    expect(result?.estimateSkew[0].skewRatio).to.be.greaterThan(2);
    expect(result?.sqlShape.cteNames).to.include('heavy_cte');
    expect(result?.sqlShape.fromFunctionNames).to.include('public.function_name');
    expect(result?.recommendations.length).to.be.greaterThan(0);
  });
});
