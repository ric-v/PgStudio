import * as vscode from 'vscode';
import { ProFeature } from './FeatureGates';

export interface UsageRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface FreemiumUsageState {
  [featureKey: string]: UsageRecord;
}

export class FreemiumService {
  private static instance: FreemiumService;
  private context: vscode.ExtensionContext | null = null;
  private readonly STORAGE_KEY = 'pgstudio.freemium.usage';

  private readonly LIMITS: Record<string, number> = {
    [String(ProFeature.SchemaDiff)]: 5,
    [String(ProFeature.ExplainAnalyzer)]: 10,
    [String(ProFeature.SchemaDesigner)]: 5,
    'dashboardAi': 10,
  };

  private constructor() {}

  public static getInstance(): FreemiumService {
    if (!FreemiumService.instance) {
      FreemiumService.instance = new FreemiumService();
    }
    return FreemiumService.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getUsageState(): FreemiumUsageState {
    if (!this.context) {
      return {};
    }
    return this.context.globalState.get<FreemiumUsageState>(this.STORAGE_KEY, {});
  }

  private async saveUsageState(state: FreemiumUsageState): Promise<void> {
    if (!this.context) {
      return;
    }
    await this.context.globalState.update(this.STORAGE_KEY, state);
  }

  private getFeatureKey(feature: ProFeature | string): string {
    return String(feature);
  }

  public getLimit(feature: ProFeature | string): number {
    const key = this.getFeatureKey(feature);
    return this.LIMITS[key] ?? 0;
  }

  public getRemainingUses(feature: ProFeature | string): number {
    const key = this.getFeatureKey(feature);
    const limit = this.getLimit(feature);
    const state = this.getUsageState();
    const record = state[key];
    const today = this.getTodayDateString();

    if (!record || record.date !== today) {
      return limit;
    }

    return Math.max(0, limit - record.count);
  }

  public hasRemainingUses(feature: ProFeature | string): boolean {
    return this.getRemainingUses(feature) > 0;
  }

  public async incrementUsage(feature: ProFeature | string): Promise<void> {
    const key = this.getFeatureKey(feature);
    const state = this.getUsageState();
    const today = this.getTodayDateString();
    const record = state[key];

    if (!record || record.date !== today) {
      state[key] = { date: today, count: 1 };
    } else {
      record.count += 1;
    }

    await this.saveUsageState(state);
  }
}
