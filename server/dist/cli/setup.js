/**
 * `rethinksoft-browser setup` â€” auto-detect AI agents and inject MCP config.
 *
 * Scans the machine for Claude Code, Cursor, Windsurf, and Claude Desktop,
 * then merges the RethinkSoft MCP server entry into each agent's config file.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { randomUUID } from 'crypto';
import { isRelayRunning } from '../relay/auto-start.js';
import { WebSocketClient } from '../ipc/websocket-client.js';
// â”€â”€ Style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const c = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
const y1 = '\x1b[38;5;178m', y2 = '\x1b[38;5;214m', y3 = '\x1b[38;5;220m', y4 = '\x1b[38;5;221m', y5 = '\x1b[38;5;222m', rs = '\x1b[0m';
const BANNER = `
  ${y1}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y2} â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ${rs} ${y3}â–ˆâ–ˆâ–ˆ  â–ˆâ–ˆ${rs} ${y4}â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ${rs} ${y5}â–ˆâ–ˆ${rs}
  ${y1}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y2}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y3}â–ˆâ–ˆâ–ˆâ–ˆ â–ˆâ–ˆ${rs} ${y4}   â–ˆâ–ˆ   ${rs} ${y5}â–ˆâ–ˆ${rs}
  ${y1}â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ${rs} ${y2}â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ${rs} ${y3}â–ˆâ–ˆ â–ˆâ–ˆâ–ˆâ–ˆ${rs} ${y4}  â–ˆâ–ˆ    ${rs} ${y5}â–ˆâ–ˆ${rs}
  ${y1}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y2}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y3}â–ˆâ–ˆ  â–ˆâ–ˆâ–ˆ${rs} ${y4} â–ˆâ–ˆ     ${rs} ${y5}â–ˆâ–ˆ${rs}
  ${y1}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y2}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y3}â–ˆâ–ˆ   â–ˆâ–ˆ${rs} ${y4}â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ${rs} ${y5}â–ˆâ–ˆ${rs}
  ${c.dim('browser automation for your ai agent')}
`;
const SPINNER_FRAMES = ['â ‹', 'â ™', 'â ¹', 'â ¸', 'â ¼', 'â ´', 'â ¦', 'â §', 'â ‡', 'â '];
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
// Plain log for non-interactive mode (no ANSI, no spinners)
function log(msg) {
    // Strip ANSI codes for clean output
    const clean = msg.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(clean);
}
function spinner(text, isInteractive = true) {
    if (!isInteractive) {
        log(`  ...  ${text}`);
        return { stop: (final) => log(`  ${final}`) };
    }
    let i = 0;
    const id = setInterval(() => {
        process.stdout.write(`\r  ${c.cyan(SPINNER_FRAMES[i++ % SPINNER_FRAMES.length])}  ${text}`);
    }, 80);
    return {
        stop: (final) => {
            clearInterval(id);
            process.stdout.write(`\r  ${final}\x1b[K\n`);
        },
    };
}
// â”€â”€ MCP config payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MCP_ENTRY = {
    command: 'npx',
    args: ['-y', 'rethinksoft-in-chrome'],
};
// â”€â”€ Agent registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getAgentRegistry() {
    const home = homedir();
    const plat = platform();
    return [
        {
            name: 'Claude Code',
            slug: 'claude-code',
            method: 'cli-command',
            cliCommand: 'claude mcp add browser -- npx -y rethinksoft-in-chrome',
            detect: () => {
                try {
                    execSync('which claude', { stdio: 'ignore' });
                    return true;
                }
                catch {
                    return false;
                }
            },
        },
        {
            name: 'Cursor',
            slug: 'cursor',
            method: 'json-merge',
            configPath: () => join(home, '.cursor', 'mcp.json'),
            detect: () => existsSync(join(home, '.cursor')),
        },
        {
            name: 'Windsurf',
            slug: 'windsurf',
            method: 'json-merge',
            configPath: () => join(home, '.codeium', 'windsurf', 'mcp_config.json'),
            detect: () => existsSync(join(home, '.codeium', 'windsurf')),
        },
        {
            name: 'Claude Desktop',
            slug: 'claude-desktop',
            method: 'json-merge',
            configPath: () => {
                if (plat === 'darwin')
                    return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
                if (plat === 'win32')
                    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
                return join(home, '.config', 'Claude', 'claude_desktop_config.json');
            },
            detect: () => {
                if (plat === 'darwin')
                    return existsSync(join(home, 'Library', 'Application Support', 'Claude'));
                if (plat === 'win32')
                    return existsSync(join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude'));
                return existsSync(join(home, '.config', 'Claude'));
            },
        },
    ];
}
// â”€â”€ JSON merge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function stripJsonComments(text) {
    return text
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
}
function mergeJsonConfig(configPath) {
    const agentName = configPath;
    try {
        if (!existsSync(configPath)) {
            mkdirSync(join(configPath, '..'), { recursive: true });
            const config = { mcpServers: { browser: MCP_ENTRY } };
            writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
            return { agent: agentName, status: 'configured', detail: `created ${configPath}` };
        }
        const raw = readFileSync(configPath, 'utf-8');
        let config;
        try {
            config = JSON.parse(raw);
        }
        catch {
            try {
                config = JSON.parse(stripJsonComments(raw));
            }
            catch {
                const bakPath = configPath + '.bak';
                copyFileSync(configPath, bakPath);
                config = { mcpServers: { browser: MCP_ENTRY } };
                writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
                return { agent: agentName, status: 'configured', detail: `backed up malformed config to ${bakPath}` };
            }
        }
        if (config.mcpServers?.browser) {
            const existing = config.mcpServers.browser;
            if (existing.command === MCP_ENTRY.command && JSON.stringify(existing.args) === JSON.stringify(MCP_ENTRY.args)) {
                return { agent: agentName, status: 'already-configured', detail: configPath };
            }
        }
        if (!config.mcpServers)
            config.mcpServers = {};
        config.mcpServers.browser = MCP_ENTRY;
        writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
        return { agent: agentName, status: 'configured', detail: `merged into ${configPath}` };
    }
    catch (err) {
        if (err.code === 'EACCES' || err.code === 'EPERM') {
            return { agent: agentName, status: 'error', detail: `permission denied: ${configPath}` };
        }
        return { agent: agentName, status: 'error', detail: err.message };
    }
}
function runClaudeCodeSetup() {
    try {
        const output = execSync('claude mcp add browser -- npx -y rethinksoft-in-chrome', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000,
        });
        if (output.toLowerCase().includes('already') || output.toLowerCase().includes('exists')) {
            return { agent: 'Claude Code', status: 'already-configured', detail: 'claude mcp add' };
        }
        return { agent: 'Claude Code', status: 'configured', detail: 'ran: claude mcp add browser' };
    }
    catch (err) {
        const stderr = err.stderr?.toString() || '';
        if (stderr.toLowerCase().includes('already') || stderr.toLowerCase().includes('exists')) {
            return { agent: 'Claude Code', status: 'already-configured', detail: 'claude mcp add' };
        }
        return { agent: 'Claude Code', status: 'error', detail: err.message };
    }
}
// â”€â”€ Browser detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EXTENSION_URL = 'https://chromewebstore.google.com/detail/rethinksoft-in-chrome/iklpkemlmbhemkiojndpbhoakgikpmcd';
const BROWSERS = [
    { name: 'Google Chrome', slug: 'chrome', macApp: 'Google Chrome', linuxBin: 'google-chrome' },
    { name: 'Brave', slug: 'brave', macApp: 'Brave Browser', linuxBin: 'brave-browser' },
    { name: 'Microsoft Edge', slug: 'edge', macApp: 'Microsoft Edge', linuxBin: 'microsoft-edge' },
    { name: 'Arc', slug: 'arc', macApp: 'Arc', linuxBin: 'arc' },
    { name: 'Chromium', slug: 'chromium', macApp: 'Chromium', linuxBin: 'chromium-browser' },
];
function detectBrowsers() {
    const plat = platform();
    return BROWSERS.filter(b => {
        if (plat === 'darwin') {
            return existsSync(`/Applications/${b.macApp}.app`);
        }
        try {
            execSync(`which ${b.linuxBin}`, { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    });
}
function openInBrowser(browser, url) {
    const plat = platform();
    try {
        if (plat === 'darwin') {
            execSync(`open -a "${browser.macApp}" "${url}"`, { stdio: 'ignore' });
        }
        else {
            execSync(`${browser.linuxBin} "${url}" &`, { stdio: 'ignore' });
        }
    }
    catch {
        // Fallback: system default
        execSync(`open "${url}" 2>/dev/null || xdg-open "${url}" 2>/dev/null`, { stdio: 'ignore' });
    }
}
async function ensureExtension(isInteractive) {
    // Already connected?
    if (await isRelayRunning())
        return true;
    // Detect browsers
    const browsers = detectBrowsers();
    if (browsers.length === 0) {
        const msg = `No Chromium browser found. Install the extension manually: ${EXTENSION_URL}`;
        isInteractive
            ? console.log(`  ${c.yellow('â—')}  ${msg}\n`)
            : log(`  â—  ${msg}`);
        return false;
    }
    // Pick browser â€” auto-select first in non-interactive mode
    let browser;
    if (!isInteractive || browsers.length === 1) {
        browser = browsers[0];
        isInteractive
            ? console.log(`  ${c.green('âœ“')}  Found ${c.bold(browser.name)}`)
            : log(`  âœ“  Found ${browser.name}`);
    }
    else {
        console.log(`  ${c.green('âœ“')}  Found ${c.bold(String(browsers.length))} browsers\n`);
        browsers.forEach((b, i) => {
            console.log(`     ${c.bold(String(i + 1))}  ${b.name}`);
        });
        console.log('');
        const rl = (await import('readline')).createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve => {
            rl.question(`  ${c.cyan('?')}  Which browser has your logins? (1-${browsers.length}): `, resolve);
        });
        rl.close();
        const idx = parseInt(answer) - 1;
        browser = browsers[idx] || browsers[0];
    }
    // Open Chrome Web Store
    const openMsg = `Opening Chrome Web Store in ${browser.name}...`;
    isInteractive ? console.log(`\n     ${openMsg}\n`) : log(`     ${openMsg}`);
    openInBrowser(browser, EXTENSION_URL);
    // Poll for extension
    const sp = spinner('Waiting for extension to connect...', isInteractive);
    for (let i = 0; i < 90; i++) { // 3 minutes max
        await sleep(2000);
        if (await isRelayRunning()) {
            sp.stop(`${c.green('âœ“')}  Extension ${c.green('connected')}`);
            return true;
        }
    }
    sp.stop(`${c.yellow('â—')}  Timed out waiting for extension`);
    isInteractive
        ? console.log(`     ${c.dim('Install the extension, then run setup again.')}`)
        : log('     Install the extension, then run setup again.');
    return false;
}
// â”€â”€ Readline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let rl = null;
function ask(prompt) {
    if (!rl)
        rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(`  ${c.cyan('?')}  ${prompt}`, answer => resolve(answer.trim()));
    });
}
// â”€â”€ Relay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let relay = null;
async function connectRelay() {
    if (!(await isRelayRunning()))
        return false;
    try {
        const origError = console.error;
        console.error = () => { };
        relay = new WebSocketClient({
            role: 'cli',
            autoStartRelay: false,
            onDisconnect: () => { relay = null; },
        });
        relay.onMessage(() => { });
        await relay.connect();
        console.error = origError;
        return true;
    }
    catch {
        console.error = console.__proto__.error;
        relay = null;
        return false;
    }
}
async function sendToExtension(type, payload) {
    if (!relay?.isConnected())
        return false;
    try {
        await relay.send({ type: `mcp_${type}`, requestId: randomUUID().slice(0, 8), ...payload });
        await sleep(300);
        return true;
    }
    catch {
        return false;
    }
}
// â”€â”€ Credential setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function detectCredentialSources() {
    const home = homedir();
    const found = [];
    const claudePath = join(home, '.claude', '.credentials.json');
    if (existsSync(claudePath))
        found.push({ name: 'Claude Code', slug: 'claude', path: claudePath });
    const codexPath = join(home, '.codex', 'auth.json');
    if (existsSync(codexPath))
        found.push({ name: 'Codex CLI', slug: 'codex', path: codexPath });
    return found;
}
async function promptCredentials() {
    console.log('');
    console.log(`  ${c.dim('step 3')}  ${c.bold('Credentials')}`);
    console.log(`  ${c.dim('       Connect a model source so the extension can run browser tasks.')}\n`);
    const skip = await ask('Set up credentials now? Press enter to skip. (y/N): ');
    if (skip.toLowerCase() !== 'y') {
        console.log(`\n  ${c.dim('â—‹')}  ${c.dim('Skipped â€” set up later in the Chrome extension.')}`);
        return;
    }
    // Connect relay for syncing
    await connectRelay();
    // Auto-detect
    const sources = detectCredentialSources();
    if (sources.length > 0) {
        console.log('');
        for (const source of sources) {
            console.log(`     ${c.green('âœ“')}  Found ${source.name} credentials ${c.dim(source.path)}`);
        }
        for (const source of sources) {
            console.log('');
            const answer = await ask(`Import ${source.name}? (Y/n): `);
            if (answer.toLowerCase() !== 'n') {
                const sp = spinner(`Importing ${source.name}...`);
                const sent = await sendToExtension('import_credentials', { source: source.slug });
                sp.stop(sent
                    ? `${c.green('âœ“')}  ${source.name} imported`
                    : `${c.yellow('â—')}  Could not sync â€” import from Chrome extension instead`);
            }
        }
    }
    // Manual options
    let addMore = sources.length === 0;
    if (!addMore) {
        console.log('');
        const more = await ask('Add an API key or custom endpoint too? (y/N): ');
        addMore = more.toLowerCase() === 'y';
    }
    while (addMore) {
        console.log('');
        console.log(`     ${c.bold('1')}  API key ${c.dim('(Anthropic, OpenAI, Google, OpenRouter)')}`);
        console.log(`     ${c.bold('2')}  Custom endpoint ${c.dim('(Ollama, LM Studio, etc.)')}`);
        console.log(`     ${c.dim('d')}  ${c.dim('Done')}`);
        console.log('');
        const choice = await ask('(1/2/d): ');
        if (choice === '1') {
            console.log('');
            console.log(`     ${c.bold('a')} Anthropic  ${c.bold('o')} OpenAI  ${c.bold('g')} Google  ${c.bold('r')} OpenRouter`);
            console.log('');
            const p = await ask('Provider (a/o/g/r): ');
            const map = { a: 'anthropic', o: 'openai', g: 'google', r: 'openrouter' };
            const providerId = map[p.toLowerCase()];
            if (providerId) {
                const key = await ask(`${providerId} API key: `);
                if (key) {
                    const sp = spinner(`Saving ${providerId} key...`);
                    const sent = await sendToExtension('save_config', { payload: { providerKeys: { [providerId]: key } } });
                    sp.stop(sent
                        ? `${c.green('âœ“')}  ${providerId} key saved`
                        : `${c.yellow('â—')}  Could not sync â€” add from Chrome extension instead`);
                }
            }
        }
        else if (choice === '2') {
            console.log('');
            const name = await ask('Display name (e.g. "Ollama Llama 3"): ');
            if (name) {
                const baseUrl = await ask('Base URL (e.g. http://localhost:11434/v1): ');
                const modelId = await ask('Model ID (e.g. llama3): ');
                const apiKey = await ask('API key (optional, enter to skip): ');
                if (baseUrl && modelId) {
                    const sp = spinner(`Saving ${name}...`);
                    const sent = await sendToExtension('save_config', {
                        payload: { customModels: [{ name, baseUrl, modelId, apiKey: apiKey || '' }] },
                    });
                    sp.stop(sent
                        ? `${c.green('âœ“')}  ${name} added`
                        : `${c.yellow('â—')}  Could not sync â€” add from Chrome extension instead`);
                }
            }
        }
        else {
            break;
        }
    }
    if (relay) {
        const origError = console.error;
        console.error = () => { };
        relay.disconnect();
        relay = null;
        // Restore after a tick so reconnect logs are suppressed
        setTimeout(() => { console.error = origError; }, 500);
    }
}
// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function runSetup(options = {}) {
    const registry = getAgentRegistry();
    const only = options.only;
    const interactive = options.yes ? false : (process.stdin.isTTY ?? false);
    // â”€â”€ Banner â”€â”€
    if (interactive) {
        console.log(BANNER);
    }
    else {
        log('\nRethinkSoft Setup (non-interactive)\n');
    }
    // â”€â”€ Step 0: Chrome extension â”€â”€
    if (interactive) {
        console.log(`  ${c.dim('step 1')}  ${c.bold('Chrome extension')}`);
        console.log(`  ${c.dim('       RethinkSoft needs a Chrome extension to control your browser.')}\n`);
    }
    else {
        log('  Step 1: Chrome extension');
    }
    const sp0 = spinner('Looking for the extension...', interactive);
    if (interactive)
        await sleep(400);
    const relayUp = await isRelayRunning();
    if (relayUp) {
        sp0.stop(`${c.green('âœ“')}  Chrome extension is running`);
    }
    else {
        sp0.stop(`${c.dim('â—‹')}  Chrome extension not found`);
        if (interactive) {
            console.log('');
            await ensureExtension(interactive);
        }
        else {
            log(`     Install from: ${EXTENSION_URL}`);
        }
    }
    // â”€â”€ Step 1: Detect agents â”€â”€
    if (interactive) {
        console.log('');
        console.log(`  ${c.dim('step 2')}  ${c.bold('MCP server')}`);
        console.log(`  ${c.dim('       Adding RethinkSoft as an MCP tool to your coding agents.')}\n`);
    }
    else {
        log('\n  Step 2: MCP server');
    }
    const sp1 = spinner('Scanning for agents on this machine...', interactive);
    if (interactive)
        await sleep(600);
    const detected = [];
    for (const agent of registry) {
        if (only && agent.slug !== only)
            continue;
        if (agent.detect())
            detected.push(agent);
    }
    sp1.stop(interactive
        ? `${c.green('âœ“')}  Found ${c.bold(String(detected.length))} agent${detected.length === 1 ? '' : 's'} on this machine`
        : `  âœ“  Found ${detected.length} agent${detected.length === 1 ? '' : 's'} on this machine`);
    const out = interactive ? console.log : log;
    out('');
    for (const agent of registry) {
        if (only && agent.slug !== only)
            continue;
        const found = detected.includes(agent);
        const path = agent.configPath ? agent.configPath() : '';
        if (interactive) {
            if (found) {
                console.log(`     ${c.green('âœ“')}  ${agent.name.padEnd(16)} ${c.dim(path)}`);
            }
            else {
                console.log(`     ${c.dim('â—‹')}  ${c.dim(agent.name)}`);
            }
        }
        else {
            out(`     ${found ? 'âœ“' : 'â—‹'}  ${agent.name}${path ? ` (${path})` : ''}`);
        }
    }
    out('');
    if (detected.length === 0) {
        if (interactive) {
            console.log(`  ${c.yellow('â—')}  No agents found. Add this to your agent's MCP config manually:\n`);
            console.log(`     ${c.cyan(JSON.stringify({ mcpServers: { browser: MCP_ENTRY } }))}\n`);
        }
        else {
            log(`  â—  No agents found. Add manually: ${JSON.stringify({ mcpServers: { browser: MCP_ENTRY } })}`);
        }
        return;
    }
    // â”€â”€ Step 2: Configure agents â”€â”€
    const sp2 = spinner('Adding RethinkSoft MCP server to each agent...', interactive);
    if (interactive)
        await sleep(400);
    const results = [];
    for (const agent of detected) {
        let result;
        if (agent.method === 'cli-command') {
            result = runClaudeCodeSetup();
        }
        else {
            result = mergeJsonConfig(agent.configPath());
        }
        results.push({ ...result, agent: agent.name });
        await sleep(150);
    }
    const configured = results.filter(r => r.status === 'configured').length;
    const alreadyDone = results.filter(r => r.status === 'already-configured').length;
    if (interactive) {
        sp2.stop(`${c.green('âœ“')}  ${configured > 0 ? `Added to ${c.bold(String(configured))} agent${configured === 1 ? '' : 's'}` : 'All agents already have RethinkSoft'}`);
        console.log('');
        for (const result of results) {
            if (result.status === 'configured') {
                console.log(`     ${c.green('âœ“')}  ${result.agent.padEnd(16)} ${c.green('added')}`);
            }
            else if (result.status === 'already-configured') {
                console.log(`     ${c.dim('â—')}  ${result.agent.padEnd(16)} ${c.dim('already has RethinkSoft')}`);
            }
            else {
                console.log(`     ${c.red('âœ—')}  ${result.agent.padEnd(16)} ${c.red(result.detail)}`);
            }
        }
    }
    else {
        sp2.stop(`  âœ“  ${configured > 0 ? `Added to ${configured} agent${configured === 1 ? '' : 's'}` : 'All agents already have RethinkSoft'}`);
        log('');
        for (const result of results) {
            const status = result.status === 'configured' ? 'added'
                : result.status === 'already-configured' ? 'already has RethinkSoft'
                    : `error: ${result.detail}`;
            log(`     ${result.status === 'error' ? 'âœ—' : result.status === 'configured' ? 'âœ“' : 'â—'}  ${result.agent} â€” ${status}`);
        }
    }
    // â”€â”€ Step 3: Credentials (skippable, interactive only) â”€â”€
    if (interactive) {
        await promptCredentials();
    }
    else {
        // Auto-detect and report credentials
        const sources = detectCredentialSources();
        if (sources.length > 0) {
            log('\n  Step 3: Credentials');
            for (const source of sources) {
                log(`     âœ“  Found ${source.name} credentials (${source.path})`);
            }
        }
    }
    // â”€â”€ Summary â”€â”€
    const errors = results.filter(r => r.status === 'error').length;
    if (interactive) {
        console.log('');
        console.log(`  ${c.bold('â—†  Setup complete!')}`);
        console.log('');
        if (configured > 0) {
            console.log(`     ${c.green('â–¸')}  Restart your agents to start using RethinkSoft.`);
        }
        console.log(`     ${c.green('â–¸')}  Change credentials anytime in the Chrome extension or sidepanel settings.`);
        if (errors > 0) {
            console.log(`     ${c.red('â–¸')}  ${errors} agent${errors === 1 ? '' : 's'} failed â€” check the errors above.`);
        }
        console.log('');
    }
    else {
        log('\n  Setup complete!');
        if (configured > 0)
            log(`     Restart your agents to start using RethinkSoft.`);
        if (errors > 0)
            log(`     ${errors} agent(s) failed â€” check errors above.`);
        log('');
    }
    rl?.close();
    setTimeout(() => process.exit(0), 200);
}
