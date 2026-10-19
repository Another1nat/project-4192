// Runs before every deploy (wrangler.jsonc -> build.command) and in CI. A failure stops the deploy, so a broken file never goes live.
//   node scripts/predeploy_check.js            checks only
//   node scripts/predeploy_check.js --stamp    checks, then writes the build id into build_info.js and sw.js and minifies the JavaScript (deploy machine only, not committed)
// Only Node built-ins for the checks: they have to work on the Cloudflare build machine (the minify step uses terser when it is installed).
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..'); process.chdir(root);
const fails = [], notes = [];
const fail = m => fails.push(m), ok = m => notes.push(m);

// 1. every JavaScript file the app can load must at least parse
const jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.js'));
const minified = jsFiles.filter(f => fs.readFileSync(f, 'utf8').startsWith('/* Iron & Wrath (c) 2026'));   // a minified file in the repo = the readable source was lost
if (minified.length) fail(`committed in minified form (restore the readable source): ${minified.join(', ')}`);
let bad = 0; for (const f of jsFiles) { try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); } catch (e) { bad++; fail(`syntax error in ${f}: ${e.message}`); } }
if (!bad) ok(`${jsFiles.length} JavaScript files parse`);

// 2. index.html: every local script / stylesheet / icon it points to exists
const html = fs.readFileSync('index.html', 'utf8'); let missing = 0;
for (const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"]*)?"/g)) { const u = m[1]; if (/^(https?:)?\/\//.test(u) || u.startsWith('data:') || u.startsWith('mailto:') || u.startsWith('tel:') || u === '/') continue; if (!fs.existsSync(u)) { missing++; fail(`index.html references a missing file: ${u}`); } }
if (!missing) ok('every file referenced by index.html exists');

// 3. service worker pre-cache list points at real files
const sw = fs.readFileSync('sw.js', 'utf8'); const extra = [...sw.matchAll(/'((?:assets|data)\/[^'?]+)(?:\?[^']*)?'/g)].map(m => m[1]).filter(f => !f.includes('${'));
let swMissing = 0; for (const f of new Set(extra)) if (!fs.existsSync(f)) { swMissing++; fail(`sw.js caches a missing file: ${f}`); }
if (!swMissing) ok('service worker file list is valid');

// 4. data: every faction listed in app.js (FACTIONS) has a valid data/factions/<name>.json with datasheets
const FAC = [...fs.readFileSync('app.js', 'utf8').slice(0, 20000).matchAll(/\{ id: \d+, group: '[^']*', name: '((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
if (!FAC.length) fail('no factions found in app.js (const FACTIONS)');
let units = 0; for (const n of FAC) { try { const d = JSON.parse(fs.readFileSync(`data/factions/${n}.json`, 'utf8')); if (!Array.isArray(d.datasheets) || !d.datasheets.length) fail(`${n}: no datasheets`); units += (d.datasheets || []).length; } catch (e) { fail(`data/factions/${n}.json: ${e.message}`); } }
if (FAC.length && units) ok(`${FAC.length} faction files, ${units} datasheets`);
for (const f of ['data/glossary.json', 'data/core_stratagems.json']) { try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { fail(`${f}: ${e.message}`); } }

// 6. nothing in the deployed folder may exceed Cloudflare's 25 MiB per-file limit
const ignore = fs.existsSync('.assetsignore') ? fs.readFileSync('.assetsignore', 'utf8').split('\n').map(x => x.trim()).filter(Boolean) : [];
const isIgnored = rel => ignore.some(p => { const q = p.replace(/\/$/, ''); if (q.startsWith('*.')) return rel.endsWith(q.slice(1)); return rel === q || rel.startsWith(q + '/'); });
let big = 0; (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const rel = path.join(dir, e.name).replace(/^\.\//, ''); if (isIgnored(rel) || e.name === 'node_modules' || e.name === '.git') continue; if (e.isDirectory()) walk(rel); else if (fs.statSync(rel).size > 24 * 1024 * 1024) { big++; fail(`${rel} is over the 25 MiB deploy limit`); } } })('.');
if (!big) ok('no file over the deploy size limit');

try { cp.execSync('node scripts/build_offline_manifest.js', { stdio: 'pipe' }); ok('offline asset list built'); } catch (e) { fail('could not build the offline asset list'); }

// 6b. terrain AR (optional): every layout in data/ar_index.json has its GLB (Android) and USDZ (iPhone) model
try {
    const codes = Object.keys(JSON.parse(fs.readFileSync('data/ar_index.json', 'utf8'))); let arBad = 0;
    for (const c of codes) for (const ext of ['glb', 'usdz']) if (!fs.existsSync(`assets/ar/${c}.${ext}`)) { arBad++; fail(`missing assets/ar/${c}.${ext}`); }
    if (!arBad) ok(`terrain AR: ${codes.length} layouts`);
} catch (e) { fail('terrain AR check: ' + e.message); }

// 7. the About page stays in the app
if (!fs.existsSync('about_ui.js') || !html.includes('about_ui.js')) fail('about_ui.js (About page) is missing from index.html'); else ok('About page present');

// optional: stamp the build id (commit sha on Cloudflare / git, otherwise the time)
if (process.argv.includes('--stamp') && !fails.length) {
    let id = process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || ''; if (!id) { try { id = cp.execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim(); } catch (e) {} }
    id = (id ? id.slice(0, 7) : 't' + Date.now().toString(36));
    fs.writeFileSync('build_info.js', `window.BL_BUILD = '${id}';   // stamped on deploy by scripts/predeploy_check.js\n`);
    fs.writeFileSync('sw.js', sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'b-${id}';`));
    ok(`build id ${id} stamped (service worker version b-${id})`);
}
notes.forEach(n => console.log('  ✔ ' + n));
if (fails.length) { console.error('\nPRE-DEPLOY CHECK FAILED:'); fails.forEach(f => console.error('  ✖ ' + f)); process.exit(1); }
console.log('Pre-deploy check passed.');
// on the deploy machine only: minify the JavaScript that goes live (skipped, not failed, if terser is not installed there)
if (process.argv.includes('--stamp')) require('./minify_for_deploy.js')(root).then(r => r.files && console.log(`  ✔ minified ${r.files} JavaScript files: ${(r.before / 1024).toFixed(0)} KB -> ${(r.after / 1024).toFixed(0)} KB`)).catch(e => { console.error('minify failed: ' + e.message); process.exit(1); });
