import {mkdir,copyFile,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
for(const dir of ['dist/data','dist/docs'])await mkdir(dir,{recursive:true});
for(const file of ['index.html','app.js','engine.js','thai-reading.js','image-translate.js','styles.css','favicon.svg','data/dictionary.json','docs/RESEARCH.md','ATTRIBUTION.md'])await copyFile(file,`dist/${file}`);
await copyFile('.nojekyll','dist/.nojekyll');
console.log('Static site built in dist/ (no runtime dependencies).');

const config=JSON.parse(await readFile('api-config.json','utf8'));
await writeFile('dist/api-config.json',JSON.stringify({apiUrl:process.env.KAREN_API_URL||(process.env.VERCEL?'/api/karen':config.apiUrl)||''}));
