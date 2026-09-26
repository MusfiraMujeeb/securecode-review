import * as vscode from 'vscode';

export interface SecurityCheck {
    id: string;
    message: string;
    severity: vscode.DiagnosticSeverity;
    test: (line: string) => RegExpMatchArray | null;
    fix?: {
        title: string;
        apply: (line: string, match: RegExpMatchArray) => string;
    };
}

export const securityChecks: SecurityCheck[] = [
    {
        id: 'eval-usage',
        message: 'eval() allows arbitrary code execution. Avoid using it.',
        severity: vscode.DiagnosticSeverity.Error,
        test: (line) => line.match(/\beval\s*\(/),
        fix: {
            title: 'Replace with JSON.parse',
            apply: (line, match) => line.replace(match[0], 'JSON.parse')
        }
    },
    {
        id: 'jwt-no-expiry',
        message: 'JWT signed without expiresIn — token never expires.',
        severity: vscode.DiagnosticSeverity.Warning,
        test: (line) => {
            if (!/jwt\.sign\s*\(/.test(line)) {
                return null;
            }
            if (line.includes('expiresIn')) {
                return null;
            }
            return line.match(/jwt\.sign\s*\(/);
        }
    },
    {
        id: 'cors-wildcard',
        message: 'CORS configured with wildcard or no origin restriction.',
        severity: vscode.DiagnosticSeverity.Warning,
        test: (line) => {
            const noArgs = line.match(/cors\(\s*\)/);
            if (noArgs) {
                return noArgs;
            }
            const wildcard = line.match(/origin:\s*['"]\*['"]/);
            if (wildcard) {
                return wildcard;
            }
            return null;
        }
    },
    {
        id: 'hardcoded-secret',
        message: 'Potential hardcoded secret detected. Use environment variables instead.',
        severity: vscode.DiagnosticSeverity.Error,
        test: (line) =>
            line.match(/(password|secret|api_key|apikey|token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/i)
    }
];

export function scanDocument(
    document: vscode.TextDocument,
    enabledIds?: Set<string>
): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const lineCount = document.lineCount;

    for (let i = 0; i < lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        const trimmed = text.trim();

        // Skip comment lines
        if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*')
        ) {
            continue;
        }

        for (const check of securityChecks) {
            if (enabledIds && !enabledIds.has(check.id)) {
                continue;
            }
            const match = check.test(text);
            if (match && match.index !== undefined) {
                const start = new vscode.Position(i, match.index);
                const end = new vscode.Position(i, match.index + match[0].length);
                const range = new vscode.Range(start, end);

                const diagnostic = new vscode.Diagnostic(
                    range,
                    check.message,
                    check.severity
                );
                diagnostic.source = 'SecureCode Review';
                diagnostic.code = check.id;
                diagnostics.push(diagnostic);
            }
        }
    }

    return diagnostics;
}