/* The professional page: nine years of psychometrics in R, and directCare.
   Audience: fellow psychometricians and potential clients. The AI method is one honest
   chapter, not the pitch. Chapters marked drafted:1 carry my wording, not Anthony's. */
// the query is the cache key: bump it whenever engine.js changes, or a browser
// that already has the old module will keep running it
import {start,layout} from "./engine.js?v=8";

/* Dates are first and last commit, read off the repositories on 2026-10-30. The map
   places every box from these: no coordinate below was chosen by hand. */
const PROJECTS={
  "ShortForm":      {label:"ShortForm",      lines:10816,commits:522,lang:"R",from:"2017-10-11",to:"2026-09-10"},
  "caMST":          {label:"caMST",          lines:5907, commits:171,lang:"R",from:"2018-03-30",to:"2026-10-29"},
  "cvIRT":          {label:"cvIRT",          lines:2954, commits:46, lang:"R",from:"2018-12-10",to:"2026-09-14"},
  "mecfa":          {label:"mecfa",          lines:3192, commits:69, lang:"R",from:"2020-10-16",to:"2021-05-18"},
  "repsd":          {label:"repsd",          lines:3506, commits:84, lang:"R",from:"2021-12-15",to:"2026-09-26"},
  "shinyShortForm": {label:"shinyShortForm", lines:2786, commits:33, lang:"R",from:"2026-05-05",to:"2026-09-19"},
  "directCare":     {label:"directCare",     lines:50565,commits:355,lang:"R",from:"2026-05-28",to:"2026-10-26"},
};
const AX={x0:74,x1:688,from:"2017-07-01",to:"2027-01-01"};
const MAP=layout(PROJECTS,{...AX,y0:46,gap:14,hMin:34,hMax:112});
const AXIS={y0:30,y1:MAP.bottom+16,
  ticks:[2018,2019,2020,2021,2022,2023,2024,2025,2026]
    .map(y=>[MAP.X(y+"-01-01"),String(y)])};
const G="https://github.com/AnthonyRaborn/";
const ORCID="https://orcid.org/0000-0002-8083-4739";
const D="https://doi.org/";
const C="https://cran.r-project.org/package=";
const ALL=Object.keys(PROJECTS);
const PKGS=["ShortForm","caMST","repsd","mecfa","cvIRT"];

const CHAPTERS=[
{slug:"premise",n:"01",kicker:"THE RECORD",title:"Nine years of psychometrics",focus:ALL,
 figs:"7 public projects · 79,726 lines · 1,280 commits · 2017 to 2026",
 links:[["github profile","https://github.com/AnthonyRaborn"],["orcid",ORCID]],
 tech:`<p>ShortForm begins in October 2017 and is still maintained. The seven R projects here come to 79,726 lines and 1,280 commits over nine calendar years, covering short form construction, adaptive testing, differential item functioning, factor analysis, model selection, and one deployed product. The counts are of public repositories only, which is why 2025 reads as empty: that year's R work was internal tooling for an employer and could not be released.</p>`,
 plain:`<p>Psychometrics is the statistics of testing, which means working out whether a test measures what it claims to and whether it scores people fairly; these are the tools for doing that work in R.</p>
   <p>I have kept most of them running and added to them as the research needed it, in some cases for most of a decade, and the chart has a gap at 2025 because the R I wrote that year went to an employer who kept it in house.</p>`,
 comm:`<p>I am a trained and practicing psychometrician, which is part of why I am still maintaining the R packages for psychometrics that I first wrote in graduate school.</p>
   <p>The gap at 2025 is not a year off; I was writing a good deal of R that year, scripts and packages to automate workflows for the job, but it was specific enough to the industry to count as a trade secret and that employer had relatively strict policies about producing open source, so none of it could be shared and none of it is counted here.</p>`,
 // the map behind this chapter already is the timeline, so the figure takes the other
 // cut: how the nine years were actually spent, counted across all seven repositories
 fig(f){
  const yrs=[[2017,24],[2018,194],[2019,115],[2020,159],[2021,79],
             [2022,65],[2023,55],[2024,27],[2025,0],[2026,562]];
  const x0=30,bw=40,gapw=5,base=300,max=562,hMax=210;   // ten bars inside a 520 wide frame
  f.line(x0-8,base,x0+yrs.length*(bw+gapw),base,"dim");
  yrs.forEach(([y,c],i)=>{
    const x=x0+i*(bw+gapw), h=(c/max)*hMax;
    if(c)f.bar(x+bw/2,base,h,bw,c>400?"hot-s":"");
    f.text(x+4,base+16,String(y),"f-sub");
    f.text(x+4,base-h-7,c?String(c):"none","f-sub");});
  f.text(40,56,"COMMITS PER YEAR ACROSS MY PUBLIC R REPOSITORIES","f-ttl");
  f.text(40,72,"counted on 2026-10-30","f-sub");
  f.text(40,344,"2025 IS EMPTY BECAUSE THAT YEAR'S R COULD NOT BE PUBLISHED","f-ttl");
  f.text(40,360,"it was internal tooling for an employer, so none of it is public","f-sub");
  f.text(40,386,"2026 IS THE LARGEST YEAR SO FAR","f-ttl");
 }},

{slug:"packages",n:"02",kicker:"THE PACKAGES",title:"R packages for testing and measurement",focus:PKGS,
 figs:"5 packages · 892 commits · measurement and test theory",
 links:[["ShortForm",G+"ShortForm"],["caMST",G+"caMST"],["repsd",G+"repsd"],
        ["mecfa",G+"mecfa"],["cvIRT",G+"cvIRT"]],
 tech:`<p>ShortForm automates short form creation for scales. caMST handles mixed computerized adaptive multistage testing. repsd implements the Root Expected Proportion Squared Difference statistic for detecting DIF. mecfa runs metaheuristic exploratory and confirmatory factor analysis. cvIRT uses cross validation and bootstrap methods for IRT model selection.</p>`,
 plain:`<p>These tools all help with the same general job, which is working out whether a test measures what it claims to.</p>
   <p>They cover picking the shortest set of questions that still measures the same thing, running an exam that adapts as you answer it, and checking whether a question is unfair to one group of people.</p>`,
 comm:`<p>ShortForm started with one of my graduate school advisors. He had some code from a publication, he wanted it turned into a package, and I was one of the best R programmers in the department. I expanded it to include additional algorithms for additional research, which was also published, and it has been my most successful work, which is why I still maintain and improve it.</p>
   <p>repsd is being expanded into polytomous items by a student of my PhD advisor. He wrote the polytomous code based on the binary code and has been testing my updates to make sure it is consistent and implemented correctly, which is taking some time.</p>`,
 fig(f){
  const x0=138,W=230,max=522;
  [["ShortForm",522,"automatic short form creation"],["caMST",171,"adaptive multistage testing"],
   ["repsd",84,"differential item functioning"],["mecfa",69,"metaheuristic factor analysis"],
   ["cvIRT",46,"IRT model selection"]].forEach(([n,c,d],i)=>{
    const y=60+i*50,bl=Math.max(3,(c/max)*W);
    f.text(8,y+3,n.toUpperCase(),"f-ttl");
    f.line(x0,y,x0+bl,y,i===0?"hot-s":"");
    f.text(x0+bl+7,y+3,c+" commits","f-sub");
    f.text(8,y+17,d,"f-sub");});
  f.text(8,330,"COMMITS IN EACH PACKAGE","f-ttl");
  f.text(8,346,"ShortForm's first commit was in October 2017","f-sub");
 }},

{slug:"cran",n:"03",kicker:"PUBLISHED",title:"On CRAN",focus:["ShortForm","caMST","repsd"],
 figs:"ShortForm 1.0.0 \u00b7 repsd 1.0.1 \u00b7 caMST 1.0.0",
 links:[["ShortForm on CRAN",C+"ShortForm"],["repsd on CRAN",C+"repsd"],
        ["caMST on CRAN",C+"caMST"]],
 tech:`<p>ShortForm is on CRAN at 1.0.0, published 2026-09-10. repsd is on CRAN at 1.0.1 from 2023-04-18, with 2.0.0 written and unsent. caMST was archived on 2023-03-16 because its dependency <code>mstR</code> had just been archived, and CRAN does not allow a package to depend on an archived one. caMST 1.0.0 removes that dependency by vendoring the handful of functions it actually used and relicenses to GPL (>= 3) to match. It passed its checks with no errors, warnings or notes on three operating systems, and CRAN accepted it back in early November 2026.</p>`,
 plain:`<p>R has a central library that strangers install from, where a human reviewer reads your submission and can refuse it, and the automated checks keep running for as long as the package is listed.</p>
   <p>One of these was removed through no fault of its own, because a different package it relied on was removed first and the rule is that you cannot depend on something that is gone. The fix was to stop depending on it, and the package went back into the library in November 2026.</p>`,
 comm:`<p>When caMST's dependency was archived, I could either wait for it to come back or stop relying on it. I chose to bring the few functions I needed into caMST itself, which is how it got back onto CRAN.</p>`,
 fig(f){
  [["ShortForm","1.0.0 \u00b7 2026-09-10","on cran"],["repsd","1.0.1 \u00b7 2023-04-18","on cran"]]
    .forEach(([n,v,st],i)=>{
      const y=44+i*46;
      f.box(14,y,190,36,n,v,"hot-s");
      f.arrow(204,y+18,250,y+18,"hot-s");
      f.box(252,y,140,36,st,"");});
  f.text(14,160,"AND ONE THAT WAS ARCHIVED FOR A WHILE","f-ttl");
  f.box(14,176,150,44,"mstR","archived","dash");
  f.arrow(164,198,208,198,"dim");
  f.box(210,176,150,44,"caMST","archived 2023-03-16","dash");
  f.text(14,238,"CRAN archives a package when its dependency is archived","f-sub");
  f.line(14,256,486,256,"dim");
  f.text(14,278,"caMST 1.0.0 NO LONGER NEEDS mstR","f-ttl");
  f.box(14,294,150,44,"vendored","the functions it used","hot-s");
  f.arrow(164,316,208,316,"hot-s");
  f.rect(210,302,90,28,"hot-s");f.text(216,320,"0 / 0 / 0","f-ttl");
  f.arrow(302,316,346,316,"hot-s");
  f.box(348,294,140,44,"on cran","november 2026","hot-s");
  f.text(14,362,"no errors, warnings or notes on three operating systems","f-sub");
 }},

{slug:"research",n:"04",kicker:"THE RESEARCH",title:"The papers behind the packages",focus:["ShortForm","caMST","repsd"],
 figs:"2018 to 2025 \u00b7 full list on ORCID",
 links:[["orcid",ORCID]],
 tech:`<p>These are selected from my publications on ORCID. The first four describe the methods used in ShortForm, caMST and repsd. The last is from my applied work on clinical trials.</p>
   <p class="cite">Raborn &amp; Leite (2018). <a class="cite" href="${D}10.1177/0146621617752993">ShortForm: An R package to select scale short forms with the ant colony optimization algorithm</a>. <i>Applied Psychological Measurement</i>.</p>
   <p class="cite">Raborn, Leite &amp; Marcoulides (2020). <a class="cite" href="${D}10.1177/0013164420906600">A comparison of metaheuristic optimization algorithms for scale short-form development</a>. <i>Educational and Psychological Measurement</i>.</p>
   <p class="cite">Raborn &amp; Sar\u0131 (2021). <a class="cite" href="${D}10.21031/epod.871014">Mixed adaptive multistage testing: A new approach</a>. <i>Journal of Measurement and Evaluation in Education and Psychology</i>.</p>
   <p class="cite">Huggins-Manley, Raborn, et al. (2024). <a class="cite" href="${D}10.1111/jedm.12394">A nonparametric composite group DIF index for focal groups stemming from multicategorical variables</a>. <i>Journal of Educational Measurement</i>.</p>
   <p class="cite">Raborn et al. (2025). <a class="cite" href="${D}10.1007/s11136-025-03998-9">Psychometric analysis of the Neuro-QoL Fatigue in generalized myasthenia gravis using data from a phase 3 trial</a>. <i>Quality of Life Research</i>.</p>`,
 plain:`<p>Three of the packages on this page are built on methods from my own published research.</p>
   <p>The newest paper is from 2025, the year the code chart shows as empty. It is applied work from a clinical trial, which is part of what that year went to.</p>`,
 comm:`<p>Unshared research is about as good as no research. I want my work to be usable by others, which is what led me to create many of these R packages in the first place. Besides distributing the packages on CRAN and GitHub, I have tried to publish papers alongside them as well.</p>
   <p>Even then, some work cannot be packaged but still needs to be shared; some of my publications come from more general data analysis scripts, where it is the results that get shared. A selection of these different kinds of publications is here, with the rest available on <a class="cite" href="${ORCID}">my ORCID</a>.</p>`,
 fig(f){
  f.text(14,40,"WHICH PAPERS WENT INTO WHICH PACKAGES","f-ttl");
  const P=[["APM 2018","the shortform package paper"],["EPM 2020","metaheuristics for short forms"],
    ["EPOD 2021","mixed adaptive multistage tests"],["JEM 2024","a composite group DIF index"],
    ["QOLR 2025","fatigue scale, phase 3 trial"]];
  P.forEach(([t,s],i)=>f.box(14,58+i*62,226,44,t,s,i<4?"":"dash"));
  [["ShortForm",111],["caMST",182],["repsd",244]].forEach(([n,y])=>f.box(330,y,156,44,n,"R package","hot-s"));
  [[80,133],[142,133],[204,204],[266,266]].forEach(([y1,y2])=>f.arrow(240,y1,328,y2,"hot-s"));
  f.text(254,332,"applied work, not tied to a package","f-sub");
  f.text(14,394,"MORE PUBLICATIONS ARE LISTED ON ORCID","f-ttl");
 }},
{slug:"shiny",n:"05",kicker:"IN REACH",title:"For the people who do not write R",focus:["shinyShortForm","ShortForm"],
 figs:"2,786 lines · 33 commits · May to September 2026",
 links:[["shinyShortForm",G+"shinyShortForm"],["ShortForm",G+"ShortForm"]],
 tech:`<p>shinyShortForm wraps the ShortForm package in a Shiny interface. The method stays in the package and the app calls into it, so the package and the app always run the same code.</p>`,
 plain:`<p>Most of the people who build tests do not write code, so this puts the short form method behind a web page and you can run it without writing any R.</p>`,
 comm:`<p>shinyShortForm is a proof of concept and a tech demo. I built it to explore more of what Shiny could do, and that is what led to building out the Direct Care Analytics apps.</p>`,
 fig(f){
  f.box(14,80,150,58,"ShortForm","the method, as a package","hot-s");
  f.arrow(164,109,216,109);
  f.box(218,80,150,58,"shinyShortForm","a web interface");
  f.arrow(368,109,420,109);
  f.box(422,80,80,58,"user","no R");
  f.path("M89 138 L89 186 L286 186","dim");
  f.text(96,202,"the app calls the package's own functions","f-sub");
  f.text(14,262,"THE METHOD IS WRITTEN ONCE, IN THE PACKAGE","f-ttl");
  f.text(14,278,"so there is only one copy of it to keep correct","f-sub");
  f.text(14,320,"MOST PEOPLE WHO BUILD TESTS DO NOT WRITE CODE","f-ttl");
 }},

{slug:"care",n:"06",kicker:"THE PRODUCT",title:"directCare",focus:["directCare"],
 figs:"50,565 lines · 355 commits · May to October 2026",
 // no link: directCare is on a private remote
 links:[["direct care suite","https://directcareanalytics.com"]],
 tech:`<p>directCare is the financial planning engine behind the Direct Care Suite. Its repository also specifies deployment, a reverse proxy, billing, login lockout and an LLM QA design. It models startup cost and membership ramp before a practice opens, and projects break-even timing and tracks revenue from bookkeeping data after it does. It is the largest single thing here by a wide margin.</p>`,
 plain:`<p>Unlike the packages above this one is a product, so it carries infrastructure, logins, billing and a deployment process around it.</p>
   <p>It answers money questions for small medical practices that bill patients directly instead of billing insurers: when the practice will break even, what happens if membership grows more slowly than planned, and how much the owner can take home.</p>`,
 comm:`<p>My wife was looking for forecasting for her direct specialty care practice. She and I talked about what she might find helpful for planning and tracking her finances, and this is what came out of those conversations.</p>`,
 fig(f){
  f.box(14,44,250,62,"directCare","50,565 lines of R · 355 commits","hot-s");
  ["deploy","reverse proxy","billing","login lockout","llm qa","saved scenarios"].forEach((t,i)=>{
    const x=14+(i%3)*160,y=124+Math.floor(i/3)*54;
    f.box(x,y,146,42,t,"");});
  f.text(14,254,"MAY 28 TO OCTOBER 26, 2026","f-ttl");
  const x0=14,x1=486,X=d=>x0+(d/152)*(x1-x0);
  f.line(x0,278,x1,278,"dim");
  f.line(X(0),272,X(151),272,"hot-s");
  f.text(x0,296,"commits from May to October 2026","f-sub");
 }},

{slug:"method",n:"07",kicker:"THE METHOD",title:"How the work gets made",focus:ALL,
 tech:`<p>Recent work is written with Claude under direction and review. The model produces most of the code, and the design decisions, the architecture and the call on whether a result is good enough stay with the author, which every public repository states in its README.</p>`,
 plain:`<p>Some of the recent work is written with an AI, which means you describe what you want, the machine writes it, and you read what came back and either keep it or send it back.</p>
   <p>Deciding what to build, and deciding whether what came back is good enough, stays with the person doing the asking.</p>`,
 comm:`<p>When Claude writes R code, I usually check a few things. Variable names come first: Claude defaults to short, nondescript names or abbreviations, and I prefer descriptive ones. Formatting is mostly handled by an automatic formatter (Air, which comes with Positron). I also look at what it pulls in as dependencies. And of course I test the code and the workflow the way I think the package or script should be used, to spot any pain points that need a human touch for actual usability.</p>`,
 fig(f){
  const y=120,w=112,h=52,xs=[20,180,340];
  f.box(xs[0],y,w,h,"brief","what to build");
  f.box(xs[1],y,w,h,"model","writes the code");
  f.box(xs[2],y,w,h,"review","a human reads it","hot-s");
  f.arrow(xs[0]+w,y+h/2,xs[1]-2,y+h/2);
  f.arrow(xs[1]+w,y+h/2,xs[2]-2,y+h/2);
  f.arrow(xs[2]+w,y+h/2,492,y+h/2,"hot-s");
  f.text(452,y+h/2-9,"KEEP","f-ttl");
  f.path(`M${xs[2]+40} ${y+h} L${xs[2]+40} ${y+h+46} L76 ${y+h+46}`);
  f.arrow(80,y+h+46,76,y+2+h);
  f.text(140,y+h+60,"IF IT IS NOT GOOD ENOUGH, IT GOES BACK WITH A BETTER BRIEF","f-sub");
  f.text(20,300,"I DECIDE WHAT TO BUILD AND WHETHER IT IS GOOD ENOUGH","f-ttl");
  f.text(20,316,"every public repository states the division","f-sub");
 }},

{slug:"carries",n:"08",kicker:"WHAT CARRIES",title:"Where the judgement comes from",focus:ALL,
 figs:"2017 to 2026 in R",
 tech:`<p>Directing a model well needs a sense of what a language can do and how a system should be put together, which came out of the R and Shiny work. Working this way does not build hands on depth in the other languages, because the model does most of the writing in them.</p>`,
 plain:`<p>Directing a model works about as well as your sense of what a good answer looks like, which in my case came out of nine years of building statistical software, and that is the part the tooling does not hand you.</p>`,
 comm:`<p>I can thank my prior experience in R and Shiny for understanding what languages are capable of, and for thinking about architecture and design well enough to guide Claude. What I lose is the chance to trial and error my way through different languages and platforms.</p>`,
 fig(f){
  f.text(14,46,"WHAT IT SUPPLIES","f-ttl");f.line(14,56,236,56,"hot-s");
  ["speed","breadth of language","things that get finished","deployment i had not tried"]
    .forEach((t,i)=>f.text(14,78+i*20,t,"f-sub"));
  f.text(266,46,"WHAT IT DOES NOT","f-ttl");f.line(266,56,488,56,"dim");
  ["knowing what to build","knowing when it is wrong","hands-on depth in a new language","the trial and error"]
    .forEach((t,i)=>f.text(266,78+i*20,t,"f-sub"));
  f.box(14,200,474,58,"nine years of R","what a language can do, and how a system should be put together","hot-s");
  f.text(14,302,"KNOWING WHAT TO BUILD, AND WHEN IT IS WRONG, CAME FROM THE R","f-ttl");
  f.text(14,318,"nine years of packages and Shiny apps","f-sub");
 }},

{slug:"practice",n:"09",kicker:"THE PRACTICE",title:"Raborn Decision Sciences",focus:["directCare","ShortForm","shinyShortForm"],
 figs:"raborndecisionsciences.com",
 links:[["raborndecisionsciences.com","https://raborndecisionsciences.com"],
        ["direct care suite","https://directcareanalytics.com"]],
 tech:`<p>Raborn Decision Sciences is an applied analytics practice built on this work. It covers assessment and psychometrics, decision tools in R and Shiny, and operations and planning models. The Direct Care Suite is its first product line. The Launch Planner models startup cost, membership growth and revenue ramp before a practice opens; Direct Care Analytics projects break-even timing, tracks revenue trends from bookkeeping data and sets income targets after it opens. There is a free tier and plans at $39 and $79 a month, and one subscription covers both tools. Services and contact are at <a href="https://raborndecisionsciences.com" target="_blank" rel="noopener noreferrer">raborndecisionsciences.com</a>.</p>`,
 plain:`<p>Raborn Decision Sciences is the business side of this work.</p>
   <p>It takes measurement, operations and planning questions and turns them into something you can use, which might be an analysis, a repeatable workflow, or a web app you log into; the first product line does financial planning for small medical practices.</p>
   <p>If you have a question like that, the contact page is at <a href="https://raborndecisionsciences.com" target="_blank" rel="noopener noreferrer">raborndecisionsciences.com</a>.</p>`,
 comm:`<p>The consultancy came out of the same conversations as the apps. My wife needed forecasting for her practice, we worked out what would help her plan and track the money, and it became clear the question was not specific to her.</p>
   <p>As I've been consulting off and on since graduate school, Raborn Decision Sciences gives that work a permanent home.</p>`,
 fig(f){
  f.box(14,40,250,56,"raborn decision sciences","applied analytics in R and Shiny","hot-s");
  [["assessment","psychometrics and measurement"],["decision tools","r and shiny apps"],
   ["planning models","operations and finance"]].forEach(([t,d],i)=>{
    f.box(14+i*160,116,146,46,t,d);});
  f.path("M87 162 L87 196 L250 196","dim");
  f.text(14,216,"THE FIRST PRODUCT LINE","f-ttl");
  f.box(14,232,230,52,"launch planner","before opening: startup cost, membership ramp");
  f.box(258,232,230,52,"direct care analytics","after opening: break-even, revenue","hot-s");
  f.text(14,306,"PLANS ARE FREE, $39 OR $79 A MONTH, AND COVER BOTH TOOLS","f-sub");
  f.line(14,328,486,328,"dim");
  f.text(14,350,"BUILT FIRST FOR ONE PRACTICE","f-ttl");
  f.text(14,366,"and the same questions apply to other direct care practices","f-sub");
 }},

{slug:"elsewhere",n:"10",kicker:"THE OTHER HALF",title:"Hobby projects outside of statistics",focus:ALL,
 figs:"10 projects · Rust, JavaScript and Python",
 links:[["github profile","https://github.com/AnthonyRaborn"]],
 tech:`<p>I have also built projects in Rust, JavaScript and Python with the same method, in languages outside this practice. <a class="sib" href="hobby.html" data-sibling="premise">They are a hobby</a>.</p>`,
 plain:`<p>I also build hobby projects in languages that have nothing to do with statistics.</p>
   <p>It is a hobby and it lives on <a class="sib" href="hobby.html" data-sibling="premise">its own page</a>.</p>`,
 comm:`<p>The <a class="sib" href="hobby.html" data-sibling="premise">other page</a> showcases some of my hobby work, in which the projects share an aesthetic but each does something different. These are primarily built for my own personal enjoyment, with the hope that others might find them interesting too.</p>`,
 fig(f){
  f.box(14,70,210,70,"this page","R · 9 years · 79,726 lines","hot-s");
  f.box(276,70,210,70,"hobby page","Rust, JS, Python · 167,145 lines");
  f.path("M224 105 L250 105 L250 105 L276 105","dim");
  f.text(232,96,"→","f-ttl");
  f.text(14,190,"I USE THE SAME METHOD ON MY HOBBY PROJECTS","f-ttl");
  f.text(14,206,"in Rust, JavaScript and Python instead of R","f-sub");
 }},
];

start({PROJECTS,CHAPTERS,sibling:"hobby.html",axis:AXIS});
