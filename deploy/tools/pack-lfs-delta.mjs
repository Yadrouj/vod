// Transfer large LFS snapshots as a verified thin Git pack against existing LFS objects.
// This only creates deployment artifacts; it does not modify the working tree/index.
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Provide paths to changed LFS files');
const directory = path.resolve('.media-cache/lfs-delta');
await mkdir(directory, { recursive: true });
const repository = path.join(directory, 'objects.git');
const git = (args, input) => execFileSync('git', ['--git-dir', repository, '-c', 'user.name=LFS Transfer', '-c', 'user.email=lfs-transfer@localhost', ...args], { input, encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim();
execFileSync('git', ['init', '--bare', repository], { stdio: 'ignore' });
const manifest = [];
for (const file of files) {
  const pointer = execFileSync('git', ['show', `origin/main:${file}`], { encoding: 'utf8' });
  const baseHash = pointer.match(/oid sha256:([a-f0-9]{64})/)?.[1];
  if (!baseHash) throw new Error(`Not an LFS base: ${file}`);
  const basePath = path.resolve('.git/lfs/objects', baseHash.slice(0, 2), baseHash.slice(2, 4), baseHash);
  const baseGit = git(['hash-object', '-w', '--no-filters', basePath]);
  const newGit = git(['hash-object', '-w', '--no-filters', path.resolve(file)]);
  const newPointer = execFileSync('git', ['lfs', 'pointer', '--file', file], { encoding: 'utf8' });
  const newHash = newPointer.match(/oid sha256:([a-f0-9]{64})/)?.[1];
  if (!newHash) throw new Error(`Cannot hash ${file}`);
  manifest.push({ file, baseHash, baseGit, newGit, newHash });
  console.log(JSON.stringify({ phase: 'hashed', file }));
}
// Trees give pack-objects path hints, allowing it to delta large blobs against
// the excluded parent rather than sending complete independently compressed files.
const tree = field => git(['mktree'], manifest.map((row, index) => `100644 blob ${row[field]}\tfile-${index}.json`).join('\n') + '\n');
const baseCommit = git(['commit-tree', tree('baseGit'), '-m', 'Transfer base']);
const newCommit = git(['commit-tree', tree('newGit'), '-p', baseCommit, '-m', 'Transfer update']);
const pack = spawn('git', ['--git-dir', repository, '-c', 'core.bigFileThreshold=2g', '-c', 'pack.windowMemory=2g', '-c', 'pack.threads=1', 'pack-objects', '--thin', '--stdout', '--revs'], { stdio: ['pipe', 'pipe', 'inherit'] });
const completion = new Promise((resolve, reject) => { pack.on('error', reject); pack.on('exit', code => code === 0 ? resolve() : reject(new Error(`pack-objects exited ${code}`))); });
pack.stdin.end(`${newCommit}\n^${baseCommit}\n`);
await Promise.all([pipeline(pack.stdout, createWriteStream(path.join(directory, 'updates.pack'))), completion]);
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ phase: 'packed', files: manifest.length, pack: path.join(directory, 'updates.pack') }));
