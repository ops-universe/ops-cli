import {selectPalette} from './palette.mjs';
export const colors = {
  "universe": {
    "bg": "#171a2d",
    "accent": "#b7b5ff"
  },
  "repoops": {
    "bg": "#181d17",
    "accent": "#d5ed91"
  },
  "jobsops": {
    "bg": "#21172f",
    "accent": "#d8b4fe"
  },
  "dailytoolsops": {
    "bg": "#291b12",
    "accent": "#ffba78"
  },
  "evalops": {
    "bg": "#101e35",
    "accent": "#8dbbff"
  },
  "guardops": {
    "bg": "#30151f",
    "accent": "#ffa0b4"
  },
  "deployops": {
    "bg": "#102c29",
    "accent": "#70e7d0"
  },
  "dataops": {
    "bg": "#2b2413",
    "accent": "#f7cf64"
  },
  "integrationops": {
    "bg": "#102a33",
    "accent": "#77d9ef"
  },
  "mcpops": {
    "bg": "#281633",
    "accent": "#e8adff"
  },
  "workflowops": {
    "bg": "#202c14",
    "accent": "#b9e66c"
  },
  "ragops": {
    "bg": "#132c24",
    "accent": "#82e2b4"
  },
  "traceops": {
    "bg": "#192832",
    "accent": "#9dd3f5"
  },
  "documentops": {
    "bg": "#2c1c16",
    "accent": "#f5b08b"
  },
  "harnessops": {
    "bg": "#1b1b24",
    "accent": "#c2c3e1"
  },
  "ops-template": {
    "bg": "#192438",
    "accent": "#a8c5f4"
  },
  "ops-ui": {
    "bg": "#301b29",
    "accent": "#ffa8d8"
  },
  "ops-cli": {
    "bg": "#192e2b",
    "accent": "#9de2cd"
  },
  "ops-standards": {
    "bg": "#29221c",
    "accent": "#e5c29b"
  }
};
export function branding(name){
 if(typeof name!=='string'||!/^[A-Za-z][A-Za-z0-9-]{1,63}$/.test(name))throw new Error('Invalid project name');
 const identity=selectPalette(name);
 const {bg,accent}=colors[Object.hasOwn(colors,identity.palette)?identity.palette:'universe'];
 const initials=name.slice(0,2).toUpperCase();
 const title=name+' | Ops Universe';
 const description=name+' — Ops Universe project starter. Developer Preview.';
 const favicon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="'+bg+'"/><text x="32" y="42" text-anchor="middle" font-family="sans-serif" font-size="25" font-weight="bold" fill="'+accent+'">'+initials+'</text></svg>\n';
 const logo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80"><rect width="360" height="80" rx="16" fill="'+bg+'"/><circle cx="40" cy="40" r="20" fill="none" stroke="'+accent+'" stroke-width="3"/><text x="75" y="49" font-family="sans-serif" font-size="25" fill="'+accent+'">'+name+'</text></svg>\n';
 return {title,description,favicon,logo,...identity};
}
export function brandHtml(html,brand){
 if(!/<title>[^<]*<\/title>/i.test(html)||!/<meta name="description" content="[^"]*">/i.test(html))throw new Error('Unsupported website HTML template');
 return html.replace(/<title>[^<]*<\/title>/i,()=>'<title>'+brand.title+'</title>').replace(/<meta name="description" content="[^"]*">/i,()=>'<meta name="description" content="'+brand.description+'">').replace('</head>','<link rel="icon" type="image/svg+xml" href="./favicon.svg"><meta property="og:title" content="'+brand.title+'"><meta property="og:description" content="'+brand.description+'"></head>');
}
