// Use the laptop's existing Git credential for one remote LFS operation only.
// The credential travels over SSH stdin and exists only in the child environment;
// it is never printed, stored, or added to the server's Git configuration.
import { execFileSync, spawn } from 'node:child_process';
const hashes = process.argv.slice(2);
if (!hashes.length || hashes.some(hash => !/^[a-f0-9]{64}$/.test(hash))) throw new Error('Provide SHA-256 LFS object IDs');
const raw = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } });
const credential = Object.fromEntries(raw.trim().split('\n').map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
if (!credential.username || !credential.password) throw new Error('No existing GitHub credential');
const script = `import sys,json,os,base64,subprocess
v=json.load(sys.stdin)
env=os.environ.copy()
env['GIT_TERMINAL_PROMPT']='0'
env['GIT_CONFIG_COUNT']='1'
env['GIT_CONFIG_KEY_0']='http.https://github.com/.extraheader'
env['GIT_CONFIG_VALUE_0']='Authorization: Basic '+base64.b64encode((v['username']+':'+v['password']).encode()).decode()
sys.exit(subprocess.call(['git','lfs','push','--object-id','origin',*v['hashes']],cwd='/home/ubuntu/vod',env=env))`;
const encoded = Buffer.from(script).toString('base64');
const child = spawn('ssh', ['ubuntu@109.122.247.136', `python3 -c "import base64;exec(base64.b64decode('${encoded}'))"`], { stdio: ['pipe', 'inherit', 'inherit'] });
child.stdin.end(JSON.stringify({ username: credential.username, password: credential.password, hashes }));
await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Remote LFS push exited ${code}`))); });
