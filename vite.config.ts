import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig({css:{postcss:{plugins:[tailwindcss()]}},server:{host:'127.0.0.1',port:48832,strictPort:true,proxy:{'/api':'http://127.0.0.1:48831'}},plugins:[vinext()]});