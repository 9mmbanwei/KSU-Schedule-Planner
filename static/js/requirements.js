// Major requirements, entered by hand from KSU's curriculum sheets (catalog 2025-26).
// Update this file each catalog year; see docs/updating-requirements.md.
//   OPT     lists of courses that satisfy a choose-one gen-ed area
//   PRE     prerequisites: "X" = done before, "X*" = before or same term, ["A","B"] = either
//   MAJORS  each major's requirement groups; items are {c:"CODE"} or a slot {slot, label, pick, opts}
//           Architecture items also carry y: 0 = Year 1 Fall ... 9 = Year 5 Spring
const TITLE_FALLBACK={"ECON 1000":"Contemporary Economic Issues","POLS 1101":"American Government","HIST 2111":"U.S. History to 1890","HIST 2112":"U.S. History since 1890","HIST 1100":"Survey of World History","HIST 1111":"World History I","HIST 1112":"World History II","MATH 1111":"College Algebra","STAT 1401":"Elementary Statistics","STAT 2332":"Probability & Data Analysis","MATH 3260":"Linear Algebra","TCOM 2010":"Technical Writing","PHIL 2010":"Intro to Philosophy","ENGL 2110":"World Literature","ENGL 2120":"British Literature","ENGL 2130":"American Literature","ENGL 2140":"African American Literature","ART 1107":"Arts in Society: Visual Arts","DANC 1107":"Arts in Society: Dance","MUSI 1107":"Arts in Society: Music","TPS 1107":"Arts in Society: Theatre","CHEM 1211":"Principles of Chemistry I","CHEM 1212":"Principles of Chemistry II","BIOL 1107":"Principles of Biology I","BIOL 1108":"Principles of Biology II","PHYS 1111":"Introductory Physics I","PHYS 1112":"Introductory Physics II","PHYS 2212":"Principles of Physics II","PSYC 1101":"Intro to Psychology","SOCI 1101":"Intro to Sociology","ECON 2105":"Principles of Macroeconomics","ECON 2106":"Principles of Microeconomics","ANTH 1102":"Intro to Anthropology","CRJU 1101":"Foundations of Criminal Justice","GEOG 1101":"World Regional Geography","STS 1101":"Science, Technology & Society","CSE 2300":"Discrete Structures for Computing","CSE 3153":"Database Systems","CSE 3801":"Professional Practices & Ethics","SWE 3313":"Intro to Software Engineering","SWE 3623":"Software Systems Requirements","SWE 3633":"Software Architecture & Design","SWE 3643":"Software Testing & QA","SWE 4324":"User-Centered Design","SWE 4663":"Software Project Management","SWE 4713":"SWE Application Domain","SWE 4724":"Software Engineering Capstone","SWE 3683":"Embedded Systems Analysis & Design","SWE 4633":"Cloud Software Development","SWE 4723":"Undergraduate Research Methods","SWE 4743":"Object-Oriented Development","SWE 4783":"User Interaction Engineering","IT 1103":"Intro to Information Technology","IT 1114":"Programming Principles","IT 3123":"Hardware/Software Concepts","IT 3203":"Intro to Web Development","IT 3223":"IT Organization & Management","IT 3423":"Operating Systems Concepts & Admin","IT 3703":"Intro to Data Analytics & Technology","IT 3883":"Advanced Application Development","IT 4323":"Data Communications & Networking","IT 4423":"Linux/Unix Administration","IT 4723":"IT Policy & Law","IT 4823":"Information Security Admin & Privacy","IT 4983":"IT Capstone","IT 4153":"Advanced Database","IT 4713":"Business Intelligence Systems","IT 4733":"Big Data Systems Admin","IT 4773":"Machine Learning for Enterprise Apps","IT 4793":"Applied Data Driven Solutions","IT 4333":"Network Configuration & Admin","IT 4403":"Advanced Web & Mobile Apps","IT 4673":"Virtual IT Systems","IT 4833":"Wireless Security","IT 4843":"Ethical Hacking","IT 4853":"Computer Forensics","IT 4863":"Web & Mobile Applications Security","IT 4883":"Infrastructure Defense","IT 4893":"Internet of Things: Applications & Security","IT 3503":"Foundations of Health IT","CS 4306":"Algorithm Analysis","CS 3622":"Fundamentals of Data Communications","CS 4504":"Parallel & Distributed Computing","CS 4308":"Concepts of Programming Languages","CS 4850":"Senior Project","CS 4265":"Big Data Analytics","CS 4412":"Data Mining","CS 4422":"Information Retrieval","CS 4522":"HPC & Parallel Programming","CS 4524":"Cloud Computing","CS 4722":"Computer Graphics & Multimedia","CS 3626":"Cryptography","CS 4612":"Software Security","CS 4622":"Computer Networks","CS 4626":"Computer & Network Security","CS 3642":"Artificial Intelligence","CS 4267":"Machine Learning","CS 4732":"Machine Vision","CS 4742":"Natural Language Processing","CS 4277":"Deep Learning","CS 4270":"Intelligent Systems in Bioinformatics","CS 4322":"Mobile Software Development","CS 4632":"Modeling and Simulation","CS 4712":"User Interface Engineering","CS 4720":"Internet Programming","CS 4514":"Real-Time Systems","CS 4523":"Programming Massively Parallel Processors","ARCH 1000":"Intro to Architecture","ARCH 1001":"Studio I","ARCH 1002":"Studio II","ARCH 1241":"Design Communication I","ARCH 2111":"Architectural Culture I","ARCH 2003":"Studio III","ARCH 2242":"Design Communication II","ARCH 2311":"Environmental Technology I","ARCH 2211":"Architectural Structures I","ARCH 2004":"Studio IV","ARCH 3112":"Architectural Culture II","ARCH 3011":"Studio V","ARCH 3313":"Environmental Technology II","ARCH 3211":"Architectural Structures II","ARCH 3012":"Studio VI","ARCH 3314":"Environmental Technology III","ARCH 3212":"Architectural Structures III","ARCH 3113":"Architectural Culture III","ARCH 4013":"Integrative Studio","ARCH 4116":"Urban Theory","ARCH 4114":"Architectural Culture IV","ARCH 4224":"Professional Practice I","ARCH 4014":"Urban Lab","ARCH 4225":"Professional Practice II","ARCH 4226":"Professional Practice III","ARCH 5015":"Focus Studio","ARCH 5006":"Thesis Research","ARCH 5017":"Thesis Studio","COMM 1100":"Human Communication","AMST 1102":"Intro to American Studies","ASIA 1102":"Intro to Asian Studies","BLCK 1102":"Intro to Black Studies","GWST 1102":"Intro to Gender & Women's Studies","LALS 1102":"Intro to Latin American Studies","PAX 1102":"Intro to Peace Studies","RELS 1102":"Intro to Religious Studies","POLS 2401":"Global Issues","LDRS 2300":"Leadership","ISD 2700":"Intro to Interdisciplinary Studies"};

const L=s=>s.split(",").map(x=>x.trim()).filter(Boolean);
const OPT={
  I:L("AMST 1102, ASIA 1102, BLCK 1102, COMM 1100, GWST 1102, ISD 2700, LALS 1102, LDRS 2300, PAX 1102, POLS 2401, RELS 1102"),
  A1:L("ENGL 2110, ENGL 2120, ENGL 2130, ENGL 2140, PHIL 2010, SPAN 1001, SPAN 1002, FREN 1001, FREN 1002, GRMN 1001, GRMN 1002, CHIN 1001, CHIN 1002, JAPN 1001, JAPN 1002, KOR 1001, KOR 1002, ITAL 1001, ITAL 1002, LATN 1001, LATN 1002, PORT 1001, PORT 1002, RUSS 1001, RUSS 1002, HEBR 1001, HEBR 1002, WLC 1001, WLC 1002, WLC 2209"),
  A2:L("ART 1107, DANC 1107, MUSI 1107, TPS 1107"),
  SCI:L("PHYS 2211, PHYS 2212, PHYS 1111, PHYS 1112, CHEM 1211, CHEM 1212, BIOL 1107, BIOL 1108"),
  S1:L("HIST 1111, HIST 1112, HIST 1100"),
  S2:L("PSYC 1101, SOCI 1101, ECON 2105, ECON 2106, ANTH 1102, CRJU 1101, GEOG 1101, STS 1101")
};
// Prerequisites. Each entry is a list of requirements that must all be met.
// "X" = completed earlier; "X*" = completed earlier or taken the same term; ["A","B"] = either one.
const PRE={
 "ENGL 1102":["ENGL 1101"],"TCOM 2010":["ENGL 1102"],
 "MATH 1113":[],"MATH 1190":["MATH 1113"],"MATH 2202":["MATH 1190"],"MATH 2345":[["MATH 1113","MATH 1190"]],"MATH 3260":["MATH 1190"],
 "STAT 2332":["MATH 1190"],"CSE 2300":["CSE 1321","MATH 1113"],
 "PHYS 1111":["MATH 1113"],"PHYS 1112":["PHYS 1111"],"PHYS 2211":["MATH 1190"],"PHYS 2212":["PHYS 2211"],"CHEM 1212":["CHEM 1211"],
 "CSE 1322":["CSE 1321",["MATH 1113*","MATH 1190*","MATH 2202*"]],
 "CSE 3153":[["CSE 1322","IT 1114"]],"CSE 3801":[["CSE 1322","IT 3123*"]],
 "CS 3305":["MATH 2345","CSE 1322"],"CS 3503":["CSE 1322"],"CS 3502":["CS 3305","CS 3503"],"CS 3410":["CSE 1322"],"CS 3622":["CSE 1322"],
 "CS 4306":["CS 3305"],"CS 4308":["CS 3305","CS 3503"],"CS 4504":["CS 3305","CS 3503","CS 3502*"],"CS 4850":["CS 3502","SWE 3313"],
 "CS 4265":["CS 3305",["CS 3410","CSE 3153"]],"CS 4412":["CS 3305","CS 3410"],"CS 4422":["CS 3305","CS 3410"],"CS 4522":["CS 4504"],"CS 4524":["CS 4504"],
 "CS 4722":["CS 3305"],"CS 3626":["MATH 2345","CS 3305*"],"CS 4612":["CS 3626","CS 3502"],"CS 4622":["CS 3503","CS 3622"],"CS 4626":["CS 3626","CS 4622"],
 "CS 3642":["CS 3305"],"CS 4267":["CS 3642"],"CS 4732":["CS 3642"],"CS 4742":["CS 3642"],"CS 4277":["CS 3642","CS 4267*"],
 "CS 4270":["CS 3305",["CS 3410","CSE 3153"]],"CS 4322":["CS 3305","SWE 3313",["CS 3410","CSE 3153"]],"CS 4632":["CS 3305"],"CS 4712":["CSE 1322"],
 "CS 4720":["CS 3305",["CS 3410","CSE 3153"]],"CS 4514":["CS 3502"],"CS 4523":["CS 3305","CS 3502"],
 "SWE 3313":["CSE 1322"],"SWE 3623":["SWE 3313",["CSE 2300","MATH 2345"]],"SWE 3633":["SWE 3313"],"SWE 3643":["SWE 3313"],"SWE 4324":["SWE 3313"],
 "SWE 4663":["SWE 3313","STAT 2332"],"SWE 4713":["SWE 3623","SWE 3643*","SWE 4663*"],"SWE 4724":["SWE 3623","SWE 3643*","SWE 4663*"],
 "SWE 3683":["CS 3305"],"SWE 4633":["CS 3305"],"SWE 4723":["SWE 3313"],"SWE 4743":["CS 3305"],"SWE 4783":[["SWE 3313","SWE 4324"]],
 "IT 1103":["IT 1114*"],"IT 3123":[["IT 1114","CSE 1321"]],"IT 3203":[["IT 1114","CSE 1321"]],"IT 3423":["IT 3123"],"IT 3703":["IT 3123","CSE 3153*"],
 "IT 3883":["CSE 3153",["IT 1114","CSE 1321"]],"IT 4323":["IT 3123"],"IT 4423":["IT 3423"],"IT 4723":["IT 3123","IT 3223"],
 "IT 4823":[["IT 3123","CS 3503"],["CSE 2300","MATH 2345"]],"IT 4983":["IT 3423","IT 3223","IT 3203","IT 3883","IT 4323*","IT 4823*"],
 "IT 4153":["CSE 3153"],"IT 4713":["IT 3703"],"IT 4733":["IT 3703"],"IT 4773":["IT 3703"],"IT 4793":["IT 3703"],"IT 4333":["IT 4323"],"IT 4403":["IT 3203"],
 "IT 4673":["IT 3423","IT 4323","CSE 3153"],"IT 4833":[["IT 4323","CS 4622"]],"IT 4843":[["IT 4323","CS 4622"]],"IT 4853":[["IT 4323","CS 4622"]],
 "IT 4863":["IT 3203"],"IT 4883":[["IT 4323","CS 4622"]],"IT 4893":["IT 4823","IT 4323"],"IT 3503":["ENGL 1102"],
 "ARCH 1002":["ARCH 1001"],"ARCH 2003":["ARCH 1002"],"ARCH 2004":["ARCH 2003"],"ARCH 3011":["ARCH 2004"],"ARCH 3012":["ARCH 3011"],
 "ARCH 4013":["ARCH 3012","ARCH 3314","ARCH 3212"],"ARCH 4014":["ARCH 4013","ARCH 4116"],"ARCH 5015":["ARCH 4014"],"ARCH 5006":["ARCH 4014"],"ARCH 5017":["ARCH 5015","ARCH 5006"],
 "ARCH 2242":["ARCH 1241"],"ARCH 2211":[["PHYS 1111","PHYS 2211"]],"ARCH 3211":["ARCH 2211"],"ARCH 3212":["ARCH 3211"],
 "ARCH 3313":["ARCH 2311"],"ARCH 3314":["ARCH 3313"],"ARCH 3112":["ARCH 2111"],"ARCH 3113":["ARCH 3112"],"ARCH 4114":["ARCH 3113"],
 "ARCH 4224":["ARCH 4013*"],"ARCH 4225":["ARCH 4224"],"ARCH 4226":["ARCH 4224"]
};
for(const c of OPT.A1)if(/ 1002$/.test(c))PRE[c]=[c.replace(/1002$/,"1001")];
const NOTE={"ARCH 2003":"Needs admission to second-year studio (portfolio review)","CSE 1321":"Grade of B needed to move on","CSE 1322":"Grade of B needed to move on",
 "MATH 1190":"Or place into Calculus","MATH 1113":"Or place into Precalculus","ARCH 3011":"Take with ARCH 3313 and ARCH 3211","ARCH 3012":"Take with ARCH 3314 and ARCH 3212"};
// credit hours for courses not in the downloaded data (lecture only; labs add 1)
const CRDEF={"ECON 1000":2,"CSE 3801":2,"IT 3883":4,"SWE 4724":4,"MATH 1190":4,"MATH 2202":4,"ARCH 1000":2,"ARCH 2242":2,"ARCH 4224":2,"ARCH 4225":2,
 "ARCH 1001":4,"ARCH 1002":4,"ARCH 2003":4,"ARCH 2004":4,"ARCH 3011":4,"ARCH 3012":4,"ARCH 4013":4,"ARCH 4014":4,"ARCH 5015":4,"ARCH 5017":4};
const LABBED=new Set(["CSE 1321","CSE 1322","IT 1114","PHYS 1111","PHYS 1112","PHYS 2211","PHYS 2212","CHEM 1211","CHEM 1212","BIOL 1107","BIOL 1108"]);
const TOGETHER=[["ARCH 3011","ARCH 3313","ARCH 3211"],["ARCH 3012","ARCH 3314","ARCH 3212"]];
const SCI_EXCL=[["PHYS 1111","PHYS 2211"],["PHYS 1112","PHYS 2212"]];

const geneds=(m,t,sciPick)=>({id:"ge",name:"General education",items:[
  {c:"ENGL 1101"},{c:"ENGL 1102"},{c:m},{c:t},{c:"ECON 1000"},{c:"POLS 1101"},
  {slot:"I",label:"Area I · institutional priority",pick:1,opts:OPT.I},
  {slot:"P",label:"U.S. history",pick:1,opts:["HIST 2111","HIST 2112"]},
  {slot:"A1",label:"Humanities or world language",pick:1,opts:OPT.A1},
  {slot:"A2",label:"Arts",pick:1,opts:OPT.A2},
  {slot:"T",label:"Lab science (lecture + lab)",pick:sciPick,opts:OPT.SCI,excl:SCI_EXCL},
  {slot:"S1",label:"World history",pick:1,opts:OPT.S1},
  {slot:"S2",label:"Social science",pick:1,opts:OPT.S2}]});
const CS_ELECT=L("CS 3642, CS 4267, CS 4732, CS 4742, CS 4277, CS 3626, CS 4612, CS 4622, CS 4626, CS 4265, CS 4412, CS 4422, CS 4522, CS 4524, CS 4722, CS 4270, CS 4322, CS 4632, CS 4712, CS 4720, SWE 3633, SWE 3643, SWE 3683, SWE 4633");
const MAJORS={
 cs:{name:"B.S. Computer Science",src:"https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bscs-2025.pdf",srcName:"BSCS curriculum sheet, catalog 2025–26",
  groups:[geneds("MATH 1113","MATH 1190",2),
   {id:"core",name:"Core field of study",items:L("CSE 1321, CSE 1322, MATH 2202, MATH 2345, TCOM 2010").map(c=>({c}))},
   {id:"major",name:"Major requirements",items:L("CS 3305, CS 3503, SWE 3313, CS 3410, CS 3622, CSE 3801, STAT 2332, MATH 3260, CS 3502, CS 4306, CS 4308, CS 4504, CS 4850").map(c=>({c}))},
   {id:"elect",name:"Major electives",items:[{slot:"CSE",label:"CS electives or a concentration (5 courses)",pick:5,opts:CS_ELECT,note:"At least 3 must be CS courses; up to 2 can be SWE courses. Concentrations: AI (CS 3642 first), Cyber & Network Security (CS 3626 first), Data Science (CS 4265, 4412, 4422)."}]}],
  extra:"Also needs 5 hours of free electives."},
 swe:{name:"B.S. Software Engineering",src:"https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bsswe-2025.pdf",srcName:"BSSWE curriculum sheet, catalog 2025–26",
  groups:[geneds("MATH 1190","MATH 2202",2),
   {id:"core",name:"Core field of study",items:L("CSE 1321, CSE 1322, MATH 2345, TCOM 2010, STAT 2332").map(c=>({c}))},
   {id:"major",name:"Major requirements",items:L("SWE 3313, CS 3305, CS 3503, CSE 3153, CSE 3801, CS 3502, SWE 3623, SWE 3633, SWE 3643, SWE 4324, SWE 4663, SWE 4713, SWE 4724").map(c=>({c}))},
   {id:"elect",name:"Major electives",items:[{slot:"SWEL",label:"SWE electives (2 courses)",pick:2,opts:L("SWE 3683, SWE 4633, SWE 4723, SWE 4743, SWE 4783, CS 4720, CS 4632, CS 4712, CS 4514, CS 4308, CS 4612, CS 4524, CS 4504, CS 4523, CS 4622, CS 4722, CS 4732, IT 4823"),note:"At least one must come from List 1 (SWE 3683–4783, CS 4720, 4524, 4612, 4632, 4712, 4514, 4308)."}]}],
  extra:"Also needs 8 hours of math/science electives (choose with a CCSE advisor) and 5 hours of free electives."},
 it:{name:"B.S. Information Technology",src:"https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bsit-2025.pdf",srcName:"BSIT curriculum sheet, catalog 2025–26",
  groups:[geneds("MATH 1111","MATH 1113",2),
   {id:"core",name:"Core field of study",items:[{c:"IT 1114"},{c:"IT 1103"},{c:"CSE 1321"},{slot:"DISC",label:"Discrete math",pick:1,opts:["CSE 2300","MATH 2345"]},{slot:"STAT",label:"Statistics",pick:1,opts:["STAT 1401","STAT 2332"]}]},
   {id:"major",name:"Major requirements",items:L("IT 3123, IT 3203, IT 3223, CSE 3153, CSE 3801, IT 3423, IT 4323, IT 3703, IT 3883, IT 4423, IT 4723, IT 4823, IT 4983").map(c=>({c}))},
   {id:"elect",name:"Concentration",items:[{slot:"ITC",label:"Concentration courses (5 courses)",pick:5,opts:L("IT 4153, IT 4713, IT 4733, IT 4773, IT 4793, IT 4333, IT 4403, IT 4673, IT 4833, IT 4843, IT 4853, IT 4863, IT 4883, IT 4893, IT 3503"),note:"Four must come from one concentration: Data Analytics (IT 4153, 4713, 4733, 4773, 4793), Enterprise Systems (IT 4153, 4333, 4403, 4673, 4713) or Cyber Operations Security (IT 4833, 4843, 4853, 4863, 4883, 4893)."}]}],
  extra:"Also needs 6 hours of free electives. KSU recommends starting with IT 1103 and IT 1114, then CSE 1321."},
 arch:{name:"Bachelor of Architecture",src:"https://campus.kennesaw.edu/colleges-departments/cacm/docs/2025-architecture-curriculum-chart.pdf",srcName:"Architecture curriculum chart, 2025",seq:true,
  groups:[{id:"ge",name:"General education",items:[{c:"ENGL 1101",y:0},{c:"MATH 1113",y:0},{c:"ENGL 1102",y:1},{slot:"PH",label:"Physics with lab",pick:1,opts:["PHYS 1111","PHYS 2211"],y:1},
     {c:"ECON 1000"},{c:"POLS 1101"},{slot:"P",label:"U.S. history",pick:1,opts:["HIST 2111","HIST 2112"]},{slot:"I",label:"Area I · institutional priority",pick:1,opts:OPT.I},
     {slot:"A1",label:"Humanities or world language",pick:1,opts:OPT.A1},{slot:"A2",label:"Arts",pick:1,opts:OPT.A2},{slot:"S1",label:"World history",pick:1,opts:OPT.S1},{slot:"S2",label:"Social science",pick:1,opts:OPT.S2}]},
   {id:"major",name:"Architecture sequence",items:[
     ["ARCH 1000",0],["ARCH 1001",0],["ARCH 1241",0],["ARCH 1002",1],["ARCH 2111",1],
     ["ARCH 2003",2],["ARCH 2242",2],["ARCH 2311",2],["ARCH 2211",2],["ARCH 2004",3],["ARCH 3112",3],
     ["ARCH 3011",4],["ARCH 3313",4],["ARCH 3211",4],["ARCH 3012",5],["ARCH 3314",5],["ARCH 3212",5],["ARCH 3113",5],
     ["ARCH 4013",6],["ARCH 4116",6],["ARCH 4114",6],["ARCH 4224",6],["ARCH 4014",7],["ARCH 4225",7],["ARCH 4226",7],
     ["ARCH 5015",8],["ARCH 5006",8],["ARCH 5017",9]].map(([c,y])=>({c,y}))}],
  extra:"Also needs 13 hours of electives or a minor. Studios run in a fixed order; falling out of sequence can add a year."}
};
const TERMS=["Year 1 Fall","Year 1 Spring","Year 2 Fall","Year 2 Spring","Year 3 Fall","Year 3 Spring","Year 4 Fall","Year 4 Spring","Year 5 Fall","Year 5 Spring"];

if(typeof module!=="undefined")module.exports={OPT,PRE,NOTE,CRDEF,LABBED,TOGETHER,MAJORS,TERMS,TITLE_FALLBACK};
