import fs from 'node:fs';

function printHelp(): void {
	console.log(`HisDeck

Usage:
	hisdeck [options]
	hisdeck init

Options:
	--help, -h         Show help
	--version, -v      Show version
	--config <path>    Use a custom config file
	--reset            Force setup wizard
	--no-ai            Disable AI (offline mode)
`);
}

function readVersion(): string {
	try {
		const pkgUrl = new URL('../package.json', import.meta.url);
		const raw = fs.readFileSync(pkgUrl, 'utf8');
		const pkg = JSON.parse(raw) as { version?: string };
		return pkg.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
	printHelp();
	process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
	console.log(readVersion());
	process.exit(0);
}

if (args[0] === 'init') {
	process.env.HISDECK_FORCE_SETUP = '1';
}

for (let index = 0; index < args.length; index += 1) {
	const arg = args[index];
	if (arg === '--config') {
		const next = args[index + 1];
		if (!next) {
			console.error('Missing path after --config');
			process.exit(1);
		}
		process.env.HISDECK_CONFIG_PATH = next;
		index += 1;
	}

	if (arg === '--reset') {
		process.env.HISDECK_FORCE_SETUP = '1';
	}

	if (arg === '--no-ai') {
		process.env.HISDECK_NO_AI = '1';
	}
}

import './app.js';
