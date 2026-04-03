# Security Policy

## Supported Versions

We actively support security updates for the latest major release.

| Version | Supported          |
| ------- | ------------------ |
| 0.8.x   | :white_check_mark: |
| < 0.8.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this extension (for example, credential storage issues, SQL injection risks, or data leakage), please report it via GitHub issues and clearly mark it as a security report.

### What to Include
* Description of the vulnerability.
* Steps to reproduce the issue.
* Any relevant code snippets or screenshots (sanitize credentials before sending).

## Data Privacy & Credential Storage

As a database tool, security is paramount. Here is how this extension handles sensitive data:

1.  **Credential Storage:** We utilize the **VS Code Secret Storage API** to persist connection strings and passwords. We do not store credentials in plain text in `settings.json` or workspace state.
2.  **Telemetry:** This extension does not collect personal data or database schema information.
3.  **Data Transmission:** This extension operates locally. It connects directly from your machine to your PostgreSQL instance. No database content is sent to third-party servers.
