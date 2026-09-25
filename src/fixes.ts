import * as vscode from 'vscode';
import { securityChecks } from './scanner';

export class SecureCodeFixes implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'SecureCode Review') {
                continue;
            }

            const line = document.lineAt(diagnostic.range.start.line);

            // JWT fix: insert `{ expiresIn: '1h' }` before closing paren
            if (diagnostic.code === 'jwt-no-expiry') {
                const fix = new vscode.CodeAction(
                    "Add expiresIn: '1h'",
                    vscode.CodeActionKind.QuickFix
                );
                fix.edit = new vscode.WorkspaceEdit();
                const insertPos = new vscode.Position(line.lineNumber, line.text.length);
                fix.edit.insert(document.uri, insertPos, ", { expiresIn: '1h' }");
                fix.diagnostics = [diagnostic];
                fix.isPreferred = true;
                actions.push(fix);
                continue;
            }

            // CORS fix: replace cors() with cors({ origin: ... })
            if (diagnostic.code === 'cors-wildcard') {
                const newText = line.text.replace(
                    /cors\(\s*\)/,
                    "cors({ origin: process.env.CLIENT_URL || 'https://yourdomain.com' })"
                );
                if (newText !== line.text) {
                    const fix = new vscode.CodeAction(
                        'Restrict CORS origin',
                        vscode.CodeActionKind.QuickFix
                    );
                    fix.edit = new vscode.WorkspaceEdit();
                    fix.edit.replace(document.uri, line.range, newText);
                    fix.diagnostics = [diagnostic];
                    fix.isPreferred = true;
                    actions.push(fix);
                }
                continue;
            }

            // Hardcoded secret: replace quoted value with env var
            if (diagnostic.code === 'hardcoded-secret') {
                const newText = line.text.replace(
                    /(['"])[a-zA-Z0-9_\-]{8,}\1/,
                    'process.env.SECRET_KEY'
                );
                if (newText !== line.text) {
                    const fix = new vscode.CodeAction(
                        'Move secret to environment variable',
                        vscode.CodeActionKind.QuickFix
                    );
                    fix.edit = new vscode.WorkspaceEdit();
                    fix.edit.replace(document.uri, line.range, newText);
                    fix.diagnostics = [diagnostic];
                    fix.isPreferred = true;
                    actions.push(fix);
                }
                continue;
            }

            // Generic fix from the check definition
            const checkId = typeof diagnostic.code === 'string' ? diagnostic.code : '';
            const check = securityChecks.find((c) => c.id === checkId);

            if (check?.fix) {
                const match = check.test(line.text);
                if (match) {
                    const newText = check.fix.apply(line.text, match);
                    const fix = new vscode.CodeAction(
                        check.fix.title,
                        vscode.CodeActionKind.QuickFix
                    );
                    fix.edit = new vscode.WorkspaceEdit();
                    fix.edit.replace(document.uri, line.range, newText);
                    fix.diagnostics = [diagnostic];
                    fix.isPreferred = true;
                    actions.push(fix);
                }
            }
        }

        return actions;
    }
}