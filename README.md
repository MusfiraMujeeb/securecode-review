# SecureCode Review

A VS Code extension that detects JavaScript/TypeScript security anti-patterns as you type, with one-click Quick Fixes.

## What It Does

SecureCode Review scans `.js`, `.ts`, `.jsx`, and `.tsx` files for common OWASP-aligned security anti-patterns and surfaces them as inline diagnostics:

| Check | Severity | Description |
|---|---|---|
| `eval()` usage | Error | Arbitrary code execution risk |
| JWT without expiry | Warning | Tokens never expire |
| CORS wildcard | Warning | `cors()` with no origin restriction |
| Hardcoded secrets | Error | Plaintext passwords, API keys, tokens |

Each finding includes a **Quick Fix** (lightbulb 💡) that inserts the correct code with one click.

## Why This Exists

Most security issues are caught after deployment — by scanners, or worse, by attackers. SecureCode Review moves that feedback into the developer's editor, where fixes cost seconds instead of days.

It's the IDE-layer companion to [StackGuard](https://github.com/MusfiraMujeeb/stackguard), a runtime HTTP header scanner.

## Usage

Open any JavaScript or TypeScript file. Findings appear automatically with red/yellow underlines.

- **Hover** over a finding to read the message
- **Click the lightbulb** (or press `Ctrl + .`) to apply the suggested fix
- **Run manually:** `Ctrl + Shift + P` → `SecureCode: Scan Current File`

## Configuration

(Coming soon) Toggle individual checks on or off via VS Code settings.

## Feedback

Found a bug or want a new check? Open an issue:
https://github.com/MusfiraMujeeb/securecode-review/issues

## License

MIT

## Privacy

SecureCode Review runs entirely locally within the VS Code extension host.

- **No telemetry** — the extension does not collect or transmit usage statistics
- **No network requests** — source code never leaves your machine
- **No data storage** — no files are written outside the editor's in-memory diagnostics
- **No analytics or tracking** — nothing is logged, reported, or shared

All security analysis happens in-process, using only the content of files you
have open in your workspace. The extension only modifies code when you
explicitly accept a Quick Fix.
