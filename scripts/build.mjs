import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
for(const dir of ['dist/data','dist/docs'])await mkdir(dir,{recursive:true});
for(const file of ['index.html','app.js','engine.js','thai-reading.js','styles.css','favicon.svg','data/dictionary.json','docs/RESEARCH.md','ATTRIBUTION.md'])await copyFile(file,`dist/${file}`);
await copyFile('.nojekyll','dist/.nojekyll');
console.log('Static site built in dist/ (no runtime dependencies).');
