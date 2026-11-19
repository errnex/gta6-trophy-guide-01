// Screenshot runner for the Leonida Platinum guide: serves nothing itself, it talks
// to a headless Chromium over CDP (pure Node: global WebSocket, no packages), waits
// for window.__shotReady, puts the app in each shot's state, and saves JPEGs.
// Usage: node shots.mjs  (expects `node serve.ts` already running on :8080)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const PORT = 9222;
const BASE = 'http://localhost:8080';

// 13 of 55 earned, seeded into localStorage before the page loads.
const SEEDED = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!', 'Trust', 'Break the Bank', 'Master of None', 'Baited My Tackle', 'Stick Fiddler', 'In The Beginning…', 'Let’s Go Bowling', 'Treat Yo Self', 'Whip It Good'];

const SHOTS = [
  { name: '1-checklist.jpg', setup: `document.querySelectorAll('.trophy').forEach(el => { if (el.textContent.includes('The Shootist')) el.click(); }); window.scrollTo(0, 0);` },
  { name: '2-roadmap.jpg', setup: `document.querySelector('[data-view="roadmap"]').click();` },
  { name: '3-missables.jpg', setup: `document.querySelector('[data-view="missables"]').click();` },
  { name: '4-spoiler.jpg', setup: `document.getElementById('spoilerToggle').click(); document.getElementById('hideEarnedToggle').click();` },
];

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
try {
  let targets;
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; } catch { await sleep(500); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  let id = 0;
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    const onMsg = (e) => { const m = JSON.parse(e.data); if (m.id === mid) { ws.removeEventListener('message', onMsg); res(m.result); } };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true })).result?.value;
  const requests = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('leonida-platinum-earned-v1', JSON.stringify({earned: ${JSON.stringify(SEEDED)}}));` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const shot of SHOTS) {
    await send('Page.navigate', { url: BASE + '/' });
    for (let i = 0; i < 40; i++) {
      if (await evalJs('window.__shotReady === true')) break;
      await sleep(250);
    }
    if (shot.setup) { await evalJs(shot.setup); await sleep(400); }
    const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    writeFileSync('screenshots/' + shot.name, Buffer.from(shot2.data, 'base64'));
    console.log('saved screenshots/' + shot.name);
  }
  const external = requests.filter((u) => !u.startsWith('http://localhost:8080') && !u.startsWith('data:'));
  console.log('requests:', requests.length, 'external:', JSON.stringify(external));
} finally {
  chrome.kill();
}
