// Lists the image files the "Save for offline" screen downloads besides the mission cards (terrain maps, tutorial pictures, deployment diagrams).
const fs = require('fs');
const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f)).sort().map(f => `${d}/${f}`) : [];
const out = { maps: list('assets/layouts_svg'), tutorial: list('assets/tutorial'), deployment: list('assets/deployment'), ar: fs.existsSync('assets/ar') ? fs.readdirSync('assets/ar').filter(f => /\.(glb|usdz)$/.test(f) && !/-(solid|flat|min)\./.test(f)).sort().map(f => `assets/ar/${f}`).concat(['assets/vendor/model-viewer.min.js', 'ar_viewer.js', 'data/ar_index.json']) : [] };
const json = JSON.stringify(out, null, 0);
if (!fs.existsSync('data/offline_assets.json') || fs.readFileSync('data/offline_assets.json', 'utf8') !== json) fs.writeFileSync('data/offline_assets.json', json);
console.log(`offline assets: ${out.ar.length} AR files, ${out.maps.length} maps, ${out.tutorial.length} tutorial images, ${out.deployment.length} deployment diagrams`);
