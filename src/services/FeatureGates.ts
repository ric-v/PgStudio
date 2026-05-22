import * as vscode from 'vscode';
import { LicenseService, UPGRADE_URL } from './LicenseService';
import { FreemiumService } from './FreemiumService';

export const enum ProFeature {
  AiAssistant,
  SchemaDiff,
  RealtimeDashboard,
  ExplainAnalyzer,
  SchemaDesigner,
  SavedQueriesUnlimited,
}

export const FREE_SAVED_QUERIES_LIMIT = 15;

export type ProCommit = () => Promise<void>;

const noopCommit: ProCommit = async () => {};

export function isProFeatureEnabled(feature: ProFeature): boolean {
  return LicenseService.getInstance().isPro();
}

/**
 * Gate a Pro feature for the current user.
 *
 * Returns a commit function on success (call it after the feature completes so
 * usage is only counted when work actually happens), or `false` when access is
 * denied.  Pro users and RealtimeDashboard always receive a no-op commit.
 */
export async function requirePro(
  feature: ProFeature,
  featureLabel: string,
): Promise<false | ProCommit> {
  if (LicenseService.getInstance().isPro()) {
    return noopCommit;
  }

  // RealtimeDashboard opens freely but pauses live updates after 60 s
  if (feature === ProFeature.RealtimeDashboard) {
    return noopCommit;
  }

  const freemiumService = FreemiumService.getInstance();
  const limit = freemiumService.getLimit(feature);

  if (limit > 0) {
    const remaining = freemiumService.getRemainingUses(feature);

    if (remaining > 0) {
      return async () => {
        await freemiumService.incrementUsage(feature);
        const newRemaining = freemiumService.getRemainingUses(feature);
        if (newRemaining === 0) {
          vscode.window
            .showWarningMessage(
              `That was your last free use of ${featureLabel} today. Upgrade to Pro for unlimited access!`,
              'Upgrade to Pro',
            )
            .then(async (action) => {
              if (action === 'Upgrade to Pro') {
                await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
              }
            });
        } else if (newRemaining === 1) {
          vscode.window
            .showInformationMessage(
              `1 free use of ${featureLabel} remaining today.`,
              'Upgrade to Pro',
            )
            .then(async (action) => {
              if (action === 'Upgrade to Pro') {
                await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
              }
            });
        }
      };
    }

    const action = await vscode.window.showWarningMessage(
      `Daily free limit of ${limit} uses for ${featureLabel} reached. Upgrade to Pro for unlimited access!`,
      'Upgrade to Pro',
      'Enter License Key',
    );

    if (action === 'Upgrade to Pro') {
      await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
    } else if (action === 'Enter License Key') {
      await vscode.commands.executeCommand('postgres-explorer.license.activate');
    }

    return false;
  }

  // Fallback: hard Pro-only feature (e.g. SavedQueriesUnlimited, AiAssistant)
  const action = await vscode.window.showWarningMessage(
    `${featureLabel} is a PgStudio Pro feature.`,
    'Upgrade to Pro',
    'Enter License Key',
  );

  if (action === 'Upgrade to Pro') {
    await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
  } else if (action === 'Enter License Key') {
    await vscode.commands.executeCommand('postgres-explorer.license.activate');
  }

  // If the user activated their license via the dialog, let the caller proceed
  if (LicenseService.getInstance().isPro()) {
    return noopCommit;
  }

  return false;
}
