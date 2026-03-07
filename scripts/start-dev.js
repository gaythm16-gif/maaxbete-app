/**
 * Lance uniquement Vite (aucune API intégrée).
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const p = spawn('npm', ['run', 'dev'], { stdio: 'inherit', cwd: root, shell: true });
p.on('error', (err) => console.error(err));
p.on('exit', (code) => process.exit(code ?? 0));
