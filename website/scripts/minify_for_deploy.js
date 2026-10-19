// Shrinks the app's JavaScript on the deploy machine only (Cloudflare build), after the checks have passed:
// comments and whitespace removed, local names shortened. The readable source stays in the (private) git repo.
// Top-level names are kept on purpose: the HTML calls them (onclick="switchView(...)") and the files call each other.
// If terser is not installed on the build machine the deploy goes ahead unminified (never blocks a deploy).
//   node scripts/minify_for_deploy.js [dir]      (dir defaults to the repo root)
const fs = require('fs'), path = require('path');
const NOTICE = '/* Iron & Wrath (c) 2026 Victor C. All rights reserved. Unofficial fan tool. Source is not licensed for reuse. */\n';

async function main(dir) {
    // only on the deploy machine: run locally it would overwrite the readable source files (that happened once: 2 files got committed minified)
    if (!process.env.WORKERS_CI && !process.env.CF_PAGES && !process.env.CI && !process.argv.includes('--here')) { console.log('  · not a deploy machine: JavaScript left readable (minify runs on Cloudflare only)'); return { files: 0, before: 0, after: 0 }; }
    let terser;
    try { terser = require('terser'); } catch (e) { console.log('  ! terser not installed: JavaScript deployed unminified'); return { files: 0, before: 0, after: 0 }; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    let before = 0, after = 0;
    for (const f of files) {
        const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8');
        const out = await terser.minify(src, { compress: { passes: 2 }, mangle: { toplevel: false }, format: { comments: false }, ecma: 2020 });
        if (!out.code) throw new Error('could not minify ' + f);
        fs.writeFileSync(p, NOTICE + out.code); before += src.length; after += out.code.length + NOTICE.length;
    }
    return { files: files.length, before, after };
}
module.exports = main;
if (require.main === module) {
    main(process.argv[2] || path.join(__dirname, '..')).then(r => console.log(`  ✔ minified ${r.files} JavaScript files: ${(r.before / 1024).toFixed(0)} KB -> ${(r.after / 1024).toFixed(0)} KB`))
        .catch(e => { console.error('minify failed: ' + e.message); process.exit(1); });
}
