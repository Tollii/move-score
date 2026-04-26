#!/usr/bin/env node
/**
 * move-score shared agent hook runner
 *
 * Usage:
 *   node scripts/agent-hooks/runner.mjs --event post-edit --files src/foo.ts,src/bar.svelte
 *   node scripts/agent-hooks/runner.mjs --event summarize-diff
 *   node scripts/agent-hooks/runner.mjs --event pre-command --command "pnpm build"
 *
 * Flags:
 *   --event          post-edit | pre-command | summarize-diff
 *   --files          comma-separated relative file paths
 *   --cwd            working directory (defaults to process.cwd())
 *   --no-format      disable prettier auto-write (format is on by default)
 *   --dry-run        classify and report without executing side-effecting commands
 *   --command        command string (for pre-command event)
 *
 * Outputs: JSON to stdout. Diagnostics and errors go to stderr.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');

// ─── File classification ─────────────────────────────────────────────────────

const GENERATED_RE = [/src[/\\]convex[/\\]_generated[/\\]/, /convex[/\\]_generated[/\\]/];

const IGNORED_RE = [
	/node_modules[/\\]/,
	/\.svelte-kit[/\\]/,
	/build[/\\]/,
	/\.vercel[/\\]/,
	/\.git[/\\]/
];

const CONVEX_RE = [/^src[/\\]convex[/\\]/, /^convex[/\\]/, /^convex\.json$/];
const CONFIG_RE = [
	/^package\.json$/,
	/^tsconfig\.json$/,
	/^svelte\.config\.js$/,
	/^vite\.config\.(js|ts)$/,
	/^eslint\.config\.js$/,
	/^components\.json$/,
	/^\.prettierrc$/,
	/^\.prettierignore$/,
	/^convex\.json$/
];

const LINTABLE_RE = /\.(ts|js|mjs|cjs|svelte|tsx|jsx)$/;

/** @param {string} relPath */
function classifyFile(relPath) {
	const norm = relPath.replace(/\\/g, '/');
	if (IGNORED_RE.some((r) => r.test(norm))) return 'ignored';
	if (GENERATED_RE.some((r) => r.test(norm))) return 'generated';
	if (CONVEX_RE.some((r) => r.test(norm))) return 'convex';
	if (CONFIG_RE.some((r) => r.test(norm))) return 'config';
	return 'ui';
}

/** @param {string} relPath */
function isLintable(relPath) {
	return LINTABLE_RE.test(relPath);
}

// ─── Command helpers ──────────────────────────────────────────────────────────

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ok: boolean, stdout: string, stderr: string}>}
 */
async function runBin(bin, args, cwd) {
	try {
		const { stdout, stderr } = await execFileAsync(bin, args, { cwd });
		return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
	} catch (err) {
		const e = /** @type {any} */ (err);
		return {
			ok: false,
			stdout: (e.stdout ?? '').trim(),
			stderr: (e.stderr ?? e.message ?? '').trim()
		};
	}
}

const prettierBin = resolve(projectRoot, 'node_modules/.bin/prettier');
const eslintBin = resolve(projectRoot, 'node_modules/.bin/eslint');
const gitBin = 'git';

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * @param {string[]} files absolute or relative paths
 * @param {string} cwd
 * @param {{autoFormat: boolean, dryRun: boolean}} opts
 */
async function handlePostEdit(files, cwd, opts) {
	const classified = { convex: [], ui: [], config: [], generated: [], ignored: [] };
	const actionable = [];

	for (const f of files) {
		const abs = resolve(cwd, f);
		if (!existsSync(abs)) continue;
		const rel = relative(projectRoot, abs);
		const category = classifyFile(rel);
		if (classified[category]) {
			classified[category].push(rel);
		} else {
			classified.ui.push(rel);
		}
		if (category !== 'ignored' && category !== 'generated') {
			actionable.push({ abs, rel, category });
		}
	}

	const actions = [];
	const formatTargets = actionable.map((f) => f.abs);
	const lintTargets = actionable.filter((f) => isLintable(f.rel)).map((f) => f.abs);
	const hasConvex = classified.convex.length > 0;

	// Format
	if (formatTargets.length > 0) {
		if (opts.dryRun) {
			actions.push({
				action: 'format',
				files: formatTargets,
				status: 'skipped',
				reason: 'dry-run'
			});
		} else if (opts.autoFormat) {
			const r = await runBin(prettierBin, ['--write', ...formatTargets], projectRoot);
			actions.push({
				action: 'format',
				files: formatTargets,
				status: r.ok ? 'ok' : 'error',
				output: r.ok ? '' : r.stderr || r.stdout
			});
		} else {
			actions.push({
				action: 'format',
				files: formatTargets,
				status: 'skipped',
				reason: 'no-format'
			});
		}
	}

	// Lint
	if (lintTargets.length > 0) {
		const r = await runBin(eslintBin, lintTargets, projectRoot);
		const output = (r.stdout + (r.stderr ? '\n' + r.stderr : '')).trim();
		actions.push({
			action: 'lint',
			files: lintTargets,
			status: r.ok ? 'ok' : 'error',
			output: r.ok ? '' : output
		});
	}

	// Convex codegen recommendation
	if (hasConvex) {
		if (opts.dryRun) {
			actions.push({ action: 'convex_codegen', status: 'recommended', reason: 'dry-run' });
		} else {
			actions.push({
				action: 'convex_codegen',
				status: 'recommended',
				reason: 'convex files changed — run: pnpm run convex:codegen'
			});
		}
	}

	return { event: 'post-edit', files: classified, actions };
}

/**
 * @param {string} command
 */
async function handlePreCommand(command) {
	const safe = /^(pnpm|npm|node|git|prettier|eslint|svelte-check)\b/.test(command.trimStart());
	return {
		event: 'pre-command',
		command,
		safe,
		recommendation: safe ? null : 'Verify command before running'
	};
}

async function handleSummarizeDiff(cwd) {
	const stat = await runBin(gitBin, ['diff', '--stat', 'HEAD'], cwd);
	const status = await runBin(gitBin, ['status', '--short'], cwd);
	return {
		event: 'summarize-diff',
		diff_stat: stat.stdout,
		status: status.stdout
	};
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name) {
	const i = args.indexOf(name);
	if (i === -1) return undefined;
	return args[i + 1];
}

function hasFlag(name) {
	return args.includes(name);
}

const event = flag('--event') ?? 'post-edit';
const cwd = flag('--cwd') ?? process.cwd();
const rawFiles = flag('--files');
const command = flag('--command') ?? '';
const dryRun = hasFlag('--dry-run');
const autoFormat = !hasFlag('--no-format');

const files = rawFiles ? rawFiles.split(',').filter(Boolean) : [];

let result;
try {
	if (event === 'post-edit') {
		result = await handlePostEdit(files, cwd, { autoFormat, dryRun });
	} else if (event === 'pre-command') {
		result = await handlePreCommand(command);
	} else if (event === 'summarize-diff') {
		result = await handleSummarizeDiff(cwd);
	} else {
		result = { error: `unknown event: ${event}` };
	}
} catch (err) {
	process.stderr.write(`runner error: ${err.message}\n`);
	result = { error: err.message };
}

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(result.error ? 1 : 0);
