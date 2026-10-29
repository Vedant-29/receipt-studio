import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const platform = process.platform;

export const revealLabel =
	platform === 'darwin' ? 'Show in Finder' : platform === 'win32' ? 'Show in Explorer' : 'Show in folder';

export async function openPath(path: string): Promise<void> {
	if (platform === 'darwin') await run('open', [path]);
	else if (platform === 'win32') await run('explorer', [path]).catch(() => {}); // explorer exits 1 on success
	else await run('xdg-open', [path]);
}

export async function revealPath(path: string): Promise<void> {
	if (platform === 'darwin') await run('open', ['-R', path]);
	else if (platform === 'win32') await run('explorer', [`/select,${path}`]).catch(() => {});
	else await run('xdg-open', [dirname(path)]);
}

async function hasCommand(cmd: string): Promise<boolean> {
	try {
		await run('which', [cmd]);
		return true;
	} catch {
		return false;
	}
}

let chooser: Promise<boolean> | undefined;

/** Whether this machine can show a native "choose folder" dialog */
export function canChooseFolder(): Promise<boolean> {
	chooser ??= platform === 'darwin' || platform === 'win32' ? Promise.resolve(true) : hasCommand('zenity');
	return chooser;
}

/** Shows the system folder picker. Resolves to null when cancelled. */
export async function chooseFolder(start: string): Promise<string | null> {
	const from = existsSync(start) ? start : homedir();
	try {
		if (platform === 'darwin') {
			const script = `POSIX path of (choose folder with prompt "Save receipts to" default location (POSIX file "${from.replace(/["\\]/g, '\\$&')}"))`;
			const { stdout } = await run('osascript', ['-e', 'tell me to activate', '-e', script]);
			return stdout.trim().replace(/\/$/, '') || null;
		}
		if (platform === 'win32') {
			const ps =
				'Add-Type -AssemblyName System.Windows.Forms;' +
				'$d = New-Object System.Windows.Forms.FolderBrowserDialog;' +
				`$d.SelectedPath = '${from.replace(/'/g, "''")}';` +
				"if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }";
			const { stdout } = await run('powershell', ['-NoProfile', '-Command', ps]);
			return stdout.trim() || null;
		}
		const { stdout } = await run('zenity', ['--file-selection', '--directory', `--filename=${from}/`]);
		return stdout.trim() || null;
	} catch (err) {
		// Every picker exits non-zero when the user cancels
		const e = err as { code?: number; stderr?: string };
		if (e.code === 1 || /cancel|-128/i.test(e.stderr ?? '')) return null;
		throw err;
	}
}
