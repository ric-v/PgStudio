import * as vscode from 'vscode';
import * as https from 'https';
import { SecretStorageService } from './SecretStorageService';

const VALIDATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const LS_API_HOST = 'api.lemonsqueezy.com';
const LS_ACTIVATE_PATH = '/v1/licenses/activate';
const LS_VALIDATE_PATH = '/v1/licenses/validate';
const LS_DEACTIVATE_PATH = '/v1/licenses/deactivate';

export const LEMON_SQUEEZY_STORE_ID = 0; // set after LS product/variants created
export const UPGRADE_URL = 'https://pgstudio.astrx.dev/upgrade';

export type LicenseStatus = 'free' | 'pro' | 'grace';

export interface LicenseCacheEntry {
  licenseKey: string;
  instanceId: string;
  activationId: string;
  status: 'active' | 'inactive' | 'expired';
  planType: 'pro_monthly' | 'pro_annual' | 'pro_lifetime';
  validatedAt: number;
  expiresAt: number | null;
  gracePeriodStartedAt: number | null;
}

export interface ActivationResult {
  success: boolean;
  error?: string;
  planType?: 'pro_monthly' | 'pro_annual' | 'pro_lifetime';
}

export class LicenseService {
  private static instance: LicenseService;
  private readonly _onDidChangeStatus = new vscode.EventEmitter<LicenseStatus>();
  public readonly onDidChangeStatus = this._onDidChangeStatus.event;

  private _status: LicenseStatus = 'free';
  private _cache: LicenseCacheEntry | null = null;
  private _disposables: vscode.Disposable[] = [];

  private constructor(private readonly context: vscode.ExtensionContext) {
    this._disposables.push(this._onDidChangeStatus);
  }

  public static getInstance(context?: vscode.ExtensionContext): LicenseService {
    if (!LicenseService.instance) {
      if (!context) {
        throw new Error('LicenseService not initialized');
      }
      LicenseService.instance = new LicenseService(context);
    }
    return LicenseService.instance;
  }

  public get status(): LicenseStatus {
    return this._status;
  }

  public isPro(): boolean {
    return this._status === 'pro' || this._status === 'grace';
  }

  public getStatus(): LicenseStatus {
    return this._status;
  }

  public async initialize(): Promise<void> {
    vscode.commands.executeCommand('setContext', 'pgstudio.licenseStatus', 'free');
    const raw = await SecretStorageService.getInstance().getLicenseCache();
    if (!raw) {
      return;
    }

    try {
      this._cache = JSON.parse(raw) as LicenseCacheEntry;
    } catch {
      await SecretStorageService.getInstance().deleteLicenseCache();
      return;
    }

    const now = Date.now();
    if (now - this._cache.validatedAt < VALIDATION_CACHE_TTL_MS) {
      this.setStatus(this.computeStatus(this._cache));
      return;
    }

    void this.refreshLicense();
  }

  public async activateLicense(key: string): Promise<ActivationResult> {
    const machineId = vscode.env.machineId;
    const instanceName = `vscode-${machineId.slice(0, 8)}`;

    try {
      const { body, statusCode } = await this.lsRequest(LS_ACTIVATE_PATH, {
        license_key: key,
        instance_name: instanceName,
      });

      if (statusCode === 200 && body?.activated) {
        const license = body.license_key;
        const instance = body.instance;
        this._cache = {
          licenseKey: key,
          instanceId: machineId,
          activationId: String(instance?.id ?? ''),
          status: license?.status ?? 'active',
          planType: this.mapPlanType(license?.variant_name),
          validatedAt: Date.now(),
          expiresAt: license?.expires_at ? new Date(license.expires_at).getTime() : null,
          gracePeriodStartedAt: null,
        };
        await this.persistCache();
        this.setStatus(this.computeStatus(this._cache));
        return { success: true, planType: this._cache.planType };
      }

      const errorMsg = body?.error || `Activation failed (HTTP ${statusCode})`;
      return { success: false, error: String(errorMsg) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during activation' };
    }
  }

  public async deactivateLicense(): Promise<void> {
    if (!this._cache) {
      return;
    }

    try {
      await this.lsRequest(LS_DEACTIVATE_PATH, {
        license_key: this._cache.licenseKey,
        instance_id: this._cache.activationId,
      });
    } catch {
      // Best-effort, clear local state regardless
    }

    this._cache = null;
    await SecretStorageService.getInstance().deleteLicenseCache();
    this.setStatus('free');
  }

  public async refreshLicense(): Promise<void> {
    if (!this._cache) {
      return;
    }

    try {
      const { body, statusCode } = await this.lsRequest(LS_VALIDATE_PATH, {
        license_key: this._cache.licenseKey,
        instance_id: this._cache.activationId,
      });

      if (statusCode === 200 && body?.valid) {
        this._cache.validatedAt = Date.now();
        this._cache.gracePeriodStartedAt = null;
        this._cache.status = body.license_key?.status ?? 'active';
        this._cache.expiresAt = body.license_key?.expires_at
          ? new Date(body.license_key.expires_at).getTime()
          : null;
        await this.persistCache();
        this.setStatus(this.computeStatus(this._cache));
        return;
      }

      if (statusCode === 401 || statusCode === 422 || statusCode === 404) {
        this._cache = null;
        await SecretStorageService.getInstance().deleteLicenseCache();
        this.setStatus('free');
        vscode.window.showWarningMessage('PgStudio Pro license is no longer valid. You are now on the Free tier.');
        return;
      }
    } catch {
      const cache = this._cache;
      if (!cache) {
        return;
      }
      if (!cache.gracePeriodStartedAt) {
        cache.gracePeriodStartedAt = Date.now();
        await this.persistCache();
      }
      this.setStatus(this.computeStatus(cache));
    }
  }

  private computeStatus(cache: LicenseCacheEntry): LicenseStatus {
    if (cache.status !== 'active') {
      return 'free';
    }

    if (cache.expiresAt && Date.now() > cache.expiresAt) {
      return 'free';
    }

    if (cache.gracePeriodStartedAt && Date.now() - cache.gracePeriodStartedAt > GRACE_PERIOD_MS) {
      return 'free';
    }

    if (cache.gracePeriodStartedAt) {
      return 'grace';
    }

    return 'pro';
  }

  private setStatus(status: LicenseStatus): void {
    if (this._status === status) {
      return;
    }
    this._status = status;
    this._onDidChangeStatus.fire(status);
    vscode.commands.executeCommand('setContext', 'pgstudio.licenseStatus', status);

    // Sync to configuration so it appears in the Settings UI
    const config = vscode.workspace.getConfiguration('postgresExplorer.license');
    void config.update('status', status, vscode.ConfigurationTarget.Global);
  }

  private async persistCache(): Promise<void> {
    if (this._cache) {
      await SecretStorageService.getInstance().setLicenseCache(JSON.stringify(this._cache));
    }
  }

  private lsRequest(path: string, body: Record<string, unknown>): Promise<{ body: any; statusCode: number }> {
    return new Promise((resolve, reject) => {
      const requestData = JSON.stringify(body);

      const options: https.RequestOptions = {
        hostname: LS_API_HOST,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            // non-JSON response body
          }
          resolve({ body: parsed, statusCode: res.statusCode ?? 0 });
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.write(requestData);
      req.end();
    });
  }

  private mapPlanType(variantName?: string): 'pro_monthly' | 'pro_annual' | 'pro_lifetime' {
    if (!variantName) {
      return 'pro_monthly';
    }
    const lower = variantName.toLowerCase();
    if (lower.includes('lifetime')) {
      return 'pro_lifetime';
    }
    if (lower.includes('annual') || lower.includes('yearly')) {
      return 'pro_annual';
    }
    return 'pro_monthly';
  }

  public dispose(): void {
    this._disposables.forEach((d) => d.dispose());
  }
}
