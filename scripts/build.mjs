import{mkdir,copyFile,rm}from'node:fs/promises';
import{build}from'esbuild';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','share.html','style.css','app.js'])await copyFile('public/'+file,'dist/'+file);
await build({entryPoints:['public/auth.js'],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2022'],outfile:'dist/auth.js'});
await build({entryPoints:['public/photos.js'],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2022'],outfile:'dist/photos.js'});


await build({entryPoints:['public/share.js'],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2022'],outfile:'dist/share.js'});

console.log('Built static frontend for Vercel. API runs as a Node function.');
