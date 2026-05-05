import * as vscode from 'vscode';
import { QueryAnalyzer } from '../../services/QueryAnalyzer';

const PLAN_STORE_KEY = 'planStudio.planStore.v1';
const NOTEBOOK_LINKS_KEY = 'planStudio.notebookLinks.v1';
const MAX_STORED_PLANS = 200;

export interface StoredPlan {
  id: string;
  queryHash: string;
  query: string;
  connectionId?: string;
  databaseName?: string;
  capturedAt: string;
  plan: any;
  source: 'notebook' | 'converted' | 'manual';
  notebookUri?: string;
  sourceCellIndex?: number;
  performanceAnalysis?: any;
}

export class PlanStoreWorkspace {
  constructor(private readonly context: vscode.ExtensionContext) { }

  public savePlan(input: Omit<StoredPlan, 'id' | 'capturedAt' | 'queryHash'>): StoredPlan {
    const analyzer = QueryAnalyzer.getInstance();
    const normalizedQuery = String(input.query ?? '').trim();
    const plan: StoredPlan = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      queryHash: analyzer.getQueryHash(normalizedQuery || 'empty_query'),
      capturedAt: new Date().toISOString(),
    };
    const existing = this.getPlans();
    const next = [plan, ...existing].slice(0, MAX_STORED_PLANS);
    void this.context.workspaceState.update(PLAN_STORE_KEY, next);
    return plan;
  }

  public getPlans(): StoredPlan[] {
    return this.context.workspaceState.get<StoredPlan[]>(PLAN_STORE_KEY, []);
  }

  public getPlanById(id: string): StoredPlan | undefined {
    return this.getPlans().find((item) => item.id === id);
  }

  public getPlansByQueryHash(queryHash: string): StoredPlan[] {
    return this.getPlans().filter((item) => item.queryHash === queryHash);
  }

  public linkPlanToNotebook(notebookUri: string, planId: string): void {
    const links = this.context.workspaceState.get<Record<string, string[]>>(NOTEBOOK_LINKS_KEY, {});
    const existing = links[notebookUri] ?? [];
    if (!existing.includes(planId)) {
      links[notebookUri] = [planId, ...existing].slice(0, 80);
      void this.context.workspaceState.update(NOTEBOOK_LINKS_KEY, links);
    }
  }

  public getNotebookPlans(notebookUri: string): StoredPlan[] {
    const links = this.context.workspaceState.get<Record<string, string[]>>(NOTEBOOK_LINKS_KEY, {});
    const planIds = links[notebookUri] ?? [];
    const byId = new Map(this.getPlans().map((plan) => [plan.id, plan]));
    return planIds.map((id) => byId.get(id)).filter((plan): plan is StoredPlan => !!plan);
  }

  public deletePlan(id: string): void {
    const remainingPlans = this.getPlans().filter((plan) => plan.id !== id);
    void this.context.workspaceState.update(PLAN_STORE_KEY, remainingPlans);

    const links = this.context.workspaceState.get<Record<string, string[]>>(NOTEBOOK_LINKS_KEY, {});
    const nextLinks: Record<string, string[]> = {};
    for (const [notebookUri, planIds] of Object.entries(links)) {
      const filtered = planIds.filter((planId) => planId !== id);
      if (filtered.length > 0) {
        nextLinks[notebookUri] = filtered;
      }
    }
    void this.context.workspaceState.update(NOTEBOOK_LINKS_KEY, nextLinks);
  }
}
