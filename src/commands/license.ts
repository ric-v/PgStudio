import * as vscode from 'vscode';
import { LicenseService, UPGRADE_URL } from '../services/LicenseService';

export async function runLicenseActivateCommand(): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your PgStudio Pro license key',
    placeHolder: 'XXXX-XXXX-XXXX-XXXX',
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'License key is required';
      }
      return undefined;
    },
  });

  if (!key) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Activating PgStudio Pro license...',
      cancellable: false,
    },
    async () => {
      const result = await LicenseService.getInstance().activateLicense(key.trim());

      if (result.success) {
        const planLabel =
          result.planType === 'pro_lifetime'
            ? 'Lifetime'
            : result.planType === 'pro_annual'
            ? 'Annual'
            : 'Monthly';
        await vscode.window.showInformationMessage(
          `PgStudio Pro (${planLabel}) activated!`,
        );
      } else {
        await vscode.window.showErrorMessage(
          `License activation failed: ${result.error || 'Invalid key'}`,
        );
      }
    },
  );
}

export async function runLicenseManageCommand(): Promise<void> {
  const service = LicenseService.getInstance();
  const status = service.getStatus();

  if (status === 'free') {
    await vscode.commands.executeCommand('postgres-explorer.license.activate');
    return;
  }

  const items: vscode.QuickPickItem[] = [
    {
      label: '$(sync) Refresh License Status',
      description: 'Re-validate your license key with Lemon Squeezy',
    },
    {
      label: '$(circle-slash) Deactivate License',
      description: 'Remove Pro license from this machine',
    },
    {
      label: '$(link-external) Manage Subscription',
      description: 'Open the PgStudio upgrade page',
    },
  ];

  const choice = await vscode.window.showQuickPick(items, {
    placeHolder: status === 'pro' ? 'PgStudio Pro — Manage License' : 'Pro (offline) — Manage License',
  });

  if (!choice) {
    return;
  }

  if (choice.label.includes('Refresh')) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Validating license...',
        cancellable: false,
      },
      async () => {
        await service.refreshLicense();
        const newStatus = service.getStatus();
        if (newStatus === 'pro') {
          await vscode.window.showInformationMessage('PgStudio Pro license is valid.');
        } else if (newStatus === 'grace') {
          await vscode.window.showWarningMessage(
            'Unable to reach license server. Pro features remain available (offline grace period).',
          );
        } else {
          await vscode.window.showWarningMessage('License validation failed. You are now on the Free tier.');
        }
      },
    );
  } else if (choice.label.includes('Deactivate')) {
    const confirm = await vscode.window.showWarningMessage(
      'Deactivate PgStudio Pro on this machine? Pro features will be locked.',
      { modal: true },
      'Deactivate',
    );

    if (confirm === 'Deactivate') {
      await service.deactivateLicense();
      await vscode.window.showInformationMessage('License deactivated. You are now on the Free tier.');
    }
  } else if (choice.label.includes('Manage')) {
    await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
  }
}

export async function runOpenUpgradeCommand(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(UPGRADE_URL));
}
