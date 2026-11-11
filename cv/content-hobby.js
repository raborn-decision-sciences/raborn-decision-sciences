/* The hobby page: projects in languages outside the day job, added to as they ship.
   Audience: peers, and anyone curious about working this way. */
// the query is the cache key: bump it whenever engine.js changes, or a browser
// that already has the old module will keep running it
import {start,layout} from "./engine.js?v=8";

/* Dates are first and last commit, read off the repositories on 2026-10-30. garmin
   analysis and cyberwall were never put under git, so they carry the one day their
   files were written and show on the map as ticks. Every coordinate comes from here. */
const PROJECTS={
  "cockpit":        {label:"cockpit",         lines:7681, commits:20, lang:"Rust", from:"2026-09-14",to:"2026-09-20"},
  "orchtui":        {label:"orchtui",         lines:8329, commits:36, lang:"Rust", from:"2026-09-16",to:"2026-09-17"},
  "mnemonic-deck":  {label:"mnemonic deck",   lines:1779, commits:5,  lang:"HTML", from:"2026-09-20",to:"2026-09-20"},
  "ghostwire":      {label:"ghostwire",       lines:12093,commits:50, lang:"Rust", from:"2026-09-21",to:"2026-10-27"},
  "chrome-and-bone":{label:"chrome & bone",   lines:1864, commits:1,  lang:"HTML", from:"2026-09-21",to:"2026-09-21"},
  "cyberwall":      {label:"cyberwall",       lines:1415, commits:0,  lang:"Py",   from:"2026-09-24",to:"2026-09-24"},
  "cybertrain":     {label:"wasteland rails", lines:2934, commits:6,  lang:"JS",   from:"2026-09-26",to:"2026-09-26"},
  "netling":        {label:"netling",         lines:59591,commits:755,lang:"JS",   from:"2026-09-27",to:"2026-10-13"},
  "netling-2":      {label:"netling 2.0",     lines:69927,commits:736,lang:"JS",   from:"2026-10-13",to:"2026-10-29"},
  "garmin":         {label:"garmin analysis", lines:1532, commits:0,  lang:"Py",   from:"2026-10-28",to:"2026-10-28"},
};
const AX={x0:80,x1:684,from:"2026-09-12",to:"2026-11-01"};
const MAP=layout(PROJECTS,{...AX,y0:44,gap:7,hMin:20,hMax:62});
const AXIS={y0:28,y1:MAP.bottom+14,
  ticks:[["2026-09-15","sep 15"],["2026-09-22","sep 22"],["2026-09-29","sep 29"],
         ["2026-10-06","oct 6"],["2026-10-13","oct 13"],["2026-10-20","oct 20"],
         ["2026-10-27","oct 27"]].map(([d,l])=>[MAP.X(d),l])};
const G="https://github.com/AnthonyRaborn/";
const ALL=Object.keys(PROJECTS);
const NEON=["netling","netling-2","chrome-and-bone","cyberwall","cybertrain","ghostwire"];

// commits on each of the 46 days, 2026-09-14 to 2026-10-29, across the eight git repositories
const DAYS=[10,7,19,19,0,0,6,3,35,0,0,0,6,46,26,42,28,30,36,0,0,0,72,96,173,54,72,29,47,
  83,129,148,38,0,0,70,67,81,65,26,2,7,16,18,0,3];
const H1=[46,26,42,28,30,36,0,0,0,72,96,173,54,72,29,47,4];
const H2=[79,129,148,38,0,0,70,67,81,65,26,2,7,16,5,0,3];
function hist(f,data,base,from,to,total,days){
  const x0=34,bw=25,max=Math.max(...data);
  f.line(x0-8,base,x0+data.length*bw-6,base,"dim");
  data.forEach((n,i)=>{if(n)f.bar(x0+i*bw+bw/2-3,base,(n/max)*172,bw-8,n===max?"hot-s":"");});
  f.text(x0-6,base+16,from);f.text(x0+(data.length-1)*bw-20,base+16,to);
  f.text(x0,base-188,max+" IN ONE DAY","f-ttl");
  f.text(34,base+48,total+" COMMITS · "+days+" DAYS · "+Math.round(total/days)+" A DAY ON AVERAGE","f-ttl");
}

const CHAPTERS=[
{slug:"premise",n:"01",kicker:"THE CLAIM",title:"Projects outside the day job",focus:ALL,
 figs:"10 projects · 1,609 commits · 167,145 lines · counted 2026-10-30",
 links:[["github profile","https://github.com/AnthonyRaborn"]],
 tech:`<p>So far there are ten projects in Rust, JavaScript, HTML and Python. As of 2026-10-30 they add up to 167,145 lines of source, not counting build output, and 1,609 commits. Most of it was written by Claude under direction and review. My work in psychometrics and R is on <a class="sib" href="index.html" data-sibling="premise">its own page</a>.</p>`,
 plain:`<p>So far I have built ten pieces of software, including a wall of live data, two games, a wallpaper that follows the weather, and a tool for planning workouts.</p>
   <p>An AI wrote most of the actual code, and I decided what to build and read what came back.</p>`,
 comm:`<p>I was getting settled into a new job and recovering from being sick. I had been sitting on a pile of ideas for a while, and at some point I just pulled the trigger on them.</p>`,
 // the map behind this chapter is already the timeline, so the figure takes the other
 // cut: the daily rhythm, including the eleven days with nothing in them
 fig(f){
  const x0=24,W=472,base=268,max=173,hMax=196;
  f.line(x0-6,base,x0+W+6,base,"dim");
  DAYS.forEach((c,i)=>{
    const x=x0+(i/(DAYS.length-1))*W, h=(c/max)*hMax;
    if(c)f.bar(x,base,h,8,c>=129?"hot-s":"");});
  [[0,"sep 14"],[15,"sep 29"],[29,"oct 13"],[45,"oct 29"]].forEach(([i,l])=>{
    const x=x0+(i/(DAYS.length-1))*W;
    f.line(x,base,x,base+5,"dim");f.text(x-11,base+17,l,"f-sub");});
  f.text(24,56,"COMMITS PER DAY, ALL EIGHT REPOSITORIES WITH GIT","f-ttl");
  f.text(24,72,"1,609 of them since 14 september 2026, counted on 2026-10-30","f-sub");
  f.text(24,318,"THE BUSIEST DAY SO FAR IS 173 COMMITS","f-ttl");
  f.text(24,334,"on 8 October, in the middle of netling","f-sub");
  f.text(24,364,"GARMIN ANALYSIS AND CYBERWALL ARE NOT COUNTED HERE","f-ttl");
  f.text(24,380,"neither was ever put under git, so neither has commits to count","f-sub");
 }},

{slug:"method",n:"02",kicker:"THE METHOD",title:"Where the effort actually goes",focus:ALL,
 tech:`<p>The division is stated in every README, which is that the model writes most of the code, tests, art and text while the maintainer sets the design and reviews what comes back.</p>`,
 plain:`<p>Working with an AI this way is something like dictation with a very fast typist who also knows how to program, so you describe what you want, the machine writes it, and you read what came back and either keep it or send it back with a better description.</p>
   <p>Every project here says so on its own front page.</p>`,
 comm:`<p>Claude has some trouble with minor things, wording that drifts into Claudish and designs that fall into the patterns people might call slop. Reviewing is mostly keeping those from growing into something unusable, or just painful to look at. Sometimes that is a quick look at some sprites and a sign off, and sometimes it is a back and forth on descriptions and ideas until Claude and I actually agree.</p>`,
 fig(f){
  const y=130,w=112,h=52,xs=[20,180,340];
  f.box(xs[0],y,w,h,"brief","what to build");
  f.box(xs[1],y,w,h,"model","writes the code");
  f.box(xs[2],y,w,h,"review","a human reads it");
  f.arrow(xs[0]+w,y+h/2,xs[1]-2,y+h/2);
  f.arrow(xs[1]+w,y+h/2,xs[2]-2,y+h/2);
  f.arrow(xs[2]+w,y+h/2,492,y+h/2,"hot-s");
  f.text(454,y+h/2-9,"SHIP","f-ttl");
  f.path(`M${xs[2]+40} ${y+h} L${xs[2]+40} ${y+h+46} L76 ${y+h+46}`);
  f.arrow(80,y+h+46,76,y+2+h);
  f.text(150,y+h+60,"IF IT IS NOT GOOD ENOUGH, IT GOES BACK WITH A BETTER BRIEF","f-sub");
  f.text(20,300,"THE DIVISION IS STATED IN EVERY README","f-ttl");
  f.text(20,316,"the model writes, and the maintainer decides and reviews","f-sub");
 }},

{slug:"constraint",n:"03",kicker:"THE DISCIPLINE",title:"As few dependencies as I can get away with",focus:["chrome-and-bone","mnemonic-deck","netling","netling-2"],
 figs:"4 projects · 0 build steps · 0 runtime dependencies",
 tech:`<p>Four of the projects are plain files that a browser opens directly. They use vanilla ES modules and canvas, with no bundler and no runtime dependencies. The netling 2.0 core keeps that rule inside Capacitor and Tauri.</p>`,
 plain:`<p>Most modern websites have to be <em>built</em> before anyone can see them, run through other programs that package them up for a browser.</p>
   <p>Four of these skip that step, so the file you write is the file that runs and opening it works with nothing installed first.</p>`,
 comm:`<p>For hobby projects, I would rather not worry about a dependency breaking something small and then trying to fix it later, and I would rather not have to think about software licenses either if I can help it. No dependencies also seems to be a bit quicker for prototyping web apps like netling or chrome-and-bone.</p>`,
 fig(f){
  const bw=78,bh=36;
  f.text(14,44,"THE USUAL WAY","f-ttl");
  ["source","bundler","minify","dist","server"].forEach((t,i)=>{
    const x=14+i*98;f.box(x,58,bw,bh,t);if(i)f.arrow(x-18,76,x-3,76,"dim");});
  f.text(14,160,"HERE","f-ttl");
  ["source","browser"].forEach((t,i)=>{
    const x=14+i*98;f.box(x,174,bw,bh,t,"","hot-s");if(i)f.arrow(x-18,192,x-3,192,"hot-s");});
  f.text(14,256,"THESE NEED NO BUNDLER, BUILD STEP OR RUNTIME DEPENDENCY","f-ttl");
  f.text(14,274,"chrome & bone · mnemonic deck · netling · the netling 2.0 core","f-sub");
  f.text(14,296,"netling 2.0 keeps the rule inside Capacitor and Tauri","f-sub");
 }},

{slug:"deck",n:"04",kicker:"SMALLEST",title:"A note logger in a single HTML file",focus:["mnemonic-deck"],
 figs:"1,779 lines · 5 commits · 1 file",
 links:[["source",G+"mnemonic-deck"]],
 live:{src:"live/mnemonic-deck.html",note:"the whole program, one file, nothing installed",
       cap:"live \u00b7 type a line and it is stamped and kept"},
 tech:`<p>An offline note logger in a single HTML file. It appends timestamped lines to weekly plain text files on disk, in a format trivial to parse later, with no install, no server and no account.</p>`,
 plain:`<p>It is a notepad that stamps the time on whatever you type and adds it to a file for that week, and that is the whole program.</p>
   <p>It runs in a web browser so it works anywhere, and it writes every note in the same fixed format so the files are easy to process later.</p>`,
 comm:`<p>The mnemonic deck tool was quick to develop. I wanted something that I could type notes into, enforcing a specific format for later parsing and written into plain text files all via a web browser for portability.</p>`,
 fig(f){
  f.box(20,64,160,48,"you type","a note and a status");
  f.arrow(180,88,236,88);
  f.box(236,64,250,48,"append","one line, plain text","hot-s");
  f.line(20,150,486,150,"dim");
  f.text(20,166,"[3:15 PM 9/16/2026] IN PROGRESS: rewrite the intake validator","f-sub");
  f.line(20,180,486,180,"dim");
  [0,1,2].forEach(i=>f.box(20+i*160,212,146,52,"week "+(38+i),"log-2026-W"+(38+i)+".txt"));
  f.text(20,300,"IT IS ONE FILE, WITH NO SERVER AND NO ACCOUNT","f-ttl");
  f.text(20,316,"one fixed format, easy to parse with cut","f-sub");
 }},

{slug:"bench",n:"05",kicker:"CONSTRAINT",title:"Every contract satisfiable by construction",focus:["chrome-and-bone"],
 figs:"1,864 lines · ~49,000 racks searched per contract",
 live:{src:"live/chrome-and-bone.html",note:"the real build, searching the real space",
       cap:"live \u00b7 every contract here was checked to be winnable before you saw it"},
 tech:`<p>The game has eight install sites, 23 pieces of chrome and four budgets that work against each other. On each roll the page exhaustively searches about 49,000 legal racks for that body and writes the contract at 84 to 96% of the best fault free result.</p>`,
 plain:`<p>It is a game about fitting machine parts into a human body without killing them, where money, heat, nerve bandwidth and sanity all push against each other and you cannot satisfy all four.</p>
   <p>Before each client walks in, the game quietly tries every possible build and sets the target just under the best one, so the job is always winnable, though usually only just.</p>`,
 comm:`<p>The balancing came out of playtesting, where a contract was either too easy to solve or nearly impossible, a single solution at best, with no reason to push a less-than-optimized solution. Searching the whole space was easier than trying to balance chrome and bone by hand, and the exhaustive search turned out pretty quick as well.</p>`,
 fig(f){
  f.text(14,40,"EVERY LEGAL RACK FOR THIS BODY","f-ttl");
  f.line(14,54,486,54);
  f.text(14,70,"about 49,000 are searched on each roll","f-sub");
  f.path("M14 80 L170 142 M486 80 L330 142","dim");
  f.line(170,142,330,142,"hot-s");
  f.text(176,160,"BEST FAULT-FREE RESULT · 84–96% BAND","f-sub");
  f.path("M170 150 L212 196 M330 150 L288 196","dim");
  f.box(212,196,160,46,"contract","so every contract can be met","hot-s");
  f.text(14,288,"FOUR BUDGETS THAT FIGHT EACH OTHER","f-ttl");
  [["credit line",126],["c4 trunk",92],["lattice",140],["drift ceiling",74]].forEach(([t,v],i)=>{
    const y=306+i*24;f.text(14,y+3,t.toUpperCase(),"f-ttl");f.line(150,y,150+v,y,"hot-s");});
  f.text(14,412,"the median contract is met by about 0.5% of legal racks","f-sub");
 }},

{slug:"wall",n:"06",kicker:"AMBIENT",title:"A desktop that follows the weather",focus:["cyberwall"],
 figs:"1,415 lines · 96 GIFs · 15-minute poll",
 shot:{src:"media/cyberwall.gif",alt:"A pixel art city at night in the rain, animated",
       cap:"recording \u00b7 this is the rainy version for ten at night"},
 tech:`<p>There are 96 generated GIFs, one for every hour and weather state. A launchd agent polls Open-Meteo every 15 minutes and reloads the wallpaper only when the state changes.</p>`,
 plain:`<p>The desktop background is a small animated city that knows what hour it is and what the weather is doing outside, and picks the matching version, so when it starts raining where you are it starts raining on the wallpaper.</p>`,
 comm:`<p>I wanted a living background image that changes with the time of day and the weather, and I could not find a set of images that fit what I wanted, so I worked with Claude to build procedurally generated images that change per hour and weather state.</p>`,
 fig(f){
  const cw=17,ch=22,x0=64,y0=64;
  f.text(x0,y0-10,"HOUR 00");f.text(x0+23*cw-30,y0-10,"HOUR 23");
  ["clear","rain","heavy","storm"].forEach((r,j)=>{
    f.text(8,y0+j*ch+14,r.toUpperCase(),"f-ttl");
    for(let i=0;i<24;i++)f.rect(x0+i*cw,y0+j*ch,cw-3,ch-4,(i===21&&j===3)?"hot-s":"dim");});
  f.text(8,y0+4*ch+26,"ONE 12-SECOND LOOP FOR EACH HOUR AND WEATHER STATE","f-ttl");
  f.box(64,y0+4*ch+44,198,46,"open-meteo","polled every 15 minutes");
  f.arrow(262,y0+4*ch+67,314,y0+4*ch+67,"hot-s");
  f.box(314,y0+4*ch+44,172,46,"reload","only when the state changes","hot-s");
  f.text(8,y0+4*ch+122,"a failed lookup holds the last state for three hours","f-sub");
 }},

{slug:"rails",n:"07",kicker:"SEPARATION",title:"Rules that run without a screen",focus:["cybertrain"],
 figs:"2,934 lines · seeded maps",
 live:{src:"live/wasteland-rails/index.html",note:"the same sim.js the tests run against",
       cap:"live \u00b7 the rules here know nothing about the screen drawing them"},
 tech:`<p>A train economy prototype where <code>sim.js</code> holds the rules and contains no DOM code, and every tunable number lives in <code>config.js</code>. The simulation is testable with no browser in the loop.</p>`,
 plain:`<p>It is a game about running trains through dangerous country, where the creatures and the costs both bite.</p>
   <p>The game's rules are kept separate from what you see on screen, so they can be tested on their own.</p>`,
 comm:`<p>I like keeping the rules and the UI separate precisely because it is easier to test via simulation. Requiring a UI to test basic rules complicates things and makes it harder to iterate, especially while working with LLM tools, which can quickly iterate on the simulation output and find issues faster than I can.</p>`,
 fig(f){
  f.box(20,56,140,46,"config.js","every tunable number");
  f.arrow(90,102,90,146);
  f.rect(20,146,232,116,"dash");
  f.text(28,164,"NO DOM INSIDE THIS LINE","f-ttl");
  f.box(36,180,200,62,"sim.js","rules · routes · economy","hot-s");
  f.arrow(252,211,314,211);
  f.box(314,180,172,62,"ui","canvas and input");
  f.text(20,300,"THE SIMULATION RUNS WITH NO BROWSER IN THE LOOP","f-ttl");
  f.text(20,316,"so the rules can be tested on their own","f-sub");
  f.text(20,338,"maps come from a seed, so a run is reproducible","f-sub");
 }},

{slug:"pet",n:"08",kicker:"PACE",title:"755 commits in 17 days",focus:["netling"],
 figs:"59,591 lines · 755 commits · 17 days · PWA",
 shot:{src:"media/netling.png",alt:"The netling app: a green pixel pet on a CRT screen beside its stats and action buttons",
       cap:"screenshot \u00b7 a newly hatched Bitling, from the install screenshots"},
 links:[["play","https://anthonyraborn.github.io/netling"],["source",G+"netling"]],
 tech:`<p>A real time virtual pet that keeps living while the page is closed, grows according to how it is raised, and flatlines if neglected. Each death leaves a fragment that shapes the next generation.</p>`,
 plain:`<p>It is a pet that lives on a web page. It keeps growing and getting hungry while the page is closed, and if you ignore it long enough it dies, permanently. Each death leaves something behind that shapes the next one.</p>
   <p>It went from nothing to finished in seventeen days, with 173 saves of work on the busiest day.</p>`,
 comm:`<p>I had finished a lot of my pending work around then, and decided to do as much as I possibly could on netling while I had the time.</p>`,
 fig(f){
  hist(f,H1,250,"SEP 27","OCT 13",755,17);
  f.text(34,314,"three days off in the middle, then the busiest day so far","f-sub");
  f.text(34,344,"REAL-TIME: IT KEEPS LIVING WHILE THE PAGE IS CLOSED","f-ttl");
  f.text(34,360,"each death leaves a fragment that shapes the next generation","f-sub");
 }},

{slug:"pet2",n:"09",kicker:"SCALE",title:"The sequel, aimed at phones and desktops",focus:["netling-2"],
 figs:"69,927 lines · 736 commits · 16 days · 2 target platforms",
 shot:{src:"media/netling-2.png",alt:"Six case designs for the sequel, each around the same pixel creature",
       cap:"prototype \u00b7 case designs drawn while planning the sequel, not a shipped screen"},
 links:[["source",G+"netling-2"]],
 tech:`<p>The sequel reached 69,927 lines of source and 736 commits in sixteen days. It has three eggs plus a hidden fourth, and Android (Capacitor) and desktop (Tauri) wrappers around a game core that is still plain ES modules and canvas. There is no playable release yet.</p>`,
 plain:`<p>The sequel, sixteen days in, is being built as an app you install on an Android phone or a desktop instead of a web page, and it is not playable yet.</p>
   <p>The game inside is still the same plain files that would run in any browser, and the app is a wrapper around them.</p>`,
 comm:`<p>I had been playtesting netling while building it, and I had already found limitations the original design enforced. Netling 2.0 could carry over the pieces that were working and address those directly from the beginning. The limitations were significant enough in playtest that I saw no reason to wait.</p>`,
 fig(f){
  hist(f,H2,232,"OCT 13","OCT 29",736,17);
  f.text(34,296,"the handover day counts in both: netling's last is netling 2.0's first","f-sub");
  f.box(34,320,210,48,"android","capacitor");
  f.box(268,320,210,48,"desktop","tauri");
  f.text(34,392,"THE SAME GAME CORE RUNS ON ANDROID AND DESKTOP","f-ttl");
 }},

{slug:"rig",n:"10",kicker:"SHIPPED",title:"A Rust terminal dashboard, published on crates.io",focus:["ghostwire"],
 figs:"12,093 lines · 50 commits · 3 platforms · crates.io",
 shot:{src:"media/ghostwire.gif",alt:"ghostwire booting in a terminal and opening several of its feed panels",
       cap:"recording \u00b7 ghostwire running on its simulated demo feeds"},
 links:[["crates.io","https://crates.io/crates/ghostwire-tui"],
        ["releases",G+"ghostwire/releases/latest"],["source",G+"ghostwire"]],
 tech:`<p>ghostwire is a terminal dashboard for nine live public feeds, styled as a netrunner rig. A stale feed decays, a failed request is ICE, a rate limit is a trace. Published to crates.io with installers for macOS, Linux and Windows.</p>`,
 plain:`<p>It is a wall of live information, such as share prices, earthquakes, aircraft overhead and storms on the sun, made to look like the console of a hacker in an old film. Leave it running on a spare monitor.</p>
   <p>Anyone can install it: it runs on Windows, Mac and Linux, and nearly all of it works without signing up for anything.</p>`,
 comm:`<p>ghostwire felt like an easy one to ship, since it is entirely in Rust and I was curious what deployment for Rust actually looked like. It was not that difficult, and I am now set up to put more on crates.io whenever I feel like it.</p>`,
 fig(f){
  ["atmos","seismic","helios","skytraffic","markets","threats"].forEach((n,i)=>{
    const x=24+(i%3)*160,y=48+Math.floor(i/3)*92;
    f.box(x,y,146,74,n,i===1?"diving":"nominal",i===1?"hot-s":"");});
  f.arrow(97,232,97,266,"hot-s");
  f.box(24,266,462,70,"full-screen dive","a radar scope, a bar chart, a block-font readout","hot-s");
  f.text(24,366,"EVERY 45 SECONDS THE RIG TAKES OVER THE SCREEN","f-ttl");
  f.text(24,382,"a stale feed decays · a failed request is ICE · a rate limit is a trace","f-sub");
  f.text(24,402,"eight of the nine feeds need no API key","f-sub");
 }},

{slug:"cockpit",n:"11",kicker:"REFLEXIVE",title:"A dashboard for one project folder",focus:["cockpit"],
 figs:"7,681 lines · 20 commits · 6 days",
 shot:{src:"media/cockpit.gif",alt:"cockpit showing git status, file activity, processes and a diff for a small project",
       cap:"recording \u00b7 cockpit watching a demo project while a script writes files into it"},
 tech:`<p>It watches one project directory and shows git status and history, live file activity with size deltas, the processes running inside it, and a pane for asking Claude what just happened, including the token budget it is spending.</p>`,
 plain:`<p>It is a screen that watches one project folder while you work inside it, showing what files changed, what programs are running, what the AI assistant is doing and how much of the budget it has spent.</p>`,
 comm:`<p>cockpit was built to keep an eye on a project folder with long-running simulations, or anything else that repeatedly touches files in a directory. It works as intended, so no further development is planned.</p>`,
 fig(f){
  f.rect(20,44,466,28);
  f.text(28,62,"~/projects/pipeline                                   14:02:11","f-sub");
  f.box(20,80,230,98,"git","main ↑2 · 3 changed");
  f.box(256,80,230,98,"file activity","+2.1 MB / 10m");
  f.box(20,184,230,98,"processes","python3 etl.py  38%");
  f.box(256,184,230,98,"claude","$0.01 · 6.3s · 49% of 5h","hot-s");
  f.text(20,306,"TAB PANE · Z ZOOM · C ASK · D DIFF · Q QUIT","f-sub");
  f.text(20,336,"A DASHBOARD FOR ONE PROJECT FOLDER","f-ttl");
  f.text(20,352,"including the token budget it is spending while you watch","f-sub");
 }},

{slug:"orch",n:"12",kicker:"THE DEAD END",title:"The one that did not work",focus:["orchtui"],
 figs:"8,329 lines · local models only",
 tech:`<p>It runs local LLMs through llama.cpp, arranged as role-based agents in a DAG. Outbound network is blocked to everything but loopback unless explicitly allowed, and every step pauses for a human decision before it executes.</p>`,
 plain:`<p>Several AI models working together on one job, all of them running on your own machine. They cannot reach the internet unless you allow it, and none of them acts until a person says yes.</p>
   <p>It did not work out; the models you can run at home were not good enough on this hardware to be worth using.</p>`,
 comm:`<p>orchtui developed into a dead end I could not get out of with my hardware limitations. Local models are hard to work with as it is, and that made the whole thing basically useless to me.</p>
   <p>I included it because I think that learning from failure is a valuable skill, as is knowing when to stop working on a project that has hit a dead end.</p>`,
 fig(f){
  f.rect(14,40,472,160,"dash");
  f.text(22,58,"LOOPBACK ONLY. OUTBOUND BLOCKED UNLESS ALLOWED","f-ttl");
  [[30,"plan"],[195,"write"],[360,"check"]].forEach(([x,t],i)=>{
    f.box(x,80,110,56,t,"local model");
    if(i<2){f.arrow(x+110,108,x+136,108);f.rect(x+138,96,24,24,"hot-s");f.text(x+143,112,"OK","f-ttl");
      f.arrow(x+164,108,x+193,108);}});
  f.text(22,246,"EVERY STEP PAUSES FOR A HUMAN DECISION","f-ttl");
  f.text(22,262,"approve · reject · edit · pause · re-run","f-sub");
  f.text(22,292,"THE LOCAL MODELS WERE NOT GOOD ENOUGH","f-ttl");
  f.text(22,308,"at least not on my hardware, for this kind of job","f-sub");
 }},

{slug:"body",n:"13",kicker:"THE OUTLIER",title:"Real workouts off a watch",focus:["garmin"],
 figs:"1,532 lines · FIT parsing · workout planning",
 tech:`<p>Pulls activity summaries and original FIT files from Garmin Connect, then keeps a weekly check in and a periodic physical test alongside them, so a model planning the next block has context the watch does not hold.</p>`,
 plain:`<p>garmin-analysis reads real workouts off a watch and adds a weekly check in and a periodic physical test, so an AI helping to plan training has information the watch does not record.</p>`,
 comm:`<p>garmin-analysis is an interface for letting Claude help plan my workout regime around a pretty minor injury, with some extra information Garmin does not take into consideration.</p>`,
 fig(f){
  const x0=34,x1=472,y=110,X=i=>x0+(i/7)*(x1-x0);
  f.line(x0,y,x1,y);
  for(let i=0;i<8;i++){f.line(X(i),y,X(i),y-13);f.text(X(i)-8,y-19,"W"+(i+1),"f-sub");}
  [0,3,6].forEach(i=>{f.line(X(i),y,X(i),y+28,"hot-s");f.text(X(i)-16,y+42,"TESTS","f-ttl");});
  f.text(34,176,"WEEKLY CHECK-IN, PERIODIC PHYSICAL TEST","f-ttl");
  f.text(34,192,"things the watch does not track","f-sub");
  f.box(34,224,214,52,"garmin connect","activities + original FIT");
  f.arrow(248,250,300,250);
  f.box(300,224,186,52,"csv","one row per activity");
  f.text(34,330,"SO A MODEL CAN PLAN THE NEXT BLOCK","f-ttl");
  f.text(34,346,"using more than step counts","f-sub");
  f.text(34,376,"the API key lives in the environment, never in the file","f-sub");
 }},

{slug:"aesthetic",n:"14",kicker:"THROUGH-LINE",title:"A shared cyberpunk setting",focus:NEON,
 figs:"6 projects · cyberpunk",
 tech:`<p>The cyberpunk setting decides the vocabulary, failure states and interface metaphors as well as the styling: a dropped request becomes ICE, a neglected pet flatlines, cyberware overruns a thermal budget.</p>`,
 plain:`<p>Most of these look and sound like the same place, with rain, neon and machines wired into people.</p>
   <p>The setting does the naming as well as the colouring, so a request that fails is <em>ICE</em>, a neglected pet <em>flatlines</em>, and too many implants make you <em>drift</em> until you are not quite yourself.</p>`,
 comm:`<p>I chose cyberpunk for a few reasons, the first being that it feels relevant to the current political, social and economic environment, where corporations and high net worth individuals are more and more obviously influencing politics and the divide between the rich and everyone else seems larger than it has been since the Gilded Age in the US.</p>
   <p>It is also nice to look at, in my opinion, since it is basically a dark mode with clear highlights, selective use of bright colors and clearly legible monospaced text, and the callback to older, mostly pre-social media tech is a nice change from a modern web that is a bit too focused on form over function. There is also a lot of media to draw inspiration from, either directly or indirectly.</p>`,
 fig(f){
  [["ICE","a request that failed","ghostwire"],
   ["FLATLINE","a pet left too long","netling"],
   ["DRIFT","you stop being yourself","chrome & bone"],
   ["SKIM","shaving the margin","wasteland rails"]].forEach(([t,m,pr],i)=>{
    const y=64+i*68;
    f.text(14,y+4,t,"f-ttl");f.line(104,y,186,y,"hot-s");
    f.text(196,y+4,m,"f-sub");f.text(196,y+20,pr.toUpperCase(),"f-ttl");});
  f.text(14,352,"MOST OF THE PROJECTS SHARE THE SAME CYBERPUNK VOCABULARY","f-ttl");
  f.text(14,368,"the setting decides the failure states and the metaphors","f-sub");
  f.text(14,382,"as well as how things are coloured","f-sub");
 }},

{slug:"cost",n:"15",kicker:"THE COST",title:"What working this way took",focus:ALL,
 tech:`<p>Prior experience in R and Shiny supplies the architecture and design judgement that directs the model. It does not supply hands on depth in the newer languages, so the author has reviewed the Rust here but written little of it directly.</p>`,
 plain:`<p>Working this way means the things you imagine actually get built, and it also means skipping the struggle through a new language yourself, which is how most people learn one.</p>`,
 comm:`<p>Working with Claude has given me a lot of opportunity to create the things I want to create. It has also kept me from developing more fine tuned programming skills in languages like Rust.</p>`,
 fig(f){
  f.text(14,46,"WHAT IT GAVE","f-ttl");f.line(14,56,236,56,"hot-s");
  ["the things got built","working in four languages at once",
   "deployment i had not tried"].forEach((t,i)=>f.text(14,78+i*20,t,"f-sub"));
  f.text(266,46,"WHAT IT TOOK","f-ttl");f.line(266,56,488,56,"dim");
  ["hands-on depth in rust","the trial and error","learning by failing",
   "consistency, early on"].forEach((t,i)=>f.text(266,78+i*20,t,"f-sub"));
  f.box(14,200,474,56,"what carried over","R and Shiny: what a language can do, and how to think about architecture","hot-s");
  f.text(14,300,"NINE YEARS OF R CAME FIRST","f-ttl");
  f.text(14,316,"and that is where the design judgement came from","f-sub");
 }},

{slug:"next",n:"16",kicker:"OPEN",title:"What I would do differently",focus:ALL,
 figs:"7 live · 1 parked · 1 dead end · 1 in planning",
 tech:`<p>netling 2.0 has a plan, a simulator and a sprite prototype, but no playable app yet, and its README says so first. cockpit stopped when it was doing its job, orchtui is a dead end, and the rest ship.</p>`,
 plain:`<p>Most of these you can use today. cockpit stopped once it was good enough, orchtui did not work out, and the sequel is not a playable game yet, which its own front page says before it says anything else.</p>`,
 comm:`<p>I would be more consistent in how I use Claude, and more aware of the practices earlier: CLAUDE.md and AGENTS.md files, handoff documents, planning before doing.</p>`,
 fig(f){
  [["live",["ghostwire","netling","chrome & bone","mnemonic deck","cyberwall","wasteland rails","garmin analysis"]],
   ["parked",["cockpit"]],["dead end",["orchtui"]]]
  .forEach(([t,items],i)=>{
    const x=14+i*166;
    f.text(x,46,t,"f-ttl");f.line(x,56,x+146,56,i===0?"hot-s":"dim");
    items.forEach((n,j)=>f.text(x,76+j*20,n.toUpperCase(),"f-sub"));});
  f.text(14,246,"NETLING 2.0 IS PLANNING, SIMULATOR AND SPRITES","f-ttl");
  f.text(14,262,"the README says so before anything else","f-sub");
  f.text(14,300,"THIS PAGE IS A WORK IN PROGRESS AND WILL CONTINUE TO GROW","f-ttl");
 }},

{slug:"elsewhere",n:"17",kicker:"THE DAY JOB",title:"A career building statistical solutions prior to these projects",focus:ALL,
 figs:"7 R projects · 79,726 lines · 1,280 commits",
 tech:`<p>My R work goes back to October 2017. It covers seven projects with 79,726 lines and 1,280 commits, including three packages on CRAN and a deployed product. It is on <a class="sib" href="index.html" data-sibling="premise">its own page</a>.</p>`,
 plain:`<p>There are nine years of statistical software in R behind this, which is the day job and has <a class="sib" href="index.html" data-sibling="premise">its own page</a>.</p>`,
 comm:`<p>My professional work with R and similar statistical programming languages has taught me what can be done with computers and gives me the insight to direct Claude to create these other projects. That work is on <a class="sib" href="index.html" data-sibling="premise">its own page</a>.</p>`,
 fig(f){
  f.box(14,70,210,70,"nine years of R","psychometrics · 79,726 lines","hot-s");
  f.box(276,70,210,70,"this page","Rust, JS, Python · 167,145 lines");
  f.arrow(228,105,272,105,"dim");
  f.text(14,190,"THE R WORK CAME FIRST","f-ttl");
  f.text(14,206,"R and Shiny are where I learned what a language can do","f-sub");
 }},
];

start({PROJECTS,CHAPTERS,sibling:"index.html",axis:AXIS});
