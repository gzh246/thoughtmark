/** Capture the unmodified Next.js views against local, browser-level fixtures.
 * No database, queue, model or external website is contacted. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const web = path.join(root, 'thoughtmark-web');
const require = createRequire(path.join(web, 'package.json'));
const { chromium } = require('@playwright/test');
const { encode } = require('next-auth/jwt');
const out = path.join(root, 'docs/screenshots');
fs.mkdirSync(out, { recursive: true });
const port = Number(process.env.SHOWCASE_PORT || 3451);
const origin = `http://127.0.0.1:${port}`;
const secret = 'local-showcase-fixture-not-a-production-secret';
const token = await encode({ secret, token: { sub: 'reader-local', name: '顾同学', email: 'reader@example.com' }, maxAge: 3600 });
const log = fs.openSync(path.join(web, 'showcase-next.log'), 'w');
const child = spawn(process.execPath, [path.join(web, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: web,
  env: { ...process.env, NEXTAUTH_SECRET: secret, NEXTAUTH_URL: origin, NEXT_TELEMETRY_DISABLED: '1', NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: '1' },
  stdio: ['ignore', log, log],
  windowsHide: true,
});
const launchedPid = child.pid;
let browser;
let popupServer;
const errors = [], requests = [], captures = [];
const bookmarks = [
  ['react-state', 'React 状态建模与组件边界', 'react.dev', '把状态归属和更新路径整理清楚，用于下一轮界面重构。', ['学习资料', 'React'], '状态应尽量保持最小化，并由真正使用它的组件拥有。'],
  ['retrieval', '混合检索中的排序与结果融合', 'arxiv.org', '比较关键词检索与向量召回，记录适合个人知识库的组合方式。', ['工作参考', '检索'], '不同检索通道可通过排名融合组织候选，再保留命中片段供核对。'],
  ['design', '从收藏走向可回顾的知识网络', 'example.com', '收藏时留下原因，比日后只面对一个链接更容易回到当时的问题。', ['灵感收藏', '知识管理'], '把注解、主题与原始来源放在一起，形成可追溯的学习记录。'],
  ['queue', '后台任务的重试与幂等', 'redis.io', '保存内容与耗时处理分离，先确认写入，再异步处理摘要和索引。', ['工作参考', '系统设计'], '重试需要稳定任务标识，重复执行不能重复产生同一业务结果。'],
].map(([id,title,domain,whySaved,quickTags,contentSummary],i)=>({id,title,url:`https://${domain}/reading/${id}`,whySaved,quickTags,contentSummary,pageContent:contentSummary+'\n'+whySaved,userId:'reader-local',createdAt:`2026-11-01T${String(17-i).padStart(2,'0')}:00:00.000Z`}));

function fixture(url) {
  const u = new URL(url), p = u.pathname;
  if (p === '/api/bookmarks') return {data:bookmarks,meta:{page:1,limit:20,total:4,totalPages:1}};
  if (p === '/api/search') return {data:bookmarks.filter(x=>['retrieval','queue'].includes(x.id)).map((x,i)=>({...x,bookmarkId:x.id,rrfScore:0.92-i*0.09,chunkText:x.contentSummary,relevanceHint:'相关内容'})),meta:{total:2,totalPages:1}};
  if (p === '/api/graph') return {data:{nodes:[{id:'c1',type:'cluster',label:'前端工程',size:13},{id:'c2',type:'cluster',label:'知识检索',size:16},{id:'c3',type:'cluster',label:'系统设计',size:13},...bookmarks.map(x=>({id:x.id,type:'bookmark',label:x.title,url:x.url,size:5,createdAt:x.createdAt}))],links:[{source:'c1',target:'react-state'},{source:'c2',target:'retrieval'},{source:'c2',target:'design'},{source:'c3',target:'queue'}]},meta:{clusterCount:3,bookmarkCount:4}};
  if (p === '/api/insights/interest-evolution') return {data:{timeline:[{month:'2026-09','前端工程':3,'知识检索':2,'系统设计':1},{month:'2026-10','前端工程':5,'知识检索':4,'系统设计':3},{month:'2026-11','前端工程':4,'知识检索':6,'系统设计':5}],topics:['前端工程','知识检索','系统设计'],months:['2026-09','2026-10','2026-11'],totalBookmarks:33}};
  if (p === '/api/insights') return {data:{gaps:[]}};
  if (p === '/api/notifications') return {data:[],meta:{unreadCount:0}};
  return {data:[],meta:{total:0}};
}

try {
  for (let i=0;i<180;i++) {
    if (child.exitCode !== null) throw new Error('Next.js exited before readiness');
    try {const r=await fetch(`${origin}/login`);if(r.ok)break;} catch {}
    if (i===179) throw new Error('Next.js readiness deadline');
    await new Promise(r=>setTimeout(r,1000));
  }
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,colorScheme:'light',locale:'zh-CN'});
  await context.addCookies([{name:'next-auth.session-token',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await context.addInitScript(()=>{localStorage.setItem('theme','light');});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==origin){requests.push({path:url.hostname,blocked:true});return route.abort();}
    if(url.pathname.startsWith('/api/')){
      requests.push({path:url.pathname,fixture:true});
      if(url.pathname.endsWith('/stream'))return route.fulfill({status:200,contentType:'text/event-stream',body:': local capture\n\n'});
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(req.url()))});
    }
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  async function shot(file){
    await page.evaluate(()=>document.fonts.ready);
    const text=await page.locator('body').innerText();
    if(/演示|虚构|虚拟/.test(text))throw new Error('Disallowed surface label');
    await page.screenshot({path:path.join(out,file),fullPage:true,animations:'disabled'});
    captures.push({file,url:page.url(),title:await page.title(),horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  }
  await page.goto(`${origin}/timeline`);await page.getByText(bookmarks[0].title,{exact:true}).waitFor();await page.waitForTimeout(600);await shot('01-timeline.png');
  await page.getByText(bookmarks[0].title,{exact:true}).click();await page.getByText('书签详情',{exact:true}).waitFor();await shot('02-bookmark-detail.png');
  await page.goto(`${origin}/search`);await page.getByText('输入任何你记得的关键描述',{exact:true}).waitFor();await page.waitForTimeout(800);await page.getByPlaceholder('用自然语言搜索你的书签，支持口语化描述...').fill('检索与后台任务');await page.getByPlaceholder('用自然语言搜索你的书签，支持口语化描述...').press('Enter');await page.getByRole('link',{name:/混合检索中的排序与结果融合/}).waitFor();await shot('03-search.png');
  await page.goto(`${origin}/graph`);await page.locator('canvas').first().waitFor();await page.getByTitle('Switch to dark mode').click();await page.waitForTimeout(2500);await page.locator('canvas').first().hover();for(let i=0;i<6;i++)await page.mouse.wheel(0,-100);await page.waitForTimeout(300);await shot('04-knowledge-graph.png');
  // Serve the actual WXT production bundle; only browser APIs/data are fixtures.
  const popupRoot=path.join(root,'thoughtmark-extension/.output/chrome-mv3');
  popupServer=createServer((req,res)=>{
    const pathname=new URL(req.url,'http://127.0.0.1:3452').pathname;
    const file=path.join(popupRoot,pathname);
    if(!file.startsWith(popupRoot)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
    const ext=path.extname(file);res.setHeader('Content-Type',ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>popupServer.listen(3452,'127.0.0.1',resolve));
  const popupContext=await browser.newContext({viewport:{width:440,height:780},deviceScaleFactor:2,locale:'zh-CN'});
  await popupContext.addInitScript(()=>{
    const values={authToken:'local-capture-identity',theme:'light',onboardingCompleted:true};
    window.browser={runtime:{id:'thoughtmark-local-capture'},tabs:{query:async()=>[{id:1,url:'https://react.dev/learn/choosing-the-state-structure',title:'React 状态建模与组件边界'}],sendMessage:async()=>({success:true,data:{textContent:'状态应尽量保持最小化，并由真正使用它的组件拥有。'}})},storage:{local:{get:async key=>typeof key==='string'?{[key]:values[key]}:values,set:async data=>Object.assign(values,data),remove:async key=>delete values[key]}}};
  });
  await popupContext.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='http://127.0.0.1:3452')return route.abort();
    if(u.pathname==='/api/ai/suggestions')return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{annotations:['梳理状态归属，减少界面中的重复数据。','用于下一次组件拆分时快速对照。'],tags:['React','前端工程']}})});
    return route.continue();
  });
  const popup=await popupContext.newPage();popup.on('pageerror',e=>errors.push(e.message));
  await popup.goto('http://127.0.0.1:3452/popup.html');await popup.getByPlaceholder('为什么要看这个？').fill('把状态归属和更新路径整理清楚，用于下一轮界面重构。');await popup.getByRole('button',{name:'学习资料',exact:true}).click();await popup.waitForTimeout(500);
  if(/演示|虚构|虚拟/.test(await popup.locator('body').innerText()))throw new Error('Disallowed popup label');
  await popup.locator('.popup-container').screenshot({path:path.join(out,'05-extension-capture.png'),animations:'disabled'});
  captures.push({file:'05-extension-capture.png',url:popup.url(),title:await popup.title(),source:'WXT production popup, browser API fixtures'});
  console.log(JSON.stringify({launchedPid,captures,errors,requests,externalModelRequests:0,backendRequests:0}));
  fs.writeFileSync(path.join(out,'capture-receipt.json'),JSON.stringify({launchedPid,captures,errors,requests,externalModelRequests:0,backendRequests:0},null,2)+'\n');
} finally {
  if(popupServer)await new Promise(resolve=>popupServer.close(resolve));
  if(browser)await browser.close();
  if(child.exitCode===null){
    if(process.platform==='win32')await new Promise(resolve=>{const killer=spawn('taskkill',['/PID',String(launchedPid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('exit',resolve);});
    else child.kill('SIGTERM');
  }
  fs.closeSync(log);
}
