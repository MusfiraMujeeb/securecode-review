import * as vscode from 'vscode';
import { scanDocument } from './scanner';
import { SecureCodeFixes } from './fixes';

const SUPPORTED_LANGUAGES = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact'
];

export function activate(context: vscode.ExtensionContext) {
    const diagnostics = vscode.languages.createDiagnosticCollection('securecode');
    context.subscriptions.push(diagnostics);

    function getEnabledChecks(): Set<string> {
        const config = vscode.workspace.getConfiguration('securecode');
        const enabled = new Set<string>();
        if (config.get<boolean>('enableEvalCheck', true)) { enabled.add('eval-usage'); }
        if (config.get<boolean>('enableJwtCheck', true)) { enabled.add('jwt-no-expiry'); }
        if (config.get<boolean>('enableCorsCheck', true)) { enabled.add('cors-wildcard'); }
        if (config.get<boolean>('enableSecretCheck', true)) { enabled.add('hardcoded-secret'); }
        return enabled;
    }

    function updateDiagnostics(document: vscode.TextDocument): void {
        if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
            return;
        }
        const issues = scanDocument(document, getEnabledChecks());
        diagnostics.set(document.uri, issues);
    }

    // Scan on open, save, change, and editor switch
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
        vscode.workspace.onDidSaveTextDocument(updateDiagnostics),
        vscode.workspace.onDidChangeTextDocument((event) =>
            updateDiagnostics(event.document)
        ),
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                updateDiagnostics(editor.document);
            }
        }),
        vscode.workspace.onDidCloseTextDocument((document) =>
            diagnostics.delete(document.uri)
        )
    );

    // Re-scan all open files when settings change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('securecode')) {
                vscode.workspace.textDocuments.forEach((doc) => updateDiagnostics(doc));
            }
        })
    );

    // Register Quick Fix provider
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            SUPPORTED_LANGUAGES,
            new SecureCodeFixes(),
            {
                providedCodeActionKinds: SecureCodeFixes.providedCodeActionKinds
            }
        )
    );

    // Command: scan current file on demand
    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.scanCurrentFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor to scan.');
                return;
            }
            updateDiagnostics(editor.document);
            const count = scanDocument(editor.document, getEnabledChecks()).length;
            if (count === 0) {
                vscode.window.showInformationMessage(
                    'SecureCode Review: No issues found.'
                );
            } else {
                vscode.window.showWarningMessage(
                    `SecureCode Review: ${count} issue(s) found.`
                );
            }
        })
    );

    // Command: hello world (verify installation)
    context.subscriptions.push(
        vscode.commands.registerCommand('securecode.helloWorld', () => {
            vscode.window.showInformationMessage('SecureCode Review is active!');
        })
    );

    // Initial scan on activation
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document);
    }
}

export function deactivate() {}