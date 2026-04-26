/**
 * move-score Copilot CLI extension
 *
 * Registers custom tools and lifecycle hooks for deterministic agent workflows.
 * Shared logic lives in scripts/agent-hooks/runner.mjs — this file is a thin adapter.
 */

import { execFile } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { joinSession } from '@github/copilot-sdk/extension';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../../..');
const runnerPath = resolve(projectRoot, 'scripts/agent-hooks/runner.mjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Invoke the shared hook runner.
 * @param {string[]} extraArgs
 * @returns {Promise<object>}
 */
async function runHookRunner(extraArgs) {
	try {
		const { stdout } = await execFileAsync(process.execPath, [runnerPath, ...extraArgs], {
			cwd: projectRoot
		});
		return JSON.parse(stdout);
	} catch (err) {
		const e = /** @type {any} */ (err);
		try {
			return JSON.parse(e.stdout ?? '{}');
		} catch {
			return { error: e.message ?? String(err) };
		}
	}
}

/**
 * Run a pnpm script and return { ok, output }.
 * @param {string} script
 * @param {string[]} [extraArgs]
 */
async function pnpmRun(script, extraArgs = []) {
	try {
		const { stdout, stderr } = await execFileAsync('pnpm', ['run', script, ...extraArgs], {
			cwd: projectRoot
		});
		return { ok: true, output: (stdout + stderr).trim() };
	} catch (err) {
		const e = /** @type {any} */ (err);
		return { ok: false, output: ((e.stdout ?? '') + (e.stderr ?? e.message ?? '')).trim() };
	}
}

// ─── Debounce state for post-edit hooks ──────────────────────────────────────

/** @type {Map<string, number>} filePath → last processed timestamp (ms) */
const editDebounce = new Map();
const DEBOUNCE_MS = 2000;

function shouldDebounce(filePath) {
	const last = editDebounce.get(filePath);
	if (last && Date.now() - last < DEBOUNCE_MS) return true;
	editDebounce.set(filePath, Date.now());
	return false;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const tools = [
	{
		name: 'move_score_validate',
		description:
			'Run the full project validation suite: TypeScript check (svelte-check) and lint (prettier + eslint). Returns pass/fail and any diagnostics.',
		parameters: {
			type: 'object',
			properties: {
				scope: {
					type: 'string',
					enum: ['check', 'lint', 'full'],
					description:
						'"check" = TypeScript only, "lint" = prettier+eslint only, "full" = both (default)'
				}
			},
			required: []
		},
		handler: async (args) => {
			const scope = args.scope ?? 'full';
			const script = scope === 'check' ? 'check' : scope === 'lint' ? 'lint' : 'validate';
			const r = await pnpmRun(script);
			return r.ok ? `✓ ${script} passed` : `✗ ${script} failed:\n${r.output}`;
		}
	},
	{
		name: 'move_score_format_files',
		description:
			'Run prettier --write on specific files. Prefer this over running prettier on the whole repo.',
		parameters: {
			type: 'object',
			properties: {
				files: {
					type: 'array',
					items: { type: 'string' },
					description: 'Absolute or project-relative file paths to format'
				}
			},
			required: ['files']
		},
		handler: async (args) => {
			if (!args.files?.length) return 'No files provided.';
			const r = await runHookRunner([
				'--event',
				'post-edit',
				'--files',
				args.files.join(','),
				'--cwd',
				projectRoot
			]);
			const fmt = r.actions?.find((a) => a.action === 'format');
			if (!fmt) return 'No formattable files found.';
			return fmt.status === 'ok'
				? `✓ Formatted ${args.files.length} file(s)`
				: `✗ Format error: ${fmt.output ?? ''}`;
		}
	},
	{
		name: 'move_score_convex_codegen',
		description:
			'Run `convex codegen` to regenerate TypeScript types from the Convex schema. Run this after editing any file in src/convex/ or convex/ or convex.json.',
		parameters: { type: 'object', properties: {}, required: [] },
		handler: async () => {
			const r = await pnpmRun('convex:codegen');
			return r.ok ? '✓ convex codegen complete' : `✗ convex codegen failed:\n${r.output}`;
		}
	},
	{
		name: 'move_score_git_status',
		description:
			'Return a compact git status and diff summary (git status --short + git diff --stat HEAD). Use before committing or to understand the working tree state.',
		parameters: { type: 'object', properties: {}, required: [] },
		handler: async () => {
			const r = await runHookRunner(['--event', 'summarize-diff', '--cwd', projectRoot]);
			if (r.error) return `git error: ${r.error}`;
			const parts = [];
			if (r.status) parts.push(`Status:\n${r.status}`);
			if (r.diff_stat) parts.push(`Diff stat:\n${r.diff_stat}`);
			return parts.join('\n\n') || '(clean working tree)';
		}
	},
	{
		name: 'move_score_categorize_files',
		description:
			'Classify a list of file paths into convex, ui, config, generated, and ignored categories. Useful before deciding which post-edit actions to run.',
		parameters: {
			type: 'object',
			properties: {
				files: {
					type: 'array',
					items: { type: 'string' },
					description: 'File paths to classify (absolute or project-relative)'
				}
			},
			required: ['files']
		},
		handler: async (args) => {
			if (!args.files?.length) return 'No files provided.';
			const r = await runHookRunner([
				'--event',
				'post-edit',
				'--files',
				args.files.join(','),
				'--cwd',
				projectRoot,
				'--no-format',
				'--dry-run'
			]);
			if (r.error) return `Error: ${r.error}`;
			return JSON.stringify(r.files, null, 2);
		}
	}
];

// ─── Session ──────────────────────────────────────────────────────────────────

await joinSession({
	tools,
	hooks: {
		onSessionStart: async () => {
			return {
				additionalContext: [
					'move-score agent tools are active. Prefer these custom tools over raw shell commands:',
					'• move_score_validate(scope?)         — TypeScript check + lint',
					'• move_score_format_files(files)      — prettier --write scoped to specific files',
					'• move_score_convex_codegen()         — regenerate Convex types (run after any src/convex/ edit)',
					'• move_score_git_status()             — compact working-tree summary',
					'• move_score_categorize_files(files)  — classify files by area (convex/ui/config/generated)',
					'',
					'package.json stable scripts: lint:eslint, lint:prettier, lint:file, format:file, validate, validate:build, convex:codegen',
					'After editing src/convex/** or convex/** or convex.json, always run convex_codegen.'
				].join('\n')
			};
		},

		onPreToolUse: async (input) => {
			if (input.toolName === 'bash') {
				const cmd = String(input.toolArgs?.command ?? '');
				// Narrow deny: only truly destructive root-targeting patterns
				if (/rm\s+-rf\s+\/(?:\s|$)/.test(cmd) || /Remove-Item\s+.*-Recurse\s+\//i.test(cmd)) {
					return {
						permissionDecision: 'deny',
						permissionDecisionReason: 'Destructive root-delete commands are not allowed.'
					};
				}
			}
			return { permissionDecision: 'allow' };
		},

		onPostToolUse: async (input) => {
			if (input.toolName !== 'edit' && input.toolName !== 'create') return;
			const filePath = String(input.toolArgs?.path ?? '');
			if (!filePath) return;

			// Debounce repeated edits to the same file
			if (shouldDebounce(filePath)) return;

			const r = await runHookRunner([
				'--event',
				'post-edit',
				'--files',
				filePath,
				'--cwd',
				projectRoot
			]);
			if (r.error) return;

			const parts = [];

			const lintAction = r.actions?.find((a) => a.action === 'lint');
			if (lintAction?.status === 'error' && lintAction.output) {
				parts.push(`Lint issues in ${relative(projectRoot, filePath)}:\n${lintAction.output}`);
			}

			const codegenAction = r.actions?.find((a) => a.action === 'convex_codegen');
			if (codegenAction?.status === 'recommended') {
				parts.push(codegenAction.reason);
			}

			if (parts.length > 0) {
				return { additionalContext: parts.join('\n\n') };
			}
		}
	}
});
