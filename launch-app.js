'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const appUrl = 'http://127.0.0.1:4173/';
const errorFile = path.join(__dirname, 'startup-error.local.txt');
const logFile = path.join(__dirname, 'startup.local.log');

function looksLikeApp(html) {
  return /<title>[^<]*Everything App/i.test(html) && html.includes('id="space-navigation"');
}

async function appReady() {
  try {
    const response = await fetch(appUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok && looksLikeApp(await response.text());
  } catch { return false; }
}

async function stopAppServer() {
  let response;
  try { response = await fetch(appUrl,{signal:AbortSignal.timeout(2000)}); }
  catch(error) { if(error.cause?.code === 'ECONNREFUSED') return; throw new Error('Yerel sunucuya erisilemiyor. Yeniden baslatma iptal edildi.'); }
  if (!response.ok || !looksLikeApp(await response.text())) throw new Error('4173 portundaki uygulama dogrulanamadi. Durdurma iptal edildi.');
  const script = `
$ErrorActionPreference = 'Stop'
$listeners = @(Get-NetTCPConnection -LocalPort 4173 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique)
if ($listeners.Count -ne 1) { throw 'Sunucu sureci tekil olarak bulunamadi.' }
$appProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listeners[0])
$expectedNode = $env:EVERYTHING_APP_NODE_PATH
if ($appProcess.ExecutablePath -ne $expectedNode) { throw 'Sunucu Node.js sureci olarak dogrulanamadi.' }
$fullScript = Join-Path $env:EVERYTHING_APP_RESTART_DIR 'server.js'
$commandLine = $appProcess.CommandLine
$arguments = [regex]::Matches($commandLine, '(?:"([^"]+)"|([^\\s]+))') | ForEach-Object { $_.Value.Trim('"') }
if ($arguments -notcontains $fullScript) { throw 'Bu proje klasorunun sunucusu dogrulanamadi.' }
Stop-Process -Id $appProcess.ProcessId -ErrorAction Stop
`;
  await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{
    windowsHide:true,timeout:10000,env:{...process.env,EVERYTHING_APP_NODE_PATH:process.execPath,EVERYTHING_APP_RESTART_DIR:__dirname},
  });
  for(let attempt=0;attempt<20;attempt++) {
    if(!await appReady())return;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('Sunucu kapanmadi. Tekrar dene.');
}

async function launchApp({ openBrowser = true, restart = false } = {}) {
  if(restart)await stopAppServer();
  else if (await appReady()) {
    // An older server can serve the latest HTML while missing newly registered routes.
    const manifest = await fetch(appUrl + 'manifest.webmanifest', {signal:AbortSignal.timeout(2000)});
    if (manifest.status === 404) await stopAppServer();
  }
  if (!await appReady()) {
    let childError;
    const output = fs.openSync(logFile, 'a');
    let server;
    try {
      server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
        cwd: __dirname, detached: true, windowsHide: true, stdio: ['ignore', output, output],
      });
      server.on('error', error => { childError = error; });
      server.unref();
    } finally { fs.closeSync(output); }
    let ready = false;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await appReady()) { ready = true; break; }
      if (childError) throw childError;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (!ready) throw new Error('Sunucu 4173 portunda acilamadi. Ayrintilar: ' + logFile);
  }
  if (openBrowser) {
    await new Promise((resolve, reject) => {
      const browser = spawn('explorer.exe', [appUrl], { windowsHide: true, detached: true, stdio: 'ignore' });
      browser.once('error', reject);
      browser.once('spawn', () => { browser.unref(); resolve(); });
    });
  }
  fs.rmSync(errorFile, { force: true });
}

if (require.main === module) {
  launchApp({ openBrowser: !process.argv.includes('--no-browser'), restart: process.argv.includes('--restart') }).catch(error => {
    const message = new Date().toISOString() + '\n' + error.message + '\n';
    try { fs.writeFileSync(errorFile, message); } catch { /* Also report through stderr. */ }
    console.error(message);
    process.exitCode = 1;
  });
}

module.exports = { launchApp };
