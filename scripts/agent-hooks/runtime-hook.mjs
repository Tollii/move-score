#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const runnerPath = resolve(__dirname, 'runner.mjs');

function readStdin() {
	return new Promise((resolveStdin, rejectStdin) => {
		let data = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (chunk) => {
			data += chunk;
		});
		process.stdin.on('end', () => resolveStdin(data));
		process.stdin.on('error', rejectStdin);
	});
}

function unique(items) {
	return [...new Set(items.filter(Boolean))];
}

function collectFilePaths(value, collector = []) {
	if (!value || typeof value !== 'object') {
		return collector;
	}

	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry === 'string') {
			if (
				key === 'file_path' ||
				key === 'filePath' ||
				key === 'path' ||
				key === 'target_file' ||
				key === 'targetFile'
			) {
				collector.push(entry);
			}
		} else if (Array.isArray(entry)) {
			if (key === 'file_paths' || key === 'filePaths' || key === 'paths') {
				for (const item of entry) {
					if (typeof item === 'string') collector.push(item);
				}
			}
			for (const item of entry) {
				if (item && typeof item === 'object') collectFilePaths(item, collector);
			}
		} else if (entry && typeof entry === 'object') {
			collectFilePaths(entry, collector);
		}
	}

	return collector;
}

function extractCommand(toolInput) {
	if (!toolInput || typeof toolInput !== 'object') return null;
	if (typeof toolInput.command === 'string') return toolInput.command;
	if (typeof toolInput.cmd === 'string') return toolInput.cmd;
	return null;
}

function isDangerousRootDelete(command) {
	return /rm\s+-rf\s+\/(?:\s|$)/.test(command) || /Remove-Item\s+.*-Recurse\s+\//i.test(command);
}

async function runRunner(args, cwd) {
	const { stdout } = await execFileAsync(process.execPath, [runnerPath, ...args], {
		cwd: cwd || projectRoot
	});
	return JSON.parse(stdout);
}

function buildPostEditContext(result) {
	const parts = [];

	const formatAction = result.actions?.find((action) => action.action === 'format');
	if (formatAction?.status === 'error' && formatAction.output) {
		parts.push(`Formatting failed:\n${formatAction.output}`);
	}

	const lintAction = result.actions?.find((action) => action.action === 'lint');
	if (lintAction?.status === 'error' && lintAction.output) {
		parts.push(`Lint issues after edit:\n${lintAction.output}`);
	}

	const codegenAction = result.actions?.find((action) => action.action === 'convex_codegen');
	if (codegenAction?.status === 'recommended' && codegenAction.reason) {
		parts.push(codegenAction.reason);
	}

	return parts.join('\n\n');
}

function emitJson(payload) {
	process.stdout.write(`${JSON.stringify(payload)}\n`);
}

try {
	const rawInput = await readStdin();
	const input = rawInput.trim() ? JSON.parse(rawInput) : {};
	const hookEventName = input.hook_event_name;
	const cwd = typeof input.cwd === 'string' ? input.cwd : projectRoot;
	const toolInput = input.tool_input ?? {};

	if (hookEventName === 'PreToolUse') {
		const command = extractCommand(toolInput);
		if (command && isDangerousRootDelete(command)) {
			const reason = 'Destructive root-delete command blocked by move-score hook.';
			emitJson({
				hookSpecificOutput: {
					hookEventName: 'PreToolUse',
					permissionDecision: 'deny',
					permissionDecisionReason: reason
				}
			});
		}
		process.exit(0);
	}

	if (hookEventName === 'PostToolUse') {
		const files = unique(collectFilePaths(toolInput));
		if (files.length === 0) {
			process.exit(0);
		}

		const result = await runRunner(
			['--event', 'post-edit', '--files', files.join(','), '--cwd', cwd],
			cwd
		);
		const additionalContext = buildPostEditContext(result);

		if (additionalContext) {
			emitJson({
				hookSpecificOutput: {
					hookEventName: 'PostToolUse',
					additionalContext
				}
			});
		}
		process.exit(0);
	}

	process.exit(0);
} catch (error) {
	process.stderr.write(
		`move-score runtime hook failed: ${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exit(0);
}
