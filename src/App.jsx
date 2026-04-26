import './storage.js';
import { useState, useEffect, useRef, useCallback } from "react";

// ── FIREBASE — lazy init, never crashes app ──
let db = null;
let fbFunctions = {};

const initFirebase = async () => {
  try {
    const { initializeApp } = await import("firebase/app");
    const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
    const firebaseConfig = {
      apiKey: "AIzaSyAlfcY2UZTCeGh3_nmzROmhXYqmhTpjbWo",
      authDomain: "your-routine-a7118.firebaseapp.com",
      projectId: "your-routine-a7118",
      storageBucket: "your-routine-a7118.firebasestorage.app",
      messagingSenderId: "708442867968",
      appId: "1:708442867968:web:dd50f73f862417615e0be5"
    };
    const fbApp = initializeApp(firebaseConfig);
    db = getFirestore(fbApp);
    fbFunctions = { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, arrayUnion, arrayRemove };
    return true;
  } catch(e) {
    console.warn("Firebase não disponível:", e);
    return false;
  }
};

// Initialize Firebase in background — app works without it
initFirebase();


// Firebase helpers — all gracefully fail if Firebase not ready
const fbSaveProfile = async (uid, data) => {
  try {
    if(!db||!fbFunctions.doc) return;
    const {doc,setDoc} = fbFunctions;
    await setDoc(doc(db, "users", uid), {
      uid, username: data.username, totalXP: data.totalXP,
      level: data.level||1, streak: data.streak?.current||0,
      unlockedAch: data.unlockedAch||[], avatar: data.avatar||{},
      modules: data.modules||[], updatedAt: Date.now(),
      friends: data.friends||[], friendRequests: data.friendRequests||[],
    }, {merge:true});
  } catch(e){ console.warn("FB save error",e); }
};
const fbGetProfile = async (uid) => {
  try {
    if(!db||!fbFunctions.doc) return null;
    const {doc,getDoc} = fbFunctions;
    const d=await getDoc(doc(db,"users",uid)); return d.exists()?d.data():null;
  } catch(e){ return null; }
};
const fbSearchUser = async (username) => {
  try {
    if(!db||!fbFunctions.collection) return null;
    const {collection,query,where,getDocs} = fbFunctions;
    const q=query(collection(db,"users"),where("username","==",username));
    const snap=await getDocs(q);
    if(snap.empty) return null;
    return snap.docs[0].data();
  } catch(e){ return null; }
};
const fbSendFriendRequest = async (fromUid, toUid) => {
  try {
    if(!db||!fbFunctions.doc) return false;
    const {doc,updateDoc,arrayUnion} = fbFunctions;
    await updateDoc(doc(db,"users",toUid),{friendRequests:arrayUnion(fromUid)}); return true;
  } catch(e){ return false; }
};
const fbAcceptFriend = async (myUid, friendUid) => {
  try {
    if(!db||!fbFunctions.doc) return false;
    const {doc,updateDoc,arrayUnion,arrayRemove} = fbFunctions;
    await updateDoc(doc(db,"users",myUid),{friends:arrayUnion(friendUid),friendRequests:arrayRemove(friendUid)});
    await updateDoc(doc(db,"users",friendUid),{friends:arrayUnion(myUid)});
    return true;
  } catch(e){ return false; }
};
const fbDeclineFriend = async (myUid, friendUid) => {
  try {
    if(!db||!fbFunctions.doc) return false;
    const {doc,updateDoc,arrayRemove} = fbFunctions;
    await updateDoc(doc(db,"users",myUid),{friendRequests:arrayRemove(friendUid)}); return true;
  } catch(e){ return false; }
};
const fbRemoveFriend = async (myUid, friendUid) => {
  try {
    if(!db||!fbFunctions.doc) return false;
    const {doc,updateDoc,arrayRemove} = fbFunctions;
    await updateDoc(doc(db,"users",myUid),{friends:arrayRemove(friendUid)});
    await updateDoc(doc(db,"users",friendUid),{friends:arrayRemove(myUid)});
    return true;
  } catch(e){ return false; }
};

// ── MODULES ──
const ALL_MODULES = [
  {id:"estudo",    icon:"📚", label:"Estudos / Concurso", desc:"Matérias, questões, simulados",  color:"#60a5fa"},
  {id:"treino",    icon:"💪", label:"Treino",             desc:"Fichas de exercícios e musculação",color:"#ef4444"},
  {id:"corrida",   icon:"🏃", label:"Corrida",            desc:"Registro de corridas e distância", color:"#34d399"},
  {id:"financeiro",icon:"💰", label:"Financeiro",         desc:"Controle de gastos e salário",    color:"#22c55e"},
  {id:"livros",    icon:"📖", label:"Leitura",            desc:"Livros em andamento e biblioteca", color:"#f0c040"},
  {id:"habitos",   icon:"🌱", label:"Hábitos",            desc:"Hábitos diários personalizados",  color:"#a78bfa"},
];

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const LEVELS = [
  { lv:1,  xp:0,      title:"Iniciante",        color:"#9ca3af", months:0  },
  { lv:2,  xp:200,    title:"Aprendiz",          color:"#60a5fa", months:1  },
  { lv:3,  xp:500,    title:"Determinado",       color:"#34d399", months:2  },
  { lv:4,  xp:1000,   title:"Persistente",       color:"#a78bfa", months:3  },
  { lv:5,  xp:1800,   title:"Disciplinado",      color:"#f59e0b", months:4  },
  { lv:6,  xp:3000,   title:"Evoluindo",         color:"#f97316", months:5  },
  { lv:7,  xp:4800,   title:"Guerreiro",         color:"#ef4444", months:6  },
  { lv:8,  xp:7500,   title:"Veterano",          color:"#ec4899", months:8  },
  { lv:9,  xp:11000,  title:"Elite",             color:"#8b5cf6", months:10 },
  { lv:10, xp:16000,  title:"Mestre",            color:"#06b6d4", months:12 },
  { lv:11, xp:23000,  title:"Lenda",             color:"#84cc16", months:15 },
  { lv:12, xp:33000,  title:"Imparável",         color:"#f0c040", months:18 },
  { lv:13, xp:47000,  title:"Fenômeno",          color:"#ff6b6b", months:21 },
  { lv:14, xp:66000,  title:"Excepcional",       color:"#4ecdc4", months:24 },
  { lv:15, xp:92000,  title:"Extraordinário",    color:"#a855f7", months:27 },
  { lv:16, xp:128000, title:"Transcendente",     color:"#f43f5e", months:30 },
  { lv:17, xp:175000, title:"Mítico",            color:"#fb923c", months:33 },
  { lv:18, xp:240000, title:"Lendário",          color:"#38bdf8", months:36 },
  { lv:19, xp:325000, title:"Supremo",           color:"#e879f9", months:42 },
  { lv:20, xp:440000, title:"★ FORMA FINAL ★",  color:"#f0c040", months:48 },
];

const DYNAMIC_TITLES = [
  { cond:(s,lv)=>lv>=20&&(s.forca||0)>=25,                 title:"C B U M",              icon:"🏆" },
  { cond:(s,lv)=>lv>=20&&(s.totalKm||0)>=200,              title:"Usain Bolt",            icon:"⚡" },
  { cond:(s,lv)=>lv>=20&&(s.totalStudyHours||0)>=500,      title:"Einstein",              icon:"🧠" },
  { cond:(s,lv)=>lv>=20&&(s.streakBest||0)>=180,           title:"Miyamoto Musashi",      icon:"⚔️"  },
  { cond:(_,lv)=>lv>=17,                                    title:"Forma Mítica",          icon:"✨" },
  { cond:(_,lv)=>lv>=14,                                    title:"Ser Excepcional",       icon:"💎" },
  { cond:(_,lv)=>lv>=11,                                    title:"Lenda Viva",            icon:"🌟" },
  { cond:(_,lv)=>lv>=8,                                     title:"Veterano de Elite",     icon:"🎖️" },
  { cond:(s,lv)=>lv>=5&&(s.streakBest||0)>=30,             title:"Monge da Rotina",       icon:"🧘" },
  { cond:(s,lv)=>lv>=5&&(s.forca||0)>=15,                  title:"Guerreiro Físico",      icon:"💪" },
  { cond:(s,lv)=>lv>=5&&(s.totalStudyHours||0)>=100,       title:"Estrategista",          icon:"🎯" },
  { cond:()=>true,                                           title:"Guerreiro Estrategista",icon:"⚔️" },
];

const DEFAULT_PLANS = {
  A:{ id:"A", label:"Treino A", focus:"Peito · Tríceps · Ombro", icon:"🏋️", color:"#ef4444", isDefault:true,
    exercises:[
      {id:"fP",  name:"Flexão de Peito",          sets:4, reps:"15",      rest:"60s", tip:"Cotovelos 45° do corpo"},
      {id:"fT",  name:"Flexão Fechada (Tríceps)", sets:3, reps:"12",      rest:"60s", tip:"Mãos próximas no chão"},
      {id:"fO",  name:"Flexão Pike (Ombro)",      sets:3, reps:"10",      rest:"60s", tip:"Quadril elevado"},
      {id:"mT",  name:"Mergulho Tríceps",         sets:3, reps:"12",      rest:"60s", tip:"Use cadeira ou banco"},
      {id:"eL",  name:"Elevação Lateral",         sets:3, reps:"15",      rest:"45s", tip:"Com garrafa ou peso"},
    ]},
  B:{ id:"B", label:"Treino B", focus:"Costas · Bíceps · Barra", icon:"🦾", color:"#60a5fa", isDefault:true,
    exercises:[
      {id:"bF",  name:"Barra Fixa",               sets:4, reps:"Máx",     rest:"90s", tip:"Meta TAF: 6+ reps"},
      {id:"bS",  name:"Barra Supinada (Bíceps)",  sets:3, reps:"8",       rest:"90s", tip:"Pegada voltada pra você"},
      {id:"rI",  name:"Remada Invertida",         sets:4, reps:"12",      rest:"60s", tip:"Embaixo de mesa"},
      {id:"rB",  name:"Rosca Bíceps",             sets:3, reps:"15",      rest:"60s", tip:"Com garrafa ou peso"},
      {id:"sup", name:"Superman (Lombar)",        sets:3, reps:"15",      rest:"45s", tip:"Deitado, eleve braços e pernas"},
    ]},
  C:{ id:"C", label:"Treino C", focus:"Pernas · Core · Abdominal", icon:"🦵", color:"#34d399", isDefault:true,
    exercises:[
      {id:"ag",  name:"Agachamento Livre",        sets:4, reps:"20",      rest:"60s", tip:"Joelhos não passam a ponta do pé"},
      {id:"av",  name:"Avanço (Lunge)",           sets:3, reps:"12 cada", rest:"60s", tip:"Alterne as pernas"},
      {id:"ab",  name:"Abdominal",                sets:4, reps:"25",      rest:"60s", tip:"Meta TAF: 30 em 1 minuto"},
      {id:"pr",  name:"Prancha Isométrica",       sets:3, reps:"45s",     rest:"30s", tip:"Corpo reto, respire fundo"},
      {id:"mc",  name:"Mountain Climber",         sets:3, reps:"20 cada", rest:"45s", tip:"Joelhos ao peito"},
    ]},
  D:{ id:"D", label:"Treino D", focus:"TAF · Cooper · Resistência", icon:"🏃", color:"#f59e0b", isDefault:true,
    exercises:[
      {id:"cp",  name:"Teste de Cooper (12min)",  sets:1, reps:"12min",   rest:"—",   tip:"Meta TAF: +2.400m homens"},
      {id:"fTAF",name:"Flexão TAF (1 min)",       sets:1, reps:"Máx/60s", rest:"2min",tip:"Meta: 30+ repetições"},
      {id:"aTAF",name:"Abdominal TAF (1 min)",    sets:1, reps:"Máx/60s", rest:"2min",tip:"Meta: 30+ repetições"},
      {id:"bu",  name:"Burpee",                   sets:3, reps:"10",      rest:"60s", tip:"Flexão + salto completo"},
      {id:"po",  name:"Polichinelo",              sets:3, reps:"30",      rest:"30s", tip:"Aquecimento e resistência"},
    ]},
};

const DEFAULT_SUBJECTS = [
  {id:"port",  name:"Língua Portuguesa",       icon:"📝", color:"#60a5fa"},
  {id:"logica",name:"Raciocínio Lógico",       icon:"🧩", color:"#a78bfa"},
  {id:"matfin",name:"Matemática Financeira",   icon:"📊", color:"#34d399"},
  {id:"banc",  name:"Conhecimentos Bancários", icon:"🏦", color:"#f59e0b"},
  {id:"atual", name:"Atualidades do Mercado",  icon:"📰", color:"#f97316"},
  {id:"info",  name:"Informática",             icon:"💻", color:"#22d3ee"},
  {id:"ing",   name:"Inglês",                  icon:"🌎", color:"#ec4899"},
  {id:"redac", name:"Redação",                 icon:"✍️", color:"#84cc16"},
];

const DEFAULT_CONCURSO = {
  id:"bb", name:"Banco do Brasil", active:true,
  subjects: DEFAULT_SUBJECTS,
  subjectMin:{}, questions:{}, studySessions:[],
};

const QUESTS = [
  {id:"study_1h",label:"Estudar 1 hora",   xp:30,icon:"📚",cat:"mente",     core:true},
  {id:"study_2h",label:"Estudar 2ª hora",  xp:25,icon:"📖",cat:"mente",     req:"study_1h"},
  {id:"read",    label:"Ler livro",         xp:15,icon:"📕",cat:"mente"},
  {id:"workout", label:"Treino completo",   xp:30,icon:"💪",cat:"corpo",     core:true},
  {id:"run",     label:"Corrida",           xp:20,icon:"🏃",cat:"corpo"},
  {id:"sleep",   label:"Dormir bem",        xp:30,icon:"😴",cat:"disciplina",core:true},
  {id:"organize",label:"Organizar rotina",  xp:10,icon:"📋",cat:"disciplina"},
];
const PENALTIES=[
  {id:"miss_train",    label:"Faltei o treino",   xp:-30,icon:"😤"},
  {id:"procrastinate", label:"Procrastinei o dia", xp:-20,icon:"😔"},
];
const BOSS_POOL=[
  {name:"Semana do Estudioso",icon:"📚",desc:"600min estudo + 3 treinos",         xp:200,goals:{studyMin:600,trainCount:3}},
  {name:"Semana do Guerreiro",icon:"⚔️", desc:"5 treinos + 10km corrida",          xp:180,goals:{trainCount:5,runKm:10}},
  {name:"Semana da Precisão", icon:"🎯",desc:"80 questões + 480min estudo",       xp:220,goals:{questions:80,studyMin:480}},
  {name:"Semana Imparável",   icon:"👑",desc:"900min + 4 treinos + 50 questões",  xp:300,goals:{studyMin:900,trainCount:4,questions:50}},
];

// ── ACHIEVEMENTS ──
const ACHIEVEMENTS = [
  // Streak
  {id:"streak_3",   icon:"🔥", name:"Faísca",          desc:"3 dias seguidos",        cat:"streak",   check:(c)=>(c.streak?.best||0)>=3,    xp:20},
  {id:"streak_7",   icon:"🔥", name:"Semana de Fogo",  desc:"7 dias seguidos",        cat:"streak",   check:(c)=>(c.streak?.best||0)>=7,    xp:50},
  {id:"streak_30",  icon:"🔥", name:"Monge do Hábito", desc:"30 dias seguidos",       cat:"streak",   check:(c)=>(c.streak?.best||0)>=30,   xp:150},
  {id:"streak_100", icon:"⚡", name:"Centenário",      desc:"100 dias seguidos",      cat:"streak",   check:(c)=>(c.streak?.best||0)>=100,  xp:400},
  // Estudo
  {id:"study_10h",  icon:"📚", name:"Estudante",       desc:"10 horas de estudo",     cat:"estudo",   check:(c)=>(c.stats?.totalStudyHours||0)>=10,  xp:30},
  {id:"study_50h",  icon:"📚", name:"Dedicado",        desc:"50 horas de estudo",     cat:"estudo",   check:(c)=>(c.stats?.totalStudyHours||0)>=50,  xp:80},
  {id:"study_100h", icon:"🧠", name:"Estrategista",    desc:"100 horas de estudo",    cat:"estudo",   check:(c)=>(c.stats?.totalStudyHours||0)>=100, xp:200},
  {id:"study_500h", icon:"🏆", name:"Einstein",        desc:"500 horas de estudo",    cat:"estudo",   check:(c)=>(c.stats?.totalStudyHours||0)>=500, xp:600},
  // Questões
  {id:"q_100",      icon:"🎯", name:"Primeiro Passo",  desc:"100 questões",           cat:"questoes", check:(c)=>(c.stats?.totalQuestions||0)>=100,  xp:30},
  {id:"q_500",      icon:"🎯", name:"Resoluto",        desc:"500 questões",           cat:"questoes", check:(c)=>(c.stats?.totalQuestions||0)>=500,  xp:80},
  {id:"q_1000",     icon:"🎯", name:"Mestre das Q.",   desc:"1000 questões",          cat:"questoes", check:(c)=>(c.stats?.totalQuestions||0)>=1000, xp:180},
  // Treino
  {id:"train_10",   icon:"💪", name:"Novato do Gym",   desc:"10 treinos completos",   cat:"treino",   check:(c)=>(c.stats?.totalWorkouts||0)>=10,   xp:40},
  {id:"train_50",   icon:"💪", name:"Veterano",        desc:"50 treinos completos",   cat:"treino",   check:(c)=>(c.stats?.totalWorkouts||0)>=50,   xp:100},
  {id:"train_100",  icon:"🏋️", name:"Guerreiro Físico",desc:"100 treinos",            cat:"treino",   check:(c)=>(c.stats?.totalWorkouts||0)>=100,  xp:250},
  // Corrida
  {id:"run_5km",    icon:"🏃", name:"Maratonista Jr.", desc:"5km numa corrida",       cat:"corrida",  check:(c)=>(c.stats?.prKm||0)>=5,             xp:40},
  {id:"run_10km",   icon:"🏅", name:"Cooper Elite",    desc:"10km numa corrida",      cat:"corrida",  check:(c)=>(c.stats?.prKm||0)>=10,            xp:100},
  {id:"run_100km",  icon:"⚡", name:"Usain",           desc:"100km no total",         cat:"corrida",  check:(c)=>(c.stats?.totalKm||0)>=100,        xp:200},
  // Livros
  {id:"book_1",     icon:"📖", name:"Leitor",          desc:"1 livro finalizado",     cat:"livros",   check:(c)=>(c.stats?.booksFinished||0)>=1,    xp:30},
  {id:"book_5",     icon:"📚", name:"Bibliófilo",      desc:"5 livros finalizados",   cat:"livros",   check:(c)=>(c.stats?.booksFinished||0)>=5,    xp:100},
  // Boss
  {id:"boss_1",     icon:"👹", name:"Caçador",         desc:"1 boss derrotado",       cat:"boss",     check:(c)=>(c.stats?.bossesCleared||0)>=1,    xp:50},
  {id:"boss_5",     icon:"👑", name:"Lendário",        desc:"5 bosses derrotados",    cat:"boss",     check:(c)=>(c.stats?.bossesCleared||0)>=5,    xp:200},
  // Nível
  {id:"lv_5",       icon:"⬆️", name:"Ascendente",      desc:"Chegou ao nível 5",      cat:"nivel",    check:(c,lv)=>lv>=5,                          xp:50},
  {id:"lv_10",      icon:"⬆️", name:"Veterano RPG",    desc:"Chegou ao nível 10",     cat:"nivel",    check:(c,lv)=>lv>=10,                         xp:150},
  {id:"lv_15",      icon:"🌟", name:"Fenômeno",        desc:"Chegou ao nível 15",     cat:"nivel",    check:(c,lv)=>lv>=15,                         xp:400},
];

// ── MOOD OPTIONS ──
const MOODS = [
  {id:"great",  icon:"🔥", label:"Imparável",  color:"#f0c040", xp:5},
  {id:"good",   icon:"😊", label:"Bem",        color:"#34d399", xp:3},
  {id:"ok",     icon:"😐", label:"Ok",         color:"#60a5fa", xp:1},
  {id:"tired",  icon:"😴", label:"Cansado",    color:"#a78bfa", xp:0},
  {id:"bad",    icon:"😔", label:"Mal",        color:"#ef4444", xp:0},
];

const AVATAR_SKINS=["#FDBCB4","#F1C27D","#E0AC69","#C68642","#8D5524"];
const AVATAR_HAIRS=["#1a0a00","#4a2c00","#8B4513","#DAA520","#FF6B6B","#E0E0E0","#2c3e50","#e91e63","#a855f7","#06b6d4"];
const AVATAR_EXPRESSIONS=[{id:"happy",l:"😊"},{id:"focused",l:"😤"},{id:"cool",l:"😎"},{id:"tired",l:"😴"}];
const AVATAR_HAIR_STYLES_M=[{id:"short",l:"Curto"},{id:"medium",l:"Médio"},{id:"mohawk",l:"Moicano"},{id:"bald",l:"Careca"}];
const AVATAR_HAIR_STYLES_F=[{id:"long",l:"Longo"},{id:"ponytail",l:"Rabo"},{id:"bob",l:"Chanel"},{id:"curly",l:"Cacheado"}];
const AVATAR_ACCESSORIES=[{id:"none",l:"Nenhum"},{id:"glasses",l:"Óculos"},{id:"earring",l:"Brinco"},{id:"headband",l:"Tiara"}];
const PLAN_ICONS=["🏋️","🦾","🦵","🏃","🥊","🤸","⚡","🔥","💥","🎯"];
const PLAN_COLORS=["#ef4444","#60a5fa","#34d399","#f59e0b","#a78bfa","#f97316","#ec4899","#22d3ee","#84cc16","#f0c040"];
const SUBJECT_ICONS=["📝","🧩","📊","🏦","📰","💻","🌎","✍️","⚖️","🧬","📐","🗺️","🎭","🔬","📜","🧠","💡","🏛️"];
const SUBJECT_COLORS=["#60a5fa","#a78bfa","#34d399","#f59e0b","#f97316","#22d3ee","#ec4899","#84cc16","#ef4444","#f0c040","#4ecdc4","#fb923c"];
const HABIT_ICONS=["💧","🧘","🥗","😴","📵","🚶","🎸","✍️","🌅","🛁","💊","🙏","📓","🎯","🧹","🌿"];
const HABIT_COLORS=["#60a5fa","#34d399","#f59e0b","#a78bfa","#f97316","#22d3ee","#ec4899","#84cc16","#ef4444","#f0c040"];

const RUN_XP=(km)=>km>=10?60:km>=8?48:km>=6?38:km>=4?28:km>=2?18:10;
const FIN_XP=(v)=>v>=500?40:v>=300?30:v>=100?20:10;
const catColor={mente:"#60a5fa",corpo:"#ef4444",disciplina:"#a78bfa"};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const yesterdayStr=()=>{const d=new Date();d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const fmtHM=(m)=>!m?"-":m<60?`${m}min`:`${Math.floor(m/60)}h${m%60?` ${m%60}min`:""}`;
const fmtKm=(k)=>k?(+k).toFixed(1)+"km":"—";
const pct=(a,b)=>b?Math.round((a/b)*100):0;
const curr=(v)=>`R$ ${(+v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const uid=()=>Math.random().toString(36).slice(2,8);
const weekId=()=>{const d=new Date(),j=new Date(d.getFullYear(),0,1);return `${d.getFullYear()}-W${Math.ceil(((d-j)/86400000+j.getDay()+1)/7)}`;};
const unlockDate=(m)=>{const d=new Date("2026-03-15");d.setMonth(d.getMonth()+m);return d;};
const timeUnlocked=(m)=>new Date()>=unlockDate(m);
const daysLeft=(d)=>Math.max(0,Math.ceil((d-new Date())/(864e5)));
const bmiCat=(b)=>b<18.5?{l:"Abaixo do peso",c:"#60a5fa",t:"Aumente a ingestão calórica."}:b<25?{l:"Peso ideal ✓",c:"#22c55e",t:"Parabéns! Mantenha a rotina."}:b<30?{l:"Sobrepeso",c:"#f59e0b",t:"Combine cardio com controle alimentar."}:b<35?{l:"Obesidade I",c:"#f97316",t:"Consulte um profissional de saúde."}:{l:"Obesidade II+",c:"#ef4444",t:"Busque acompanhamento médico."};
function getLvl(xp){let cur=LEVELS[0],nxt=LEVELS[1];for(let i=0;i<LEVELS.length;i++){if(xp>=LEVELS[i].xp){cur=LEVELS[i];nxt=LEVELS[i+1]||null;}}return {cur,nxt};}
function getDynTitle(s,lv){return DYNAMIC_TITLES.find(t=>t.cond(s,lv))||DYNAMIC_TITLES[DYNAMIC_TITLES.length-1];}
function streakMulti(s){return s>=30?1.25:s>=7?1.10:1;}
async function sg(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null;}catch{return null;}}
async function ss(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

const parseTimeToMinutes=(str)=>{if(!str)return null;const [h,m]=str.split(":").map(Number);if(isNaN(h)||isNaN(m))return null;return h*60+m;};
const minutesDiff=(startStr,endStr)=>{const s=parseTimeToMinutes(startStr),e=parseTimeToMinutes(endStr);if(s===null||e===null)return null;const diff=e>=s?e-s:e+1440-s;return diff;};

// Check and unlock achievements, return list of newly unlocked
function checkAchievements(char, lv, existing=[]) {
  const newOnes = [];
  for(const ach of ACHIEVEMENTS) {
    if(existing.includes(ach.id)) continue;
    if(ach.check(char, lv)) newOnes.push(ach);
  }
  return newOnes;
}

const START={
  username:"",totalXP:30,
  attrs:{forca:6,resistencia:5,inteligencia:6,foco:5,mental:4,disciplina:4},
  stats:{totalWorkouts:0,totalStudyHours:0,activeDays:0,totalQuests:0,totalKm:0,totalRuns:0,prKm:0,totalQuestions:0,booksFinished:0,streakBest:0,bossesCleared:0},
  streak:{current:0,best:0,lastDate:""},
  boss:{weekId:"",type:0,studyMin:0,trainCount:0,questions:0,runKm:0,claimed:false},
  concursos:[{...DEFAULT_CONCURSO,subjectMin:{},questions:{},studySessions:[]}],
  activeConcurso:"bb",
  books:{reading:[],library:[]},
  runs:[],workoutLog:[],workoutPlans:null,unlockedAch:[],questionLog:[],
  finance:{salary:800,expenses:[
    {id:"food",   name:"Alimentação",  amount:300,icon:"🍽️",paid:false,installments:null},
    {id:"phone",  name:"Plano Celular",amount:50, icon:"📱",paid:false,installments:null},
    {id:"inet",   name:"Internet",     amount:80, icon:"🌐",paid:false,installments:null},
  ]},
  avatar:{skin:0,hair:0,hairStyle:"short",expression:"happy",gender:"m",accessory:"none"},
  body:{weight:"",height:""},
  habits:[],moodLog:[],simulados:[],studyGoals:{},xpHistory:[],
  modules:["estudo","treino","corrida","financeiro","livros","habitos"],
  firebaseUid:"",
  friends:[],
  friendRequests:[],
};

// ═══════════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════════
function AvatarSVG({skin=0,hair=0,hairStyle="short",expression="happy",gender="m",accessory="none",size=80}){
  const sc=AVATAR_SKINS[skin]||AVATAR_SKINS[0];
  const hc=AVATAR_HAIRS[hair]||AVATAR_HAIRS[0];
  const mouth={happy:"M 38 58 Q 50 66 62 58",focused:"M 38 60 L 62 60",cool:"M 38 60 Q 50 56 62 60",tired:"M 40 62 Q 50 58 60 62"};
  const eyes={happy:"M 38 46 Q 41 42 44 46 M 56 46 Q 59 42 62 46",focused:"M 37 45 L 44 45 M 56 45 L 63 45",cool:"M 36 45 L 45 48 M 55 48 L 64 45",tired:"M 38 45 Q 41 48 44 45 M 56 45 Q 59 48 62 45"};
  // Male hair paths
  const hpM={short:`M 22 50 Q 22 21 50 18 Q 78 21 78 50 Z`,medium:`M 18 58 Q 18 18 50 16 Q 82 18 82 58 Z`,mohawk:`M 42 28 L 50 8 L 58 28 Z`,bald:null};
  // Female hair paths
  const hpF={long:`M 18 58 Q 14 18 50 14 Q 86 18 82 58 Q 82 80 70 85 Q 50 90 30 85 Q 18 80 18 58 Z`,ponytail:`M 18 50 Q 18 18 50 14 Q 82 18 82 50 Z M 72 48 Q 80 55 75 70 Q 70 80 65 75 Q 60 65 68 55 Z`,bob:`M 18 58 Q 18 18 50 14 Q 82 18 82 58 Q 80 70 65 72 Q 50 74 35 72 Q 20 70 18 58 Z`,curly:`M 22 52 Q 16 20 50 14 Q 84 20 78 52 Q 82 60 78 65 Q 70 72 60 68 Q 74 60 72 52 Q 68 35 50 32 Q 32 35 28 52 Q 26 60 30 68 Q 20 72 22 65 Q 18 60 22 52 Z`};
  const hp=gender==="f"?hpF:hpM;
  // Lashes for female
  const lashes=gender==="f"?"M 36 44 L 33 41 M 38 42 L 37 39 M 40 42 L 40 39 M 60 42 L 60 39 M 62 42 L 63 39 M 64 44 L 67 41":"";
  // Body shape
  const bodyF=gender==="f"?"M 41 77 Q 35 85 38 91 L 62 91 Q 65 85 59 77 Z":"";
  const bodyM=gender==="m"?<rect x="41" y="77" width="18" height="14" rx="3" fill={sc}/>:null;
  // Accessories
  const glassesPath=accessory==="glasses"?<><rect x="32" y="42" width="14" height="10" rx="4" fill="none" stroke="#888" strokeWidth="1.5"/><rect x="54" y="42" width="14" height="10" rx="4" fill="none" stroke="#888" strokeWidth="1.5"/><line x1="46" y1="47" x2="54" y2="47" stroke="#888" strokeWidth="1.5"/></>:null;
  const earringPath=accessory==="earring"?<><circle cx="22" cy="56" r="3" fill="#f0c040"/><circle cx="78" cy="56" r="3" fill="#f0c040"/></>:null;
  const headbandPath=accessory==="headband"?<path d="M 24 42 Q 50 30 76 42" fill="none" stroke="#ec4899" strokeWidth="5" strokeLinecap="round"/>:null;
  return(
    <svg width={size} height={size} viewBox="0 0 100 100">
      {gender==="f"?<path d={bodyF} fill={sc}/>:bodyM}
      <ellipse cx="50" cy="95" rx="26" ry="9" fill="#1a1535"/>
      <circle cx="50" cy="50" r="28" fill={sc}/>
      {hp[hairStyle]&&<path d={hp[hairStyle]} fill={hc}/>}
      {headbandPath}
      <path d={eyes[expression]||eyes.happy} stroke="#1a0a00" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {gender==="f"&&lashes&&<path d={lashes} stroke="#1a0a00" strokeWidth="1.2" fill="none" strokeLinecap="round"/>}
      {gender==="f"&&<ellipse cx="38" cy="54" rx="4" ry="2.5" fill="#f0a0a0" opacity="0.4"/> }
      {gender==="f"&&<ellipse cx="62" cy="54" rx="4" ry="2.5" fill="#f0a0a0" opacity="0.4"/>}
      <path d="M 50 50 L 48 55 L 52 55" stroke={skin===0?"#e8a090":"#7a5230"} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d={mouth[expression]||mouth.happy} stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="22" cy="52" rx="4" ry="6" fill={sc}/>
      <ellipse cx="78" cy="52" rx="4" ry="6" fill={sc}/>
      {glassesPath}
      {earringPath}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED UI — defined OUTSIDE App to prevent re-renders
// ═══════════════════════════════════════════════════════════════
const Card=({children,style,glow,anim})=>(
  <div style={{background:"#0f0f1e",border:`1px solid ${glow||"#1a1838"}`,borderRadius:12,padding:"12px 14px",animation:anim||"none",...style}}>
    {children}
  </div>
);
const Lbl=({children,color,mb=8})=>(
  <div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:3,color:color||"#555",marginBottom:mb}}>
    {children}
  </div>
);
const STabs=({tabs,val,onChange})=>(
  <div style={{display:"flex",gap:5,marginBottom:12}}>
    {tabs.map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:"8px 0",borderRadius:9,border:`1px solid ${val===t.id?`${t.c||"#f0c040"}55`:"#1a1838"}`,background:val===t.id?`linear-gradient(135deg,${t.c||"#f0c040"}18,${t.c||"#f0c040"}08)`:"#0f0f1e",fontFamily:"Cinzel,serif",fontSize:9,color:val===t.id?t.c||"#f0c040":"#555",letterSpacing:1,cursor:"pointer"}}>
        {t.i} {t.l}
      </button>
    ))}
  </div>
);

// Simple bar chart component
const MiniBarChart=({data,color="#60a5fa",height=60,label})=>{
  const max=Math.max(...data.map(d=>d.v),1);
  return(
    <div>
      {label&&<Lbl mb={6}>{label}</Lbl>}
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{width:"100%",height:Math.max(2,(d.v/max)*(height-16)),background:d.v>0?color:"#1a1838",borderRadius:"3px 3px 0 0",transition:"height 0.3s",minHeight:d.v>0?4:2}}/>
            <div style={{fontSize:7,color:"#444",fontFamily:"Cinzel,serif",textAlign:"center",lineHeight:1}}>{d.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const [tab,setTab]=useState("home");
  const [char,setChar]=useState(null);
  const [quests,setQuests]=useState({});
  const [pens,setPens]=useState({});
  const [loading,setLoading]=useState(true);
  const [floats,setFloats]=useState([]);
  const [lvlUpMsg,setLvlUp]=useState(null);
  const [toast,setToast]=useState(null);
  const [achPopup,setAchPopup]=useState(null);
  const [firstAccess,setFirstAccess]=useState(false);
  const [onboardName,setOnboardName]=useState("");
  const [onboardAvatar,setOnboardAvatar]=useState({skin:0,hair:0,hairStyle:"short",expression:"happy",gender:"m",accessory:"none"});
  const [onboardModules,setOnboardModules]=useState(["estudo","treino","corrida","financeiro","livros","habitos"]);
  const importRef=useRef(null);

  // Friends & Social
  const [friendsTab,setFriendsTab]=useState("lista");
  const [searchUser,setSearchUser]=useState("");
  const [searchResult,setSearchResult]=useState(null);
  const [searchLoading,setSearchLoading]=useState(false);
  const [friendProfiles,setFriendProfiles]=useState({});
  const [friendsOpen,setFriendsOpen]=useState(false);
  const [mentorOpen,setMentorOpen]=useState(false);
  const [mentorLoading,setMentorLoading]=useState(false);
  const [mentorChat,setMentorChat]=useState([]);
  const [mentorInput,setMentorInput]=useState("");
  const mentorEndRef=useRef(null);
  const mentorChatRef=useRef([]); // always up-to-date ref to avoid stale closure

  const [studyTab,setStudyTab]=useState("timer");
  const [bodyTab,setBodyTab]=useState("treino");
  const [lifeTab,setLifeTab]=useState("financeiro");
  const [dailyTab,setDailyTab]=useState("missoes");
  const [qPeriod,setQPeriod]=useState("all");
  const [statsTab,setStatsTab]=useState("xp");
  const [achCat,setAchCat]=useState("all");

  // Timer
  const [timerSub,setTimerSub]=useState(null);
  const [studyStart,setStudyStart]=useState("");
  const [studyEnd,setStudyEnd]=useState("");
  const [studyNote,setStudyNote]=useState("");

  // Workout states
  const [activeWorkout,setActiveWorkout]=useState(null);
  const [doneEx,setDoneEx]=useState({});
  const [workoutView,setWorkoutView]=useState("list");
  const [editingPlanKey,setEditingPlanKey]=useState(null);
  const [editPlan,setEditPlan]=useState(null);
  const [newPlanName,setNewPlanName]=useState("");
  const [newPlanFocus,setNewPlanFocus]=useState("");
  const [newPlanIcon,setNewPlanIcon]=useState("🏋️");
  const [newPlanColor,setNewPlanColor]=useState("#ef4444");
  const [newExName,setNewExName]=useState("");
  const [newExSets,setNewExSets]=useState("3");
  const [newExReps,setNewExReps]=useState("12");
  const [newExRest,setNewExRest]=useState("60s");
  const [newExTip,setNewExTip]=useState("");

  // Forms
  const [qSub,setQSub]=useState("");
  const [qCorr,setQCorr]=useState("");
  const [qTot,setQTot]=useState("");
  const [bookTitle,setBookTitle]=useState("");
  const [bookAuthor,setBookAuthor]=useState("");
  const [bookPages,setBookPages]=useState("");
  const [addingBook,setAddingBook]=useState(false);
  const [updatingBookId,setUpdatingBookId]=useState(null);
  const [bookPageInput,setBookPageInput]=useState("");
  const [runKm,setRunKm]=useState("");
  const [runMin,setRunMin]=useState("");
  const [weightIn,setWeightIn]=useState("");
  const [heightIn,setHeightIn]=useState("");
  const [newExpName,setNewExpName]=useState("");
  const [newExpAmt,setNewExpAmt]=useState("");
  const [newExpIcon,setNewExpIcon]=useState("💳");
  const [newExpInst,setNewExpInst]=useState("");
  const [newExpTotal,setNewExpTotal]=useState("");
  const [addingExp,setAddingExp]=useState(false);
  const [editingSalary,setEditingSalary]=useState(false);
  const [salaryIn,setSalaryIn]=useState("");

  // Concurso
  const [addingConcurso,setAddingConcurso]=useState(false);
  const [newConcName,setNewConcName]=useState("");
  const [editingConcursoId,setEditingConcursoId]=useState(null);
  const [editingSubjects,setEditingSubjects]=useState(false);
  const [newSubName,setNewSubName]=useState("");
  const [newSubIcon,setNewSubIcon]=useState("📝");
  const [newSubColor,setNewSubColor]=useState("#60a5fa");
  const [renamingConcId,setRenamingConcId]=useState(null);
  const [renamingConcName,setRenamingConcName]=useState("");

  // Habits
  const [addingHabit,setAddingHabit]=useState(false);
  const [newHabitName,setNewHabitName]=useState("");
  const [newHabitIcon,setNewHabitIcon]=useState("💧");
  const [newHabitColor,setNewHabitColor]=useState("#60a5fa");
  const [newHabitFreq,setNewHabitFreq]=useState("daily");

  // Simulado
  const [addingSimulado,setAddingSimulado]=useState(false);
  const [simName,setSimName]=useState("");
  const [simScore,setSimScore]=useState("");
  const [simTotal,setSimTotal]=useState("");
  const [simTime,setSimTime]=useState("");

  // Study goals
  const [editingGoal,setEditingGoal]=useState(null);
  const [goalInput,setGoalInput]=useState("");

  // Profile
  const [editingUsername,setEditingUsername]=useState(false);
  const [usernameIn,setUsernameIn]=useState("");
  const [showAvatarEditor,setShowAvatarEditor]=useState(false);

  const charRef=useRef(null);
  const questsRef=useRef({});
  useEffect(()=>{charRef.current=char;},[char]);
  useEffect(()=>{questsRef.current=quests;},[quests]);

  // LOAD
  useEffect(()=>{
    (async()=>{
      const c=await sg("rpg_v6_char");
      const q=await sg(`rpg_v6_q_${todayStr()}`);
      const p=await sg(`rpg_v6_p_${todayStr()}`);
      let loaded;
      if(c){
        let books=c.books||{reading:[],library:[]};
        if(books.current!==undefined){
          books={reading:books.current?[books.current]:[],library:books.library||[]};
        }
        if(!books.reading) books.reading=[];
        if(!books.library) books.library=[];

        const concursos=(c.concursos||[DEFAULT_CONCURSO]).map(cc=>({
          ...cc,
          subjects:cc.subjects&&cc.subjects.length>0?cc.subjects:DEFAULT_SUBJECTS,
          subjectMin:cc.subjectMin||{},
          questions:cc.questions||{},
          studySessions:cc.studySessions||[],
        }));

        loaded={...START,...c,
          stats:{...START.stats,...(c.stats||{})},
          finance:{salary:c.finance?.salary||800,expenses:c.finance?.expenses||START.finance.expenses},
          streak:{...START.streak,...(c.streak||{})},
          boss:{...START.boss,...(c.boss||{})},
          books,concursos,
          avatar:{...START.avatar,...(c.avatar||{})},
          body:c.body||START.body,
          workoutPlans:c.workoutPlans||null,
          runs:c.runs||[],workoutLog:c.workoutLog||[],
          unlockedAch:c.unlockedAch||[],
          questionLog:c.questionLog||[],
          habits:c.habits||[],
          moodLog:c.moodLog||[],
          simulados:c.simulados||[],
          studyGoals:c.studyGoals||{},
          xpHistory:c.xpHistory||[],
          modules:c.modules||["estudo","treino","corrida","financeiro","livros","habitos"],
          firebaseUid:c.firebaseUid||"",
          friends:c.friends||[],
          friendRequests:c.friendRequests||[],
        };
      } else { loaded={...START}; }

      const wid=weekId();
      if(loaded.boss.weekId!==wid){
        const wn=parseInt(wid.split("W")[1])||0;
        loaded.boss={weekId:wid,type:wn%BOSS_POOL.length,studyMin:0,trainCount:0,questions:0,runKm:0,claimed:false};
      }

      // ── FIX STREAK on load ──
      // If we haven't logged today yet, check if yesterday was the last date — keep streak
      // If last date is neither today nor yesterday, reset to 0
      const td=todayStr(), yd=yesterdayStr();
      const s=loaded.streak;
      if(s.lastDate && s.lastDate!==td && s.lastDate!==yd){
        loaded.streak={...s,current:0};
      }

      setChar(loaded);setQuests(q||{});setPens(p||{});
      const ac=loaded.concursos?.find(c2=>c2.id===loaded.activeConcurso);
      if(ac?.subjects?.length) setQSub(ac.subjects[0].id);
      // Show onboarding only if truly new (no saved data AND no username)
      if(!c||!loaded.username) setFirstAccess(true);
      setLoading(false);
    })();
  },[]);

  const addFloat=useCallback((xp)=>{
    const id=Date.now()+Math.random();
    setFloats(f=>[...f,{id,xp}]);
    setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==id)),2500);
  },[]);

  const showToast=(msg,color="#f0c040")=>{setToast({msg,color});setTimeout(()=>setToast(null),2800);};
  const save=async(c,q,p)=>{await ss("rpg_v6_char",c);if(q!=null)await ss(`rpg_v6_q_${todayStr()}`,q);if(p!=null)await ss(`rpg_v6_p_${todayStr()}`,p);};

  // ── CHECK & AWARD ACHIEVEMENTS ──
  const checkAndAwardAch=useCallback(async(nc)=>{
    const lv=getLvl(nc.totalXP).cur.lv;
    const newly=checkAchievements(nc,lv,nc.unlockedAch||[]);
    if(newly.length===0) return nc;
    let xpBonus=0;
    newly.forEach(a=>xpBonus+=a.xp);
    const updated={...nc,
      totalXP:nc.totalXP+xpBonus,
      unlockedAch:[...(nc.unlockedAch||[]),...newly.map(a=>a.id)]
    };
    // show popup for first one
    setAchPopup(newly[0]);
    setTimeout(()=>setAchPopup(null),3500);
    return updated;
  },[]);

  const applyDelta=(c,oldQ,newQ,raw)=>{
    const multi=streakMulti(c.streak?.current||0);
    const bonus=raw>0?Math.round(raw*(multi-1)):0;
    const cores=QUESTS.filter(q=>q.core).map(q=>q.id);
    const hadB=cores.every(id=>oldQ[id]),hasB=cores.every(id=>newQ[id]);
    return Math.round(raw+bonus)+(hadB===hasB?0:hasB?20:-20);
  };

  const triggerLvl=(prev,next)=>{
    if(getLvl(next).cur.lv>getLvl(prev).cur.lv){
      const d=LEVELS.find(l=>l.lv===getLvl(next).cur.lv);
      setLvlUp(d);setTimeout(()=>setLvlUp(null),3500);
    }
  };

  // ── STREAK: robusto com data local ──
  const updateStreak=(c,newQ)=>{
    const cores=QUESTS.filter(q=>q.core).map(q=>q.id);
    const allCoreDone=cores.every(id=>newQ[id]);
    if(!allCoreDone) return c.streak;
    const td=todayStr();
    const yd=yesterdayStr();
    const s={...c.streak};
    // Já contou hoje
    if(s.lastDate===td) return s;
    // Ontem foi o último dia → incrementa
    if(s.lastDate===yd){
      s.current=s.current+1;
    } else {
      // Mais de 1 dia sem completar → reinicia
      s.current=1;
    }
    s.best=Math.max(s.best||0,s.current);
    s.lastDate=td;
    return s;
  };

  const autoQuest=useCallback((qid,xp)=>{
    const c=charRef.current,q=questsRef.current;
    if(!c||q[qid]) return;
    const newQ={...q,[qid]:true};questsRef.current=newQ;setQuests(newQ);
    const delta=applyDelta(c,q,newQ,xp);
    const newXP=Math.max(0,c.totalXP+delta);
    const nc={...c,totalXP:newXP,stats:{...c.stats,totalStudyHours:(c.stats.totalStudyHours||0)+1,totalQuests:(c.stats.totalQuests||0)+1},boss:{...c.boss,studyMin:(c.boss.studyMin||0)+60}};
    charRef.current=nc;setChar(nc);addFloat(delta);triggerLvl(c.totalXP,newXP);save(nc,newQ,null);
  },[addFloat]);

  const toggleQuest=async(quest)=>{
    if(quest.req&&!quests[quest.req]) return;
    const wasOn=!!quests[quest.id];
    const newQ={...quests,[quest.id]:!wasOn};setQuests(newQ);questsRef.current=newQ;
    const raw=wasOn?-quest.xp:quest.xp;
    const ns={...char.stats};
    if(!wasOn){if(quest.id==="workout")ns.totalWorkouts=(ns.totalWorkouts||0)+1;if(quest.id==="study_1h"||quest.id==="study_2h")ns.totalStudyHours=(ns.totalStudyHours||0)+1;ns.totalQuests=(ns.totalQuests||0)+1;}
    else{if(quest.id==="workout")ns.totalWorkouts=Math.max(0,(ns.totalWorkouts||0)-1);ns.totalQuests=Math.max(0,(ns.totalQuests||0)-1);}
    const delta=applyDelta(char,quests,newQ,raw);
    const newXP=Math.max(0,char.totalXP+delta);
    const newStreak=!wasOn?updateStreak({...char,stats:ns},newQ):char.streak;
    if(newStreak.current>(ns.streakBest||0)) ns.streakBest=newStreak.current;
    const newBoss={...char.boss};
    if(!wasOn&&quest.id==="workout") newBoss.trainCount=(newBoss.trainCount||0)+1;
    let nc={...char,totalXP:newXP,stats:ns,streak:newStreak,boss:newBoss};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(delta);triggerLvl(char.totalXP,newXP);await save(nc,newQ,null);
  };

  const togglePen=async(pen)=>{
    const wasOn=!!pens[pen.id];const newP={...pens,[pen.id]:!wasOn};setPens(newP);
    const delta=wasOn?-pen.xp:pen.xp;const newXP=Math.max(0,char.totalXP+delta);
    const nc={...char,totalXP:newXP};charRef.current=nc;setChar(nc);addFloat(delta);await save(nc,null,newP);
  };

  // ── STUDY SESSION ──
  const saveStudySession=async()=>{
    if(!timerSub||!studyStart||!studyEnd) return;
    const mins=minutesDiff(studyStart,studyEnd);
    if(!mins||mins<=0){showToast("Horário inválido","#ef4444");return;}
    const c=charRef.current;
    const concs=c.concursos.map(cc=>{
      if(cc.id!==c.activeConcurso) return cc;
      const prev=(cc.subjectMin||{})[timerSub]||0;
      return {...cc,subjectMin:{...(cc.subjectMin||{}),[timerSub]:prev+mins}};
    });
    const xpGain=Math.round(mins/2);
    const newXP=Math.max(0,c.totalXP+xpGain);
    const newHours=(c.stats.totalStudyHours||0)+Math.floor(mins/60);
    const newBoss={...c.boss,studyMin:(c.boss.studyMin||0)+mins};
    // record xp history
    const today=todayStr();
    const xpHist=[...(c.xpHistory||[])];
    const todayIdx=xpHist.findIndex(h=>h.date===today);
    if(todayIdx>=0) xpHist[todayIdx]={...xpHist[todayIdx],xp:xpHist[todayIdx].xp+xpGain};
    else xpHist.push({date:today,xp:xpGain});
    let nc={...c,totalXP:newXP,stats:{...c.stats,totalStudyHours:newHours},concursos:concs,boss:newBoss,xpHistory:xpHist.slice(-30)};
    nc=await checkAndAwardAch(nc);
    const totalMinsToday=(concs.find(cc=>cc.id===c.activeConcurso)?.subjectMin||{})[timerSub]||0;
    if(mins>=60||totalMinsToday>=60) autoQuest("study_1h",30);
    if(mins>=120||totalMinsToday>=120) autoQuest("study_2h",25);
    charRef.current=nc;setChar(nc);addFloat(xpGain);triggerLvl(c.totalXP,newXP);
    await save(nc,null,null);
    setStudyStart("");setStudyEnd("");setStudyNote("");
    showToast(`📚 ${fmtHM(mins)} registrados! +${xpGain} XP`,"#60a5fa");
  };

  const getPlans=()=>char?.workoutPlans||DEFAULT_PLANS;

  // ── WORKOUT ──
  const openEditPlan=(key)=>{setEditingPlanKey(key);setEditPlan(JSON.parse(JSON.stringify(getPlans()[key])));setWorkoutView("edit");};
  const saveEditPlan=async()=>{
    if(!editPlan) return;
    const c=charRef.current;
    const plans={...getPlans(),[editingPlanKey]:editPlan};
    const nc={...c,workoutPlans:plans};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setWorkoutView("list");setEditingPlanKey(null);setEditPlan(null);showToast("Treino salvo!","#ef4444");
  };
  const addExerciseToEdit=()=>{
    if(!newExName.trim()) return;
    const ex={id:uid(),name:newExName,sets:parseInt(newExSets)||3,reps:newExReps||"12",rest:newExRest||"60s",tip:newExTip||""};
    setEditPlan(p=>({...p,exercises:[...p.exercises,ex]}));
    setNewExName("");setNewExSets("3");setNewExReps("12");setNewExRest("60s");setNewExTip("");
  };
  const removeExercise=(idx)=>setEditPlan(p=>({...p,exercises:p.exercises.filter((_,i)=>i!==idx)}));
  const updateExField=(idx,field,val)=>setEditPlan(p=>{const exs=[...p.exercises];exs[idx]={...exs[idx],[field]:val};return {...p,exercises:exs};});
  const createNewPlan=async()=>{
    if(!newPlanName.trim()) return;
    const key=`custom_${uid()}`;
    const plan={id:key,label:newPlanName,focus:newPlanFocus||"Treino personalizado",icon:newPlanIcon,color:newPlanColor,isDefault:false,exercises:[]};
    const c=charRef.current;
    const nc={...c,workoutPlans:{...getPlans(),[key]:plan}};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setNewPlanName("");setNewPlanFocus("");setWorkoutView("list");showToast("Nova ficha criada!",newPlanColor);
  };
  const deletePlan=async(key)=>{
    const plans=getPlans();
    if(Object.keys(plans).length<=1){showToast("Mantenha ao menos 1 treino","#ef4444");return;}
    const newPlans={...plans};delete newPlans[key];
    const c=charRef.current;const nc={...c,workoutPlans:newPlans};
    charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Ficha removida","#ef4444");
  };
  const startWorkout=(key)=>{setActiveWorkout(key);setDoneEx({});setWorkoutView("active");};
  const finishWorkout=async()=>{
    const plan=getPlans()[activeWorkout];
    const done2=plan.exercises.filter(e=>doneEx[e.id]).length;
    const xp=done2===plan.exercises.length?35:Math.round((done2/plan.exercises.length)*25);
    const c=charRef.current;
    const newStats={...c.stats,totalWorkouts:(c.stats.totalWorkouts||0)+1};
    const log2={date:todayStr(),workout:activeWorkout,label:plan.label,done:done2,total:plan.exercises.length,xp};
    const newXP=Math.max(0,c.totalXP+xp);
    const newQ={...questsRef.current,workout:true};setQuests(newQ);questsRef.current=newQ;
    let nc={...c,totalXP:newXP,stats:newStats,boss:{...c.boss,trainCount:(c.boss.trainCount||0)+1},workoutLog:[log2,...(c.workoutLog||[])].slice(0,30)};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(xp);triggerLvl(c.totalXP,newXP);await save(nc,newQ,null);
    setActiveWorkout(null);setDoneEx({});setWorkoutView("list");showToast(`${plan.label} concluído! +${xp} XP`,plan.color);
  };

  // ── QUESTÕES ──
  const submitQ=async()=>{
    const cor=parseInt(qCorr),tot=parseInt(qTot);if(!cor||!tot||cor>tot) return;
    const c=charRef.current;
    const concs=c.concursos.map(cc=>{if(cc.id!==c.activeConcurso)return cc;
      const prev=(cc.questions||{})[qSub]||{correct:0,total:0};
      return {...cc,questions:{...(cc.questions||{}),[qSub]:{correct:prev.correct+cor,total:prev.total+tot}}};});
    const xpGain=Math.round(cor*0.5);const newXP=Math.max(0,c.totalXP+xpGain);
    const newLog=[{date:todayStr(),subject:qSub,correct:cor,total:tot,concurso:c.activeConcurso},...(c.questionLog||[])].slice(0,500);
    let nc={...c,totalXP:newXP,stats:{...c.stats,totalQuestions:(c.stats.totalQuestions||0)+tot},concursos:concs,boss:{...c.boss,questions:(c.boss.questions||0)+tot},questionLog:newLog};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(xpGain);triggerLvl(c.totalXP,newXP);await save(nc,null,null);
    setQCorr("");setQTot("");showToast(`+${xpGain} XP · ${cor}/${tot} acertos`,"#a78bfa");
  };
  const getQStats=(sub,ac)=>{
    if(qPeriod==="all") return (ac?.questions||{})[sub]||{correct:0,total:0};
    const days=qPeriod==="today"?0:qPeriod==="7d"?7:30;
    const cutoff=new Date();if(days>0)cutoff.setDate(cutoff.getDate()-days);
    const logs=(char.questionLog||[]).filter(l=>l.concurso===char.activeConcurso&&l.subject===sub&&(days===0?l.date===todayStr():new Date(l.date)>=cutoff));
    return {correct:logs.reduce((a,l)=>a+l.correct,0),total:logs.reduce((a,l)=>a+l.total,0)};
  };

  // ── LIVROS ──
  const addBook=async()=>{
    if(!bookTitle||!bookPages) return;
    const book={id:`bk_${uid()}`,title:bookTitle,author:bookAuthor,page:0,total:parseInt(bookPages),startDate:todayStr()};
    const c=charRef.current;
    const nc={...c,books:{...c.books,reading:[...(c.books.reading||[]),book]}};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setBookTitle("");setBookAuthor("");setBookPages("");setAddingBook(false);
    showToast("📖 Livro adicionado!","#60a5fa");
  };
  const updateBookPage=async(bookId)=>{
    const p=parseInt(bookPageInput);if(!p) return;
    const c=charRef.current;
    const reading=(c.books.reading||[]).map(b=>b.id===bookId?{...b,page:Math.min(p,b.total)}:b);
    const nc={...c,books:{...c.books,reading}};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setUpdatingBookId(null);setBookPageInput("");showToast("Página salva!","#60a5fa");
  };
  const finishBook=async(bookId)=>{
    const c=charRef.current;
    const book=c.books.reading.find(b=>b.id===bookId);if(!book) return;
    const done={...book,finishedDate:todayStr()};
    const reading=(c.books.reading||[]).filter(b=>b.id!==bookId);
    let nc={...c,totalXP:c.totalXP+80,stats:{...c.stats,booksFinished:(c.stats.booksFinished||0)+1},books:{reading,library:[done,...(c.books.library||[])]}};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(80);triggerLvl(c.totalXP,nc.totalXP);await save(nc,null,null);
    showToast("📚 Livro finalizado! +80 XP","#f0c040");
  };
  const removeBook=async(bookId)=>{
    const c=charRef.current;
    const reading=(c.books.reading||[]).filter(b=>b.id!==bookId);
    const nc={...c,books:{...c.books,reading}};
    charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Livro removido","#ef4444");
  };

  // ── CORRIDA ──
  const logRun=async()=>{
    const km=parseFloat(runKm),min2=parseFloat(runMin);if(!km||km<=0)return;
    const c=charRef.current;const isPR=km>(c.stats.prKm||0);const xpGain=RUN_XP(km)+(isPR?20:0);
    const pace=min2&&km?Math.round((min2/km)*60):null;
    const ns={...c.stats,totalKm:(c.stats.totalKm||0)+km,totalRuns:(c.stats.totalRuns||0)+1,prKm:Math.max(c.stats.prKm||0,km)};
    const newXP=Math.max(0,c.totalXP+xpGain);
    let nc={...c,totalXP:newXP,stats:ns,boss:{...c.boss,runKm:(c.boss.runKm||0)+km},runs:[{date:todayStr(),km,minutes:min2||null,pace,xp:xpGain,pr:isPR},...(c.runs||[])].slice(0,100)};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(xpGain);triggerLvl(c.totalXP,newXP);await save(nc,null,null);
    setRunKm("");setRunMin("");showToast(`🏃 ${km}km${isPR?" · PR! 🏅":""}`,isPR?"#f0c040":"#34d399");
  };

  // ── FINANCE ──
  const togglePaid=async(expId)=>{const c=charRef.current;const exp=c.finance.expenses.find(e=>e.id===expId);const wasPaid=exp?.paid;const exps=c.finance.expenses.map(e=>e.id!==expId?e:{...e,paid:!e.paid});const xpDelta=wasPaid?-FIN_XP(exp.amount):FIN_XP(exp.amount);const nc={...c,totalXP:Math.max(0,c.totalXP+xpDelta),finance:{...c.finance,expenses:exps}};charRef.current=nc;setChar(nc);addFloat(xpDelta);await save(nc,null,null);};
  const addExpense=async()=>{if(!newExpName||!newExpAmt)return;const inst=newExpInst&&newExpTotal?{current:parseInt(newExpInst),total:parseInt(newExpTotal)}:null;const exp={id:`e_${uid()}`,name:newExpName,amount:parseFloat(newExpAmt),icon:newExpIcon,paid:false,installments:inst};const c=charRef.current;const nc={...c,finance:{...c.finance,expenses:[...c.finance.expenses,exp]}};charRef.current=nc;setChar(nc);await save(nc,null,null);setNewExpName("");setNewExpAmt("");setNewExpInst("");setNewExpTotal("");setAddingExp(false);showToast("Gasto adicionado!","#22c55e");};
  const removeExpense=async(id)=>{const c=charRef.current;const nc={...c,finance:{...c.finance,expenses:c.finance.expenses.filter(e=>e.id!==id)}};charRef.current=nc;setChar(nc);await save(nc,null,null);};
  const advanceInstallment=async(expId)=>{const c=charRef.current;const exps=c.finance.expenses.map(e=>{if(e.id!==expId||!e.installments)return e;const next=e.installments.current+1;return next>e.installments.total?{...e,paid:true,installments:{...e.installments,current:e.installments.total}}:{...e,installments:{...e.installments,current:next}};});const nc={...c,finance:{...c.finance,expenses:exps}};charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Parcela avançada!","#22c55e");};
  const saveSalary=async()=>{const v=parseFloat(salaryIn);if(!v)return;const c=charRef.current;const nc={...c,finance:{...c.finance,salary:v}};charRef.current=nc;setChar(nc);await save(nc,null,null);setEditingSalary(false);setSalaryIn("");showToast("Salário atualizado!","#22c55e");};

  // ── CONCURSO ──
  const addConcurso=async()=>{
    if(!newConcName) return;
    const id=`c_${uid()}`;
    const c=charRef.current;
    const nc={...c,concursos:[...c.concursos,{id,name:newConcName,active:true,subjects:[...DEFAULT_SUBJECTS],subjectMin:{},questions:{},studySessions:[]}],activeConcurso:id};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setNewConcName("");setAddingConcurso(false);setQSub(DEFAULT_SUBJECTS[0].id);showToast("Concurso criado!","#a78bfa");
  };
  const deleteConcurso=async(id)=>{
    const c=charRef.current;
    if(c.concursos.length<=1){showToast("Mantenha ao menos 1 concurso","#ef4444");return;}
    const concursos=c.concursos.filter(cc=>cc.id!==id);
    const activeConcurso=c.activeConcurso===id?concursos[0].id:c.activeConcurso;
    const nc={...c,concursos,activeConcurso};
    charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Concurso removido","#ef4444");
  };
  const renameConcurso=async()=>{
    if(!renamingConcName.trim()||!renamingConcId) return;
    const c=charRef.current;
    const concursos=c.concursos.map(cc=>cc.id===renamingConcId?{...cc,name:renamingConcName.trim()}:cc);
    const nc={...c,concursos};charRef.current=nc;setChar(nc);await save(nc,null,null);
    setRenamingConcId(null);setRenamingConcName("");showToast("Renomeado!","#a78bfa");
  };
  const switchConcurso=async(id)=>{
    const c=charRef.current;const nc={...c,activeConcurso:id};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    const conc=c.concursos.find(cc=>cc.id===id);
    if(conc?.subjects?.length) setQSub(conc.subjects[0].id);
  };
  const addSubject=async()=>{
    if(!newSubName.trim()) return;
    const c=charRef.current;
    const sub={id:`s_${uid()}`,name:newSubName.trim(),icon:newSubIcon,color:newSubColor};
    const concursos=c.concursos.map(cc=>cc.id===editingConcursoId?{...cc,subjects:[...(cc.subjects||[]),sub]}:cc);
    const nc={...c,concursos};charRef.current=nc;setChar(nc);await save(nc,null,null);
    setNewSubName("");showToast("Matéria adicionada!",newSubColor);
  };
  const removeSubject=async(concId,subId)=>{
    const c=charRef.current;
    const concursos=c.concursos.map(cc=>{
      if(cc.id!==concId) return cc;
      const subjects=(cc.subjects||[]).filter(s=>s.id!==subId);
      const subjectMin={...cc.subjectMin};delete subjectMin[subId];
      const questions={...cc.questions};delete questions[subId];
      return {...cc,subjects,subjectMin,questions};
    });
    const nc={...c,concursos};charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Matéria removida","#ef4444");
  };

  // ── HABITS ──
  const addHabit=async()=>{
    if(!newHabitName.trim()) return;
    const habit={id:`h_${uid()}`,name:newHabitName.trim(),icon:newHabitIcon,color:newHabitColor,freq:newHabitFreq,log:{}};
    const c=charRef.current;
    const nc={...c,habits:[...(c.habits||[]),habit]};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setNewHabitName("");setAddingHabit(false);showToast("Hábito criado!",newHabitColor);
  };
  const toggleHabit=async(habitId)=>{
    const c=charRef.current;
    const td=todayStr();
    const habits=(c.habits||[]).map(h=>{
      if(h.id!==habitId) return h;
      const log={...h.log};
      const wasDone=!!log[td];
      if(wasDone) delete log[td]; else log[td]=true;
      return {...h,log};
    });
    const habit=habits.find(h=>h.id===habitId);
    const wasDone=!(habit.log[td]);// inverted because we already toggled
    const xpDelta=wasDone?-5:5;
    const nc={...c,habits,totalXP:Math.max(0,c.totalXP+xpDelta)};
    charRef.current=nc;setChar(nc);addFloat(xpDelta);await save(nc,null,null);
  };
  const removeHabit=async(habitId)=>{
    const c=charRef.current;
    const nc={...c,habits:(c.habits||[]).filter(h=>h.id!==habitId)};
    charRef.current=nc;setChar(nc);await save(nc,null,null);showToast("Hábito removido","#ef4444");
  };

  // ── SIMULADO ──
  const addSimulado=async()=>{
    if(!simScore||!simTotal) return;
    const sim={id:`sim_${uid()}`,name:simName||`Simulado ${(char.simulados||[]).length+1}`,score:parseInt(simScore),total:parseInt(simTotal),time:simTime||"",date:todayStr(),concurso:char.activeConcurso};
    const xp=Math.round(parseInt(simScore)*0.5);
    const c=charRef.current;
    let nc={...c,totalXP:c.totalXP+xp,simulados:[sim,...(c.simulados||[])].slice(0,50)};
    nc=await checkAndAwardAch(nc);
    charRef.current=nc;setChar(nc);addFloat(xp);triggerLvl(c.totalXP,nc.totalXP);await save(nc,null,null);
    setSimName("");setSimScore("");setSimTotal("");setSimTime("");setAddingSimulado(false);
    showToast(`📋 Simulado! ${sim.score}/${sim.total} +${xp}XP`,"#a78bfa");
  };

  // ── STUDY GOALS ──
  const saveGoal=async(subId)=>{
    const v=parseInt(goalInput);if(!v||v<=0) return;
    const c=charRef.current;
    const nc={...c,studyGoals:{...(c.studyGoals||{}),[subId]:v}};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setEditingGoal(null);setGoalInput("");showToast("Meta salva!","#60a5fa");
  };

  // ── MOOD ──
  const logMood=async(moodId)=>{
    const mood=MOODS.find(m=>m.id===moodId);if(!mood) return;
    const td=todayStr();
    const c=charRef.current;
    const moodLog=[...(c.moodLog||[]).filter(m=>m.date!==td),{date:td,mood:moodId}].slice(-60);
    const nc={...c,moodLog,totalXP:c.totalXP+mood.xp};
    charRef.current=nc;setChar(nc);if(mood.xp>0) addFloat(mood.xp);await save(nc,null,null);
    showToast(`Humor registrado ${mood.icon}`,"#a78bfa");
  };

  // ── AVATAR ──
  const saveAvatar=async(av)=>{const c=charRef.current;const nc={...c,avatar:{...c.avatar,...av}};charRef.current=nc;setChar(nc);await save(nc,null,null);};
  const saveUsername=async()=>{if(!usernameIn.trim())return;const c=charRef.current;const nc={...c,username:usernameIn.trim()};charRef.current=nc;setChar(nc);await save(nc,null,null);setEditingUsername(false);setUsernameIn("");showToast("Nome atualizado!","#f0c040");};
  const saveBodyStats=async()=>{if(!weightIn&&!heightIn)return;const c=charRef.current;const nc={...c,body:{weight:weightIn||c.body?.weight||"",height:heightIn||c.body?.height||""}};charRef.current=nc;setChar(nc);await save(nc,null,null);setWeightIn("");setHeightIn("");showToast("Medidas salvas!","#34d399");};

  // ── BOSS ──
  const claimBoss=async()=>{const c=charRef.current;const boss=BOSS_POOL[c.boss?.type||0];const newXP=Math.max(0,c.totalXP+boss.xp);let nc={...c,totalXP:newXP,stats:{...c.stats,bossesCleared:(c.stats.bossesCleared||0)+1},boss:{...c.boss,claimed:true}};nc=await checkAndAwardAch(nc);charRef.current=nc;setChar(nc);addFloat(boss.xp);triggerLvl(c.totalXP,newXP);await save(nc,null,null);showToast(`⚔️ Boss derrotado! +${boss.xp} XP`,"#f0c040");};

  // ── EXPORT ──
  const exportData=()=>{
    const data=JSON.stringify(char,null,2);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`rpg_backup_${todayStr()}.json`;a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado!","#22c55e");
  };

  // ── IMPORT BACKUP ──
  const importData=(e)=>{
    const file=e.target.files?.[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.totalXP&&data.totalXP!==0) throw new Error("Arquivo inválido");
        // migrate just in case
        let books=data.books||{reading:[],library:[]};
        if(books.current!==undefined) books={reading:books.current?[books.current]:[],library:books.library||[]};
        if(!books.reading) books.reading=[];
        if(!books.library) books.library=[];
        const concursos=(data.concursos||[DEFAULT_CONCURSO]).map(cc=>({
          ...cc,
          subjects:cc.subjects&&cc.subjects.length>0?cc.subjects:DEFAULT_SUBJECTS,
          subjectMin:cc.subjectMin||{},questions:cc.questions||{},studySessions:cc.studySessions||[],
        }));
        const restored={...START,...data,
          stats:{...START.stats,...(data.stats||{})},
          finance:{salary:data.finance?.salary||800,expenses:data.finance?.expenses||START.finance.expenses},
          streak:{...START.streak,...(data.streak||{})},
          boss:{...START.boss,...(data.boss||{})},
          books,concursos,
          avatar:data.avatar||START.avatar,body:data.body||START.body,
          workoutPlans:data.workoutPlans||null,
          runs:data.runs||[],workoutLog:data.workoutLog||[],
          unlockedAch:data.unlockedAch||[],questionLog:data.questionLog||[],
          habits:data.habits||[],moodLog:data.moodLog||[],
          simulados:data.simulados||[],studyGoals:data.studyGoals||{},xpHistory:data.xpHistory||[],
        };
        setChar(restored);
        save(restored,null,null);
        showToast(`✅ Backup de ${data.username||"Jogador"} restaurado!`,"#22c55e");
        setFirstAccess(false);
      } catch(err){
        showToast("Arquivo inválido ou corrompido","#ef4444");
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };

  // ── ONBOARDING ──
  const finishOnboarding=async()=>{
    if(!onboardName.trim()||onboardModules.length===0) return;
    const fbUid=`usr_${uid()}`;
    const base={...START};
    const wid=weekId();
    const wn=parseInt(wid.split("W")[1])||0;
    const nc={
      ...base,
      username:onboardName.trim(),
      avatar:onboardAvatar,
      modules:onboardModules,
      firebaseUid:fbUid,
      friends:[],
      friendRequests:[],
      boss:{weekId:wid,type:wn%BOSS_POOL.length,studyMin:0,trainCount:0,questions:0,runKm:0,claimed:false},
    };
    charRef.current=nc;
    setChar(nc);
    await save(nc,null,null);
    // Firebase sync non-blocking — don't await, don't crash if fails
    try{ fbSaveProfile(fbUid,{...nc,level:getLvl(nc.totalXP).cur.lv}); }catch(_){}
    const g=onboardAvatar.gender==="f"?"Bem-vinda":"Bem-vindo";
    showToast(`${g}, ${onboardName.trim()}! ⚔️`,"#f0c040");
    // Set firstAccess false LAST so char is already set
    setFirstAccess(false);
  };

  // ── FIREBASE SYNC (save profile after any XP change) ──
  const fbSync=useCallback(async(nc)=>{
    if(!nc?.firebaseUid) return;
    await fbSaveProfile(nc.firebaseUid,{...nc,level:getLvl(nc.totalXP).cur.lv});
  },[]);

  // ── FRIENDS ──
  const handleSearchUser=async()=>{
    if(!searchUser.trim()) return;
    setSearchLoading(true);setSearchResult(null);
    const result=await fbSearchUser(searchUser.trim());
    if(!result||result.uid===char.firebaseUid) setSearchResult({notFound:true});
    else setSearchResult(result);
    setSearchLoading(false);
  };

  const handleSendRequest=async(toUid)=>{
    if(!char.firebaseUid){showToast("Configure seu perfil primeiro","#ef4444");return;}
    const ok=await fbSendFriendRequest(char.firebaseUid,toUid);
    if(ok) showToast("Pedido enviado!","#a78bfa");
    else showToast("Erro ao enviar pedido","#ef4444");
    setSearchResult(null);setSearchUser("");
  };

  const handleAcceptFriend=async(friendUid)=>{
    const ok=await fbAcceptFriend(char.firebaseUid,friendUid);
    if(ok){
      const nc={...char,friends:[...(char.friends||[]),friendUid],friendRequests:(char.friendRequests||[]).filter(id=>id!==friendUid)};
      charRef.current=nc;setChar(nc);await save(nc,null,null);
      showToast("Amigo adicionado! 🎉","#22c55e");
      // Load friend profile
      loadFriendProfile(friendUid);
    }
  };

  const handleDeclineFriend=async(friendUid)=>{
    await fbDeclineFriend(char.firebaseUid,friendUid);
    const nc={...char,friendRequests:(char.friendRequests||[]).filter(id=>id!==friendUid)};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
  };

  const handleRemoveFriend=async(friendUid)=>{
    await fbRemoveFriend(char.firebaseUid,friendUid);
    const nc={...char,friends:(char.friends||[]).filter(id=>id!==friendUid)};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    setFriendProfiles(p=>{const n={...p};delete n[friendUid];return n;});
    showToast("Amigo removido","#ef4444");
  };

  const loadFriendProfile=async(friendUid)=>{
    const profile=await fbGetProfile(friendUid);
    if(profile) setFriendProfiles(p=>({...p,[friendUid]:profile}));
  };

  // Load friend profiles on mount
  useEffect(()=>{
    if(!char?.firebaseUid) return;
    if(char.friends?.length){
      char.friends.forEach(fid=>loadFriendProfile(fid));
    }
    let unsub=null;
    const startListener=()=>{
      try{
        if(!db||!fbFunctions.doc||!fbFunctions.onSnapshot) return;
        const {doc,onSnapshot} = fbFunctions;
        unsub=onSnapshot(doc(db,"users",char.firebaseUid),(snap)=>{
          try{
            if(snap.exists()){
              const data=snap.data();
              const newRequests=data.friendRequests||[];
              if(newRequests.length>(charRef.current?.friendRequests||[]).length){
                showToast("📩 Novo pedido de amizade!","#a78bfa");
              }
              const nc={...charRef.current,friendRequests:newRequests,friends:data.friends||charRef.current?.friends||[]};
              charRef.current=nc;setChar(nc);save(nc,null,null);
            }
          }catch(_){}
        },(err)=>{ console.warn("Firestore listener error:",err); });
      }catch(e){ console.warn("Could not start Firestore listener:",e); }
    };
    // Wait a bit for Firebase to init before starting listener
    const t=setTimeout(startListener, 2000);
    return()=>{ clearTimeout(t); try{ unsub&&unsub(); }catch(_){} };
  },[char?.firebaseUid]);

  // ── MODULE HELPERS ──
  const hasModule=(id)=>(char?.modules||[]).includes(id);
  const toggleModule=async(id)=>{
    const c=charRef.current;
    const mods=c.modules||[];
    const updated=mods.includes(id)?mods.filter(m=>m!==id):[...mods,id];
    if(updated.length===0){showToast("Mantenha ao menos 1 módulo","#ef4444");return;}
    const nc={...c,modules:updated};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    await fbSync(nc);
    showToast(mods.includes(id)?"Módulo desativado":"Módulo ativado!","#f0c040");
  };
  const requestNotif=async()=>{
    if(!("Notification" in window)){showToast("Notificações não suportadas","#ef4444");return;}
    const p=await Notification.requestPermission();
    if(p==="granted"){
      showToast("Notificações ativadas! ✓","#22c55e");
      scheduleSmartNotifs();
    } else showToast("Permissão negada","#ef4444");
  };

  // ── SMART NOTIFICATIONS ──
  const scheduleSmartNotifs=()=>{
    if(!("Notification" in window)||Notification.permission!=="granted") return;
    const c=charRef.current||char;
    if(!c) return;
    const now=new Date();
    const hour=now.getHours();
    // Only send between 8h-22h
    if(hour<8||hour>=22) return;
    const alerts=[];
    // Streak at risk — no cores done and it's after 8pm
    if(hour>=20){
      const cores=QUESTS.filter(q=>q.core).map(q=>q.id);
      const q=questsRef.current||{};
      if(!cores.every(id=>q[id])) alerts.push({title:"⚠️ Streak em risco!",body:`Complete Estudar, Treinar e Dormir bem para manter seu streak de ${c.streak?.current||0} dias!`});
    }
    // No workout in 3 days
    const lastWorkout=c.workoutLog?.[0];
    if(lastWorkout){
      const diff=Math.floor((now-new Date(lastWorkout.date))/(864e5));
      if(diff>=3) alerts.push({title:"💪 Faz 3 dias sem treino!",body:"Seu corpo está pedindo movimento. Que tal o Treino A hoje?"});
    }
    // Boss at risk — week ending soon
    const bossGoals=BOSS_POOL[c.boss?.type||0].goals;
    const anyUnfinished=Object.entries(bossGoals).some(([k])=>{
      const pctV={studyMin:(c.boss?.studyMin||0)/bossGoals.studyMin,trainCount:(c.boss?.trainCount||0)/(bossGoals.trainCount||1),questions:(c.boss?.questions||0)/(bossGoals.questions||1),runKm:(c.boss?.runKm||0)/(bossGoals.runKm||1)};
      return bossGoals[k]&&(pctV[k]||0)<1;
    });
    if(anyUnfinished&&new Date().getDay()===6) alerts.push({title:"👹 Boss semanal!",body:"É sábado! Complete o boss desta semana antes de domingo."});
    // Send one alert (don't spam)
    if(alerts.length>0){
      const a=alerts[0];
      new Notification(a.title,{body:a.body,icon:"/icon.png"});
    }
  };

  // Run smart notifs check on load and every hour
  useEffect(()=>{
    const run=()=>scheduleSmartNotifs();
    const iv=setInterval(run,3600000); // every hour
    return()=>clearInterval(iv);
  },[]);

  // ── BUILD CONTEXT FOR AI ──
  const buildMentorContext=(c)=>{
    const ac=c.concursos?.find(cc=>cc.id===c.activeConcurso)||c.concursos?.[0];
    const lastWorkout=c.workoutLog?.[0];
    const daysSinceWorkout=lastWorkout?Math.floor((new Date()-new Date(lastWorkout.date))/(864e5)):null;
    const lastRun=c.runs?.[0];
    const daysSinceRun=lastRun?Math.floor((new Date()-new Date(lastRun.date))/(864e5)):null;
    const weakSubs=(ac?.subjects||[]).filter(s=>{const d=(ac.questions||{})[s.id];return d&&d.total>=10&&(d.correct/d.total)<0.80;});
    const simAvg=(c.simulados||[]).length>0?Math.round((c.simulados||[]).reduce((a,s)=>a+Math.round((s.score/s.total)*100),0)/(c.simulados||[]).length):null;
    const totalStudyMin=Object.values(ac?.subjectMin||{}).reduce((a,b)=>a+b,0);
    const boss=BOSS_POOL[c.boss?.type||0];
    return `Você é um mentor motivacional e estratégico para um app de RPG de produtividade chamado "RPG da Vida Real". Seu tom é direto, encorajador e personalizado. Use emojis com moderação. Responda sempre em português brasileiro.

DADOS DO USUÁRIO (${c.username||"Jogador"}):
- Nível: ${getLvl(c.totalXP).cur.lv} (${getLvl(c.totalXP).cur.title}) — ${c.totalXP} XP total
- Streak: ${c.streak?.current||0} dias (recorde: ${c.streak?.best||0})
- Concurso ativo: ${ac?.name||"Nenhum"}
- Total horas estudo: ${c.stats?.totalStudyHours||0}h
- Horas de estudo (total minutos): ${Math.round(totalStudyMin/60*10)/10}h
- Matérias fracas (<80%): ${weakSubs.map(s=>s.name).join(", ")||"Nenhuma"}
- Simulados: ${(c.simulados||[]).length} realizados${simAvg?`, média ${simAvg}%`:""}
- Treinos: ${c.stats?.totalWorkouts||0} no total${daysSinceWorkout!==null?`, último há ${daysSinceWorkout} dias`:""}
- Corrida: ${c.stats?.totalKm||0}km total, recorde ${c.stats?.prKm||0}km${daysSinceRun!==null?`, última há ${daysSinceRun} dias`:""}
- Boss semanal: ${boss.name} — ${c.boss?.claimed?"DERROTADO ✓":"em andamento"}
- Hábitos ativos: ${(c.habits||[]).length}
- Livros lendo: ${(c.books?.reading||[]).length}, finalizados: ${c.stats?.booksFinished||0}
- Finanças: salário ${(c.finance?.salary||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}, disponível ${((c.finance?.salary||0)-(c.finance?.expenses||[]).reduce((a,e)=>a+e.amount,0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}

Analise esses dados e responda de forma personalizada e útil. Seja específico, não genérico.`;
  };

  // ── AI JARVIS CHAT ──
  const sendMentorMessage=async(userMsg)=>{
    if(!userMsg.trim()||mentorLoading) return;
    // Use ref to always get latest chat history — avoids stale closure
    const currentChat=mentorChatRef.current;
    const newChat=[...currentChat,{role:"user",content:userMsg}];
    mentorChatRef.current=newChat;
    setMentorChat(newChat);
    setMentorInput("");
    setMentorLoading(true);
    setTimeout(()=>mentorEndRef.current?.scrollIntoView({behavior:"smooth"}),100);
    try{
      const systemPrompt=buildMentorContext(charRef.current||char);
      const messages=newChat.map(m=>({role:m.role,content:m.content}));
      const apiUrl="https://api.anthropic.com/v1/messages";
      const proxyUrl=`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
      const res=await fetch(proxyUrl,{
        method:"POST",
        headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:800,
          system:systemPrompt,
          messages,
        }),
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const reply=data.content?.map(b=>b.text||"").join("")||"Não consegui responder agora.";
      const updated=[...newChat,{role:"assistant",content:reply}];
      mentorChatRef.current=updated;
      setMentorChat(updated);
      setTimeout(()=>mentorEndRef.current?.scrollIntoView({behavior:"smooth"}),100);
    } catch(err){
      // Fallback local analysis
      const c=charRef.current||char;
      const ac=c.concursos?.find(cc=>cc.id===c.activeConcurso)||c.concursos?.[0];
      const weakSubs=(ac?.subjects||[]).filter(s=>{const d=(ac.questions||{})[s.id];return d&&d.total>=10&&(d.correct/d.total)<0.80;});
      const lastWorkout=c.workoutLog?.[0];
      const daysSince=lastWorkout?Math.floor((new Date()-new Date(lastWorkout.date))/(864e5)):null;
      const streak=c.streak?.current||0;
      const msg=userMsg.toLowerCase();
      let reply="";
      if(msg.includes("streak")||msg.includes("dias")){
        reply=streak===0?`Seu streak está zerado. Para começar, complete as 3 missões principais hoje: Estudar, Treinar e Dormir bem. Cada dia consecutivo vale um multiplicador de XP!`:`Você está em ${streak} dias de streak! ${streak>=30?"Nível Monge — impressionante consistência!":streak>=7?"Ótima sequência, continue firme!":"Bom começo, construa o hábito!"} O multiplicador atual é ×${streakMulti(streak).toFixed(2)}.`;
      } else if(msg.includes("matéria")||msg.includes("estudo")||msg.includes("foco")){
        reply=weakSubs.length>0?`Foque em: ${weakSubs.map(s=>s.name).join(", ")}. Essas matérias estão abaixo de 80%. Tente resolver pelo menos 20 questões de cada por dia até subir o percentual.`:`Todas as matérias estão acima de 80% — excelente! Mantenha a cadência de questões diárias para não deixar cair.`;
      } else if(msg.includes("treino")||msg.includes("exerc")){
        reply=daysSince!==null&&daysSince>=3?`Faz ${daysSince} dias sem treinar. Que tal começar com um treino leve hoje? Consistência é mais importante que intensidade.`:`Seus treinos estão em dia! Você já realizou ${c.stats?.totalWorkouts||0} treinos no total. Continue mantendo a frequência.`;
      } else if(msg.includes("financ")||msg.includes("dinheiro")){
        const sal=c.finance?.salary||0;
        const tot=(c.finance?.expenses||[]).reduce((a,e)=>a+e.amount,0);
        const livre=sal-tot;
        reply=`Salário: R$ ${sal.toFixed(2)} · Comprometido: R$ ${tot.toFixed(2)} · Livre: R$ ${livre.toFixed(2)}. ${livre<0?"Atenção: seus gastos superam o salário! Revise as despesas.":livre<sal*0.2?"Reserve mais: o ideal é ter ao menos 20% do salário livre.":"Boa saúde financeira! Considere investir parte do valor livre."}`;
      } else {
        // Generic motivational analysis
        let r=`📊 **${c.username||"Guerreiro"}**, aqui está sua análise:\n\n`;
        r+=`🔥 Streak: ${streak} dias${streak>=7?" — você está em chamas!":""}\n`;
        r+=`📚 ${c.stats?.totalStudyHours||0}h de estudo registradas\n`;
        r+=`💪 ${c.stats?.totalWorkouts||0} treinos completados\n`;
        if(weakSubs.length>0) r+=`⚠️ Foque em: ${weakSubs.map(s=>s.name).join(", ")}\n`;
        r+=`\n🎯 Dica: ${streak===0?"Comece hoje — o primeiro passo é o mais importante.":streak<7?"Cada dia conta. Mantenha os hábitos principais.":"Você está construindo algo real. Continue!"}`;
        reply=r;
      }
      const updated=[...newChat,{role:"assistant",content:reply}];
      mentorChatRef.current=updated;
      setMentorChat(updated);
      setTimeout(()=>mentorEndRef.current?.scrollIntoView({behavior:"smooth"}),100);
    }
    setMentorLoading(false);
  };

  const openMentor=()=>{
    setMentorOpen(true);
    if(mentorChatRef.current.length===0){
      sendMentorMessage("Analise meu progresso atual e me dê seus 3 principais conselhos para esta semana.");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if(loading) return(
    <div style={{background:"#07070f",height:"100vh",width:"100vw",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');`}</style>
      <div style={{fontSize:48}}>⚔️</div>
      <div style={{color:"#f0c040",fontFamily:"Cinzel,serif",fontSize:13,letterSpacing:4}}>YOUR ROUTINE</div>
    </div>
  );

  // Safety guard — should never happen but prevents blank screen
  if(!char) return(
    <div style={{background:"#07070f",height:"100vh",width:"100vw",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');`}</style>
      <div style={{fontSize:48}}>⚔️</div>
      <div style={{color:"#f0c040",fontFamily:"Cinzel,serif",fontSize:13,letterSpacing:4}}>Carregando...</div>
    </div>
  );

  // ── ONBOARDING SCREEN ──
  if(firstAccess) return(
    <div style={{background:"#07070f",height:"100vh",width:"100vw",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}html,body,#root{height:100%;width:100%}.inp{background:#0f0f1e;border:1px solid #2a2848;border-radius:8px;color:#e8dfc0;font-family:Crimson Text,serif;font-size:15px;padding:10px 14px;width:100%;outline:none}.inp:focus{border-color:#f0c04066}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}>
        <div style={{animation:"fadeIn 0.5s ease",width:"100%",maxWidth:400,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:8}}>⚔️</div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:18,fontWeight:900,color:"#f0c040",letterSpacing:3,marginBottom:4}}>YOUR ROUTINE</div>
            <div style={{fontSize:12,color:"#555",fontFamily:"Cinzel,serif",letterSpacing:1}}>Sua jornada começa aqui</div>
          </div>

          {/* Gender selection */}
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:8}}>GÊNERO DO PERSONAGEM</div>
            <div style={{display:"flex",gap:8}}>
              {[{id:"m",l:"♂ Masculino"},{id:"f",l:"♀ Feminino"}].map(g=>(
                <button key={g.id} onClick={()=>setOnboardAvatar(a=>({...a,gender:g.id,hairStyle:g.id==="m"?"short":"long"}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${onboardAvatar.gender===g.id?"#f0c040":"#2a2848"}`,background:onboardAvatar.gender===g.id?"#1a1400":"#0f0f1e",color:onboardAvatar.gender===g.id?"#f0c040":"#555",fontFamily:"Cinzel,serif",fontSize:11,cursor:"pointer"}}>
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar preview */}
          <div style={{textAlign:"center",marginBottom:16}}>
            <AvatarSVG {...onboardAvatar} size={90}/>
          </div>

          {/* Name */}
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:6}}>
              {onboardAvatar.gender==="f"?"SEU NOME DE GUERREIRA":"SEU NOME DE GUERREIRO"}
            </div>
            <input className="inp" value={onboardName} onChange={e=>setOnboardName(e.target.value)} placeholder="Como quer ser chamado?" style={{fontSize:16,padding:"12px 14px",textAlign:"center"}}/>
          </div>

          {/* Avatar customization */}
          <div style={{background:"#0f0f1e",border:"1px solid #1a1838",borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:10}}>PERSONALIZAR AVATAR</div>

            <div style={{fontSize:9,color:"#444",marginBottom:4}}>Expressão</div>
            <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>{AVATAR_EXPRESSIONS.map(e=><button key={e.id} onClick={()=>setOnboardAvatar(a=>({...a,expression:e.id}))} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",opacity:onboardAvatar.expression===e.id?1:0.3}}>{e.l}</button>)}</div>

            <div style={{fontSize:9,color:"#444",marginBottom:4}}>Tom de pele</div>
            <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>{AVATAR_SKINS.map((s,i)=><button key={i} onClick={()=>setOnboardAvatar(a=>({...a,skin:i}))} style={{width:26,height:26,borderRadius:"50%",background:s,border:`3px solid ${onboardAvatar.skin===i?"#f0c040":"transparent"}`,cursor:"pointer"}}/>)}</div>

            <div style={{fontSize:9,color:"#444",marginBottom:4}}>Cor do cabelo</div>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",justifyContent:"center"}}>{AVATAR_HAIRS.map((h,i)=><button key={i} onClick={()=>setOnboardAvatar(a=>({...a,hair:i}))} style={{width:22,height:22,borderRadius:"50%",background:h,border:`3px solid ${onboardAvatar.hair===i?"#f0c040":"transparent"}`,cursor:"pointer"}}/>)}</div>

            <div style={{fontSize:9,color:"#444",marginBottom:4}}>Estilo do cabelo</div>
            <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",justifyContent:"center"}}>
              {(onboardAvatar.gender==="f"?AVATAR_HAIR_STYLES_F:AVATAR_HAIR_STYLES_M).map(s=>(
                <button key={s.id} onClick={()=>setOnboardAvatar(a=>({...a,hairStyle:s.id}))} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${onboardAvatar.hairStyle===s.id?"#f0c04066":"#2a2848"}`,background:onboardAvatar.hairStyle===s.id?"#1a1400":"transparent",color:onboardAvatar.hairStyle===s.id?"#f0c040":"#555",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer"}}>{s.l}</button>
              ))}
            </div>

            <div style={{fontSize:9,color:"#444",marginBottom:4}}>Acessório</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
              {AVATAR_ACCESSORIES.map(a=>(
                <button key={a.id} onClick={()=>setOnboardAvatar(av=>({...av,accessory:a.id}))} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${onboardAvatar.accessory===a.id?"#a78bfa66":"#2a2848"}`,background:onboardAvatar.accessory===a.id?"#1a1535":"transparent",color:onboardAvatar.accessory===a.id?"#a78bfa":"#555",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer"}}>{a.l}</button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div style={{background:"#0f0f1e",border:"1px solid #1a1838",borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:10}}>ESCOLHA SEUS MÓDULOS</div>
            <div style={{fontSize:10,color:"#444",marginBottom:10}}>Selecione as funcionalidades que quer usar. Pode mudar depois.</div>
            {ALL_MODULES.map(m=>{
              const on=onboardModules.includes(m.id);
              return(
                <button key={m.id} onClick={()=>setOnboardModules(prev=>prev.includes(m.id)?prev.filter(x=>x!==m.id):[...prev,m.id])} style={{width:"100%",background:on?`${m.color}18`:"transparent",border:`1px solid ${on?m.color+"55":"#2a2848"}`,borderRadius:9,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${on?m.color:"#2a2848"}`,background:on?m.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {on&&<span style={{color:m.color,fontSize:11,fontWeight:900}}>✓</span>}
                  </div>
                  <span style={{fontSize:18}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:on?"#e8dfc0":"#666",fontFamily:"Cinzel,serif"}}>{m.label}</div>
                    <div style={{fontSize:10,color:"#444"}}>{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Start button */}
          <button onClick={finishOnboarding} disabled={!onboardName.trim()||onboardModules.length===0} style={{width:"100%",padding:"14px",borderRadius:12,background:onboardName.trim()&&onboardModules.length>0?"linear-gradient(135deg,#f0c040,#d4a017)":"#1a1838",border:"none",color:onboardName.trim()?"#000":"#333",fontFamily:"Cinzel,serif",fontSize:14,fontWeight:700,letterSpacing:2,cursor:onboardName.trim()?"pointer":"not-allowed",marginBottom:14,transition:"all 0.2s"}}>
            ⚔️ {onboardAvatar.gender==="f"?"INICIAR SUA JORNADA":"INICIAR SUA JORNADA"}
          </button>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:"#1a1838"}}/>
            <span style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#333",letterSpacing:2}}>OU</span>
            <div style={{flex:1,height:1,background:"#1a1838"}}/>
          </div>
          <input ref={importRef} type="file" accept=".json" onChange={importData} style={{display:"none"}}/>
          <button onClick={()=>importRef.current?.click()} style={{width:"100%",padding:"12px",borderRadius:12,background:"transparent",border:"1px solid #22c55e44",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:12,letterSpacing:2,cursor:"pointer"}}>
            📥 RESTAURAR BACKUP
          </button>
          <div style={{textAlign:"center",fontSize:10,color:"#333",marginTop:8,fontFamily:"Cinzel,serif"}}>Já tem uma conta? Importe seu arquivo .json</div>
        </div>
      </div>
    </div>
  );
          {/* Header */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:52,marginBottom:10}}>⚔️</div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:20,fontWeight:900,color:"#f0c040",letterSpacing:3,marginBottom:6}}>RPG DA VIDA REAL</div>
            <div style={{fontSize:13,color:"#555",fontFamily:"Cinzel,serif",letterSpacing:1}}>Sua jornada começa aqui</div>
          </div>

          {/* Avatar preview */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <AvatarSVG {...onboardAvatar} size={80}/>
          </div>

          {/* Name input */}
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:6}}>SEU NOME DE GUERREIRO</div>
            <input className="inp" value={onboardName} onChange={e=>setOnboardName(e.target.value)} placeholder="Como quer ser chamado?" style={{fontSize:16,padding:"12px 14px",textAlign:"center"}} autoFocus/>
          </div>

          {/* Avatar customization */}
          <div style={{background:"#0f0f1e",border:"1px solid #1a1838",borderRadius:12,padding:"14px",marginBottom:14}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#555",letterSpacing:3,marginBottom:10}}>PERSONALIZAR AVATAR</div>
            <div style={{fontSize:9,color:"#444",marginBottom:5}}>Expressão</div>
            <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>{AVATAR_EXPRESSIONS.map(e=><button key={e.id} onClick={()=>setOnboardAvatar(a=>({...a,expression:e.id}))} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",opacity:onboardAvatar.expression===e.id?1:0.3}}>{e.l}</button>)}</div>
            <div style={{fontSize:9,color:"#444",marginBottom:5}}>Tom de pele</div>
            <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>{AVATAR_SKINS.map((s,i)=><button key={i} onClick={()=>setOnboardAvatar(a=>({...a,skin:i}))} style={{width:26,height:26,borderRadius:"50%",background:s,border:`3px solid ${onboardAvatar.skin===i?"#f0c040":"transparent"}`,cursor:"pointer"}}/>)}</div>
            <div style={{fontSize:9,color:"#444",marginBottom:5}}>Cabelo</div>
            <div style={{display:"flex",gap:8,marginBottom:6,justifyContent:"center"}}>{AVATAR_HAIRS.map((h,i)=><button key={i} onClick={()=>setOnboardAvatar(a=>({...a,hair:i}))} style={{width:22,height:22,borderRadius:"50%",background:h,border:`3px solid ${onboardAvatar.hair===i?"#f0c040":"transparent"}`,cursor:"pointer"}}/>)}</div>
            <div style={{display:"flex",gap:6,justifyContent:"center"}}>{AVATAR_HAIR_STYLES.map(s=><button key={s.id} onClick={()=>setOnboardAvatar(a=>({...a,hairStyle:s.id}))} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${onboardAvatar.hairStyle===s.id?"#f0c04066":"#2a2848"}`,background:onboardAvatar.hairStyle===s.id?"#1a1400":"transparent",color:onboardAvatar.hairStyle===s.id?"#f0c040":"#555",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer"}}>{s.l}</button>)}</div>
          </div>

  const {cur,nxt}=getLvl(char.totalXP);
  const xpInLvl=char.totalXP-cur.xp,xpNeeded=nxt?nxt.xp-cur.xp:1;
  const lvlPct=Math.min(100,(xpInLvl/xpNeeded)*100);
  const streak=char.streak?.current||0;
  const multi=streakMulti(streak);
  const dynTitle=getDynTitle(char.stats,cur.lv);
  const ac=char.concursos?.find(c=>c.id===char.activeConcurso)||char.concursos?.[0];
  const boss=BOSS_POOL[char.boss?.type||0];
  const bGls=boss.goals;
  const bPcts={studyMin:bGls.studyMin?Math.min(100,((char.boss?.studyMin||0)/bGls.studyMin)*100):null,trainCount:bGls.trainCount?Math.min(100,((char.boss?.trainCount||0)/bGls.trainCount)*100):null,questions:bGls.questions?Math.min(100,((char.boss?.questions||0)/bGls.questions)*100):null,runKm:bGls.runKm?Math.min(100,((char.boss?.runKm||0)/bGls.runKm)*100):null};
  const bossComplete=Object.entries(bGls).every(([k])=>bPcts[k]>=100);
  const weakSubs=(ac?.subjects||[]).filter(s=>{const d=(ac.questions||{})[s.id];return d&&d.total>=10&&(d.correct/d.total)<0.80;});
  const salary=char.finance?.salary||0;
  const expenses=char.finance?.expenses||[];
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const paidExp=expenses.filter(e=>e.paid).reduce((a,e)=>a+e.amount,0);
  const unpaidExp=expenses.filter(e=>!e.paid).reduce((a,e)=>a+e.amount,0);
  const remaining=salary-totalExp; // total comprometido
  const availableNow=salary-paidExp; // disponível agora (descontando só o que já pagou)
  const weight=parseFloat(char.body?.weight||0);
  const height=parseFloat(char.body?.height||0)/100;
  const bmi=weight&&height?+(weight/(height*height)).toFixed(1):null;
  const bmiC=bmi?bmiCat(bmi):null;
  const plans=getPlans();
  const todayXP=(()=>{let x=QUESTS.filter(q=>quests[q.id]).reduce((s,q)=>s+q.xp,0)+PENALTIES.filter(p=>pens[p.id]).reduce((s,p)=>s+p.xp,0);if(QUESTS.filter(q=>q.core).every(q=>quests[q.id]))x+=20;return x;})();
  const readingBooks=char.books?.reading||[];
  const previewMins=studyStart&&studyEnd?minutesDiff(studyStart,studyEnd):null;
  const todayMood=(char.moodLog||[]).find(m=>m.date===todayStr());
  const unlockedCount=(char.unlockedAch||[]).length;
  const habitsToday=(char.habits||[]).filter(h=>!!h.log?.[todayStr()]).length;
  const totalHabits=(char.habits||[]).length;

  // XP history chart data (last 7 days)
  const last7=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const entry=(char.xpHistory||[]).find(h=>h.date===ds);last7.push({l:["D","S","T","Q","Q","S","S"][(d.getDay())],v:entry?.xp||0});}

  // Study hours per subject chart
  const subjectChartData=(ac?.subjects||[]).slice(0,6).map(s=>({l:s.name.slice(0,3),v:Math.round(((ac.subjectMin||{})[s.id]||0)/60*10)/10,color:s.color}));

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{height:100%;width:100%}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#2a2848}
    @keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-80px) scale(1.3)}}
    @keyframes lvlUp{0%,100%{opacity:0;transform:scale(0.8)}15%,85%{opacity:1;transform:scale(1)}}
    @keyframes pulse{0%,100%{box-shadow:0 0 6px #f0c04033}50%{box-shadow:0 0 22px #f0c04077}}
    @keyframes gpulse{0%,100%{box-shadow:0 0 6px #22c55e33}50%{box-shadow:0 0 22px #22c55e77}}
    @keyframes rpulse{0%,100%{box-shadow:0 0 6px #ef444433}50%{box-shadow:0 0 20px #ef444488}}
    @keyframes apulse{0%,100%{box-shadow:0 0 8px #f0c04066}50%{box-shadow:0 0 30px #f0c040cc}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
    .btn{background:none;border:none;cursor:pointer;text-align:left;width:100%;padding:0}.btn:active{transform:scale(0.97)}
    .tbtn{background:none;border:none;cursor:pointer}.tbtn:active{transform:scale(0.93)}
    .inp{background:#0f0f1e;border:1px solid #2a2848;border-radius:8px;color:#e8dfc0;font-family:Crimson Text,serif;font-size:14px;padding:9px 12px;width:100%;outline:none}
    .inp:focus{border-color:#f0c04066}
    select.inp{cursor:pointer}
    .sbtn{background:none;border:none;cursor:pointer;font-family:Cinzel,serif;letter-spacing:1px;border-radius:9px;padding:10px 0;width:100%;font-size:11px}.sbtn:active{transform:scale(0.96)}
  `;

  return(
    <div style={{background:"#07070f",height:"100vh",width:"100vw",fontFamily:"Crimson Text,Georgia,serif",color:"#e8dfc0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{css}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:-60,left:-60,width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,#1a0a3a44,transparent 70%)"}}/>
      </div>

      {/* Floats */}
      <div style={{position:"fixed",top:108,left:"50%",transform:"translateX(-50%)",zIndex:300,pointerEvents:"none",textAlign:"center",minWidth:100}}>
        {floats.map(f=><div key={f.id} style={{animation:"floatUp 2.5s ease-out forwards",fontFamily:"Cinzel,serif",fontWeight:900,fontSize:22,color:f.xp>=0?"#f0c040":"#ef4444",textShadow:`0 0 14px ${f.xp>=0?"#f0c04099":"#ef444499"}`}}>{f.xp>=0?`+${f.xp}`:f.xp} XP</div>)}
      </div>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:400,animation:"fadeIn 0.3s ease",background:"#111122ee",border:`1px solid ${toast.color}55`,borderRadius:12,padding:"10px 20px",fontSize:12,color:toast.color,fontFamily:"Cinzel,serif",letterSpacing:1,whiteSpace:"nowrap",pointerEvents:"none"}}>{toast.msg}</div>}

      {/* Level Up */}
      {lvlUpMsg&&<div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000099",pointerEvents:"none"}}><div style={{animation:"lvlUp 3.5s ease-in-out forwards",background:"linear-gradient(135deg,#1a0d00,#2a1800)",border:`2px solid ${lvlUpMsg.color}`,borderRadius:22,padding:"28px 48px",textAlign:"center",boxShadow:`0 0 80px ${lvlUpMsg.color}55`}}><div style={{fontSize:48}}>⬆️</div><div style={{fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:5,color:"#888",margin:"8px 0 4px"}}>LEVEL UP</div><div style={{fontFamily:"Cinzel,serif",fontSize:34,fontWeight:900,color:lvlUpMsg.color}}>{lvlUpMsg.lv}</div><div style={{fontFamily:"Cinzel,serif",fontSize:14,color:"#e8dfc0",marginTop:6}}>{lvlUpMsg.title}</div></div></div>}

      {/* Achievement popup */}
      {achPopup&&<div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:450,animation:"slideUp 0.4s ease",background:"linear-gradient(135deg,#1a1000,#2a1e00)",border:"2px solid #f0c04077",borderRadius:16,padding:"14px 20px",textAlign:"center",boxShadow:"0 0 40px #f0c04044",pointerEvents:"none",minWidth:220}}>
        <div style={{fontSize:28,marginBottom:4}}>{achPopup.icon}</div>
        <div style={{fontFamily:"Cinzel,serif",fontSize:8,letterSpacing:3,color:"#f0c04099",marginBottom:2}}>CONQUISTA DESBLOQUEADA</div>
        <div style={{fontFamily:"Cinzel,serif",fontSize:14,color:"#f0c040",fontWeight:700}}>{achPopup.name}</div>
        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{achPopup.desc}</div>
        <div style={{fontFamily:"Cinzel,serif",fontSize:11,color:"#f0c040",marginTop:4}}>+{achPopup.xp} XP</div>
      </div>}

      {/* ── J.A.R.V.I.S FLOATING BUTTON ── */}
      {!mentorOpen&&<button onClick={openMentor} style={{position:"fixed",bottom:76,right:14,zIndex:200,width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"2px solid #a78bfa77",boxShadow:"0 4px 20px #a78bfa55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",animation:"apulse 3s infinite",fontFamily:"Cinzel,serif",color:"#fff",fontWeight:900,letterSpacing:0}}>
        J
      </button>}

      {/* ── J.A.R.V.I.S CHAT PANEL ── */}
      {mentorOpen&&<div style={{position:"fixed",inset:0,zIndex:250,display:"flex",flexDirection:"column",background:"#07070fee"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#1a0d2e,#0d0820)",borderBottom:"1px solid #a78bfa33",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,fontFamily:"Cinzel,serif",color:"#fff",fontWeight:900,letterSpacing:1}}>J</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#a78bfa",fontWeight:700,letterSpacing:2}}>J.A.R.V.I.S</div>
            <div style={{fontSize:10,color:"#555"}}>Seu assistente de produtividade pessoal</div>
          </div>
          <button onClick={()=>setMentorOpen(false)} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer",padding:"4px"}}>✕</button>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:12}}>
          {mentorChat.length===0&&mentorLoading&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontFamily:"Cinzel,serif",color:"#fff",fontWeight:900}}>J</div>
              <div style={{background:"#1a1535",border:"1px solid #a78bfa33",borderRadius:"4px 12px 12px 12px",padding:"10px 14px",maxWidth:"85%"}}>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#a78bfa",animation:`blink 1.2s ${i*0.2}s infinite`}}/>)}
                </div>
              </div>
            </div>
          )}
          {mentorChat.map((msg,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:msg.role==="user"?"row-reverse":"row"}}>
              {msg.role==="assistant"&&<div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontFamily:"Cinzel,serif",color:"#fff",fontWeight:900}}>J</div>}
              <div style={{background:msg.role==="user"?"linear-gradient(135deg,#1a1535,#221c42)":"#1a1535",border:`1px solid ${msg.role==="user"?"#a78bfa44":"#a78bfa22"}`,borderRadius:msg.role==="user"?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"10px 14px",maxWidth:"85%",fontSize:13,color:"#e8dfc0",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                {msg.content}
              </div>
            </div>
          ))}
          {mentorLoading&&mentorChat.length>0&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontFamily:"Cinzel,serif",color:"#fff",fontWeight:900}}>J</div>
              <div style={{background:"#1a1535",border:"1px solid #a78bfa22",borderRadius:"4px 12px 12px 12px",padding:"10px 14px"}}>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#a78bfa",animation:`blink 1.2s ${i*0.2}s infinite`}}/>)}
                </div>
              </div>
            </div>
          )}
          <div ref={mentorEndRef}/>
        </div>

        {/* Quick suggestions */}
        {mentorChat.length>0&&!mentorLoading&&<div style={{padding:"0 14px 8px",display:"flex",gap:6,overflowX:"auto"}}>
          {["Como melhorar meu streak?","Qual matéria devo focar?","Análise financeira","Dicas de treino"].map(s=>(
            <button key={s} onClick={()=>sendMentorMessage(s)} style={{background:"#1a1535",border:"1px solid #a78bfa33",borderRadius:20,padding:"6px 12px",color:"#a78bfa",fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              {s}
            </button>
          ))}
        </div>}

        {/* Input */}
        <div style={{padding:"10px 14px 16px",borderTop:"1px solid #1a1838",display:"flex",gap:8,flexShrink:0,background:"#0d0820"}}>
          <input
            className="inp"
            value={mentorInput}
            onChange={e=>setMentorInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMentorMessage(mentorInput)}
            placeholder="Pergunte ao seu mentor..."
            style={{flex:1,fontSize:13}}
          />
          <button onClick={()=>sendMentorMessage(mentorInput)} disabled={mentorLoading||!mentorInput.trim()} style={{width:42,height:42,borderRadius:10,background:mentorInput.trim()&&!mentorLoading?"linear-gradient(135deg,#a78bfa,#7c3aed)":"#1a1535",border:"none",color:"#fff",fontSize:18,cursor:mentorInput.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {mentorLoading?"⏳":"➤"}
          </button>
        </div>
      </div>}

      {/* ── FRIENDS PANEL ── */}
      {friendsOpen&&<div style={{position:"fixed",inset:0,zIndex:250,display:"flex",flexDirection:"column",background:"#07070fee"}}>
        <div style={{background:"linear-gradient(135deg,#1a0d2e,#0d0820)",borderBottom:"1px solid #a78bfa33",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#ec4899,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👥</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#ec4899",fontWeight:700,letterSpacing:2}}>AMIGOS</div>
            <div style={{fontSize:10,color:"#555"}}>Seu código: <span style={{color:"#f0c040",fontFamily:"Cinzel,serif"}}>{char.firebaseUid}</span></div>
          </div>
          <button onClick={()=>setFriendsOpen(false)} style={{background:"none",border:"none",color:"#555",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
          <STabs tabs={[{id:"lista",i:"👥",l:"Amigos",c:"#ec4899"},{id:"buscar",i:"🔍",l:"Buscar",c:"#60a5fa"},{id:"pedidos",i:"📩",l:"Pedidos",c:"#f0c040"}]} val={friendsTab} onChange={setFriendsTab}/>

          {friendsTab==="buscar"&&<>
            <Card style={{marginBottom:12}}>
              <Lbl>BUSCAR POR NOME DE USUÁRIO</Lbl>
              <div style={{display:"flex",gap:6}}>
                <input className="inp" value={searchUser} onChange={e=>setSearchUser(e.target.value)} placeholder="Nome exato do usuário..." style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&handleSearchUser()}/>
                <button onClick={handleSearchUser} style={{padding:"9px 14px",borderRadius:8,background:"#1a1535",border:"1px solid #60a5fa55",color:"#60a5fa",fontFamily:"Cinzel,serif",fontSize:10,cursor:"pointer",flexShrink:0}}>{searchLoading?"...":"🔍"}</button>
              </div>
            </Card>
            {searchResult&&(searchResult.notFound?(
              <div style={{textAlign:"center",color:"#555",fontSize:12,padding:"20px 0"}}>Usuário não encontrado</div>
            ):(
              <Card glow="#ec4899">
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <AvatarSVG {...(searchResult.avatar||{})} size={50}/>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:14,color:"#f0c040"}}>{searchResult.username}</div>
                    <div style={{fontSize:11,color:"#555"}}>Lv.{searchResult.level||1} · {searchResult.streak||0}🔥 · {(searchResult.unlockedAch||[]).length} conquistas</div>
                  </div>
                  {(char.friends||[]).includes(searchResult.uid)?(
                    <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#22c55e"}}>✓ AMIGO</div>
                  ):(
                    <button onClick={()=>handleSendRequest(searchResult.uid)} style={{padding:"8px 12px",borderRadius:8,background:"linear-gradient(135deg,#ec4899,#a855f7)",border:"none",color:"#fff",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer"}}>+ ADICIONAR</button>
                  )}
                </div>
              </Card>
            ))}
          </>}

          {friendsTab==="pedidos"&&<>
            {(char.friendRequests||[]).length===0?(
              <div style={{textAlign:"center",color:"#555",fontSize:12,padding:"30px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>📩</div>
                <div>Nenhum pedido pendente</div>
              </div>
            ):(char.friendRequests||[]).map(fid=>{
              const fp=friendProfiles[fid];
              return(
                <Card key={fid} glow="#f0c04033" style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {fp?<AvatarSVG {...(fp.avatar||{})} size={42}/>:<div style={{width:42,height:42,borderRadius:"50%",background:"#1a1535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👤</div>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:"#e8dfc0"}}>{fp?.username||fid}</div>
                      <div style={{fontSize:10,color:"#555"}}>Quer ser seu amigo</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>handleAcceptFriend(fid)} style={{padding:"7px 11px",borderRadius:7,background:"#22c55e22",border:"1px solid #22c55e55",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer"}}>✓</button>
                      <button onClick={()=>handleDeclineFriend(fid)} style={{padding:"7px 11px",borderRadius:7,background:"#ef444422",border:"1px solid #ef444455",color:"#ef4444",fontSize:12,cursor:"pointer"}}>✕</button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>}

          {friendsTab==="lista"&&<>
            {(char.friends||[]).length===0?(
              <div style={{textAlign:"center",color:"#555",fontSize:12,padding:"30px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>👥</div>
                <div>Nenhum amigo ainda</div>
                <div style={{fontSize:10,marginTop:4,color:"#333"}}>Busque pelo nome de usuário</div>
              </div>
            ):(char.friends||[]).map(fid=>{
              const fp=friendProfiles[fid];
              if(!fp) return null;
              const friendAchs=(fp.unlockedAch||[]).map(id=>ACHIEVEMENTS.find(a=>a.id===id)).filter(Boolean);
              return(
                <Card key={fid} glow="#ec489933" style={{marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <AvatarSVG {...(fp.avatar||{})} size={50}/>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"Cinzel,serif",fontSize:14,color:"#f0c040"}}>{fp.username}</div>
                      <div style={{fontSize:11,color:"#555"}}>Lv.{fp.level||1} · {fp.streak||0}🔥 dias</div>
                      <div style={{fontSize:10,color:"#a78bfa"}}>{fp.totalXP||0} XP total</div>
                    </div>
                    <button onClick={()=>handleRemoveFriend(fid)} style={{color:"#333",background:"none",border:"none",fontSize:14,cursor:"pointer"}}>🗑</button>
                  </div>
                  {friendAchs.length>0&&<>
                    <Lbl mb={6} color="#f0c040">CONQUISTAS ({friendAchs.length})</Lbl>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {friendAchs.slice(0,10).map(a=>(
                        <div key={a.id} title={a.name} style={{background:"#1a1400",border:"1px solid #f0c04033",borderRadius:7,padding:"4px 8px",display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:14}}>{a.icon}</span>
                          <span style={{fontFamily:"Cinzel,serif",fontSize:8,color:"#f0c040"}}>{a.name}</span>
                        </div>
                      ))}
                      {friendAchs.length>10&&<div style={{fontSize:10,color:"#555",alignSelf:"center"}}>+{friendAchs.length-10}</div>}
                    </div>
                  </>}
                </Card>
              );
            })}
          </>}
        </div>
      </div>}

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,#0d0820,#08080f)",borderBottom:"1px solid #1a1838",padding:"11px 14px 8px",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div onClick={()=>setShowAvatarEditor(v=>!v)} style={{cursor:"pointer",flexShrink:0}}><AvatarSVG {...(char.avatar||{})} size={42}/></div>
            <div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:15,fontWeight:900,color:"#f0c040",letterSpacing:2,lineHeight:1}}>{char.username||"Jogador"}</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                <span style={{fontSize:9,color:"#a78bfa",fontFamily:"Cinzel,serif"}}>{dynTitle.icon} {dynTitle.title}</span>
                {streak>0&&<span style={{fontSize:8,color:"#f97316",background:"#f9731622",border:"1px solid #f9731644",borderRadius:5,padding:"1px 5px",fontFamily:"Cinzel,serif"}}>🔥{streak}d{multi>1?` ×${multi.toFixed(2)}`:""}</span>}
                {todayMood&&<span style={{fontSize:12}}>{MOODS.find(m=>m.id===todayMood.mood)?.icon}</span>}
              </div>
            </div>
          </div>
          <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <div style={{fontFamily:"Cinzel,serif",fontSize:22,fontWeight:900,color:cur.color,lineHeight:1}}>Lv.{cur.lv}</div>
            <button onClick={()=>setFriendsOpen(true)} style={{position:"relative",background:"#1a1535",border:"1px solid #ec489955",borderRadius:8,padding:"3px 8px",color:"#ec4899",fontFamily:"Cinzel,serif",fontSize:9,cursor:"pointer",letterSpacing:1}}>
              👥 {(char.friends||[]).length}
              {(char.friendRequests||[]).length>0&&<span style={{position:"absolute",top:-4,right:-4,width:12,height:12,borderRadius:"50%",background:"#f0c040",fontSize:7,color:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Cinzel,serif",fontWeight:900}}>{(char.friendRequests||[]).length}</span>}
            </button>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
          <span style={{fontSize:8,color:"#444",fontFamily:"Cinzel,serif"}}>XP</span>
          <span style={{fontSize:8,color:"#f0c040",fontFamily:"Cinzel,serif"}}>{char.totalXP.toLocaleString()}{nxt?` / ${nxt.xp.toLocaleString()}`:""}</span>
        </div>
        <div style={{height:5,background:"#141228",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${lvlPct}%`,background:`linear-gradient(90deg,${cur.color}77,${cur.color})`,borderRadius:3,transition:"width 0.6s",boxShadow:`0 0 8px ${cur.color}66`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
          <span style={{fontSize:7,color:"#333"}}>{nxt?`${Math.round(lvlPct)}% → ${nxt.title}`:"NÍVEL MÁXIMO"}</span>
          <span style={{fontSize:7,color:todayXP>=0?"#34d399":"#ef4444"}}>Hoje {todayXP>0?"+":""}{todayXP} XP</span>
        </div>
        {weakSubs.length>0&&<div style={{marginTop:5,background:"#1a080844",border:"1px solid #ef444455",borderRadius:7,padding:"3px 10px",display:"flex",alignItems:"center",gap:6,animation:"rpulse 2.5s infinite"}}><span style={{fontSize:10}}>⚠️</span><span style={{fontSize:8,color:"#ef9999",fontFamily:"Cinzel,serif"}}>{weakSubs.map(s=>s.name.split(" ")[0]).join(", ")} abaixo de 80%</span></div>}
      </div>

      {/* Avatar editor */}
      {showAvatarEditor&&(
        <div style={{background:"#0d0820",border:"1px solid #1a1838",padding:"11px 14px",position:"sticky",top:0,zIndex:99,animation:"fadeIn 0.2s ease",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <Lbl mb={0}>EDITAR AVATAR</Lbl>
            <button className="tbtn" onClick={()=>setShowAvatarEditor(false)} style={{color:"#555",fontSize:16}}>✕</button>
          </div>
          <div style={{display:"flex",gap:12}}>
            <AvatarSVG {...(char.avatar||{})} size={62}/>
            <div style={{flex:1,overflowY:"auto"}}>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Gênero</div>
              <div style={{display:"flex",gap:5,marginBottom:7}}>
                {[{id:"m",l:"♂"},{id:"f",l:"♀"}].map(g=><button key={g.id} className="tbtn" onClick={()=>saveAvatar({gender:g.id,hairStyle:g.id==="m"?"short":"long"})} style={{flex:1,padding:"5px",borderRadius:7,border:`1px solid ${(char.avatar?.gender||"m")===g.id?"#f0c04066":"#2a2848"}`,background:(char.avatar?.gender||"m")===g.id?"#1a1400":"transparent",color:(char.avatar?.gender||"m")===g.id?"#f0c040":"#555",fontFamily:"Cinzel,serif",fontSize:11}}>{g.l}</button>)}
              </div>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Expressão</div>
              <div style={{display:"flex",gap:5,marginBottom:7}}>{AVATAR_EXPRESSIONS.map(e=><button key={e.id} className="tbtn" onClick={()=>saveAvatar({expression:e.id})} style={{fontSize:17,opacity:(char.avatar?.expression||"happy")===e.id?1:0.3}}>{e.l}</button>)}</div>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Cabelo</div>
              <div style={{display:"flex",gap:4,marginBottom:7,flexWrap:"wrap"}}>
                {((char.avatar?.gender||"m")==="f"?AVATAR_HAIR_STYLES_F:AVATAR_HAIR_STYLES_M).map(s=><button key={s.id} className="tbtn" onClick={()=>saveAvatar({hairStyle:s.id})} style={{fontSize:8,fontFamily:"Cinzel,serif",color:(char.avatar?.hairStyle||"short")===s.id?"#f0c040":"#444",background:(char.avatar?.hairStyle||"short")===s.id?"#1a1400":"transparent",border:`1px solid ${(char.avatar?.hairStyle||"short")===s.id?"#f0c04055":"#2a2848"}`,borderRadius:5,padding:"2px 5px"}}>{s.l}</button>)}
              </div>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Acessório</div>
              <div style={{display:"flex",gap:4,marginBottom:7,flexWrap:"wrap"}}>
                {AVATAR_ACCESSORIES.map(a=><button key={a.id} className="tbtn" onClick={()=>saveAvatar({accessory:a.id})} style={{fontSize:8,fontFamily:"Cinzel,serif",color:(char.avatar?.accessory||"none")===a.id?"#a78bfa":"#444",background:(char.avatar?.accessory||"none")===a.id?"#1a1535":"transparent",border:`1px solid ${(char.avatar?.accessory||"none")===a.id?"#a78bfa55":"#2a2848"}`,borderRadius:5,padding:"2px 5px"}}>{a.l}</button>)}
              </div>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Tom de pele</div>
              <div style={{display:"flex",gap:5,marginBottom:7}}>{AVATAR_SKINS.map((s,i)=><button key={i} className="tbtn" onClick={()=>saveAvatar({skin:i})} style={{width:18,height:18,borderRadius:"50%",background:s,border:`2px solid ${(char.avatar?.skin||0)===i?"#f0c040":"transparent"}`,flexShrink:0}}/>)}</div>
              <div style={{fontSize:9,color:"#666",marginBottom:3}}>Cor do cabelo</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{AVATAR_HAIRS.map((h,i)=><button key={i} className="tbtn" onClick={()=>saveAvatar({hair:i})} style={{width:18,height:18,borderRadius:"50%",background:h,border:`2px solid ${(char.avatar?.hair||0)===i?"#f0c040":"transparent"}`,flexShrink:0}}/>)}</div>
            </div>
          </div>
        </div>
      )}
      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:68,position:"relative",zIndex:10}}>

        {/* ── HOME ── */}
        {tab==="home"&&<div style={{padding:"12px 12px 0"}}>
          {/* Mood check-in */}
          <Card glow="#a78bfa33" style={{marginBottom:10}}>
            <Lbl mb={6}>COMO ESTÁ HOJE?</Lbl>
            <div style={{display:"flex",gap:6,justifyContent:"space-between"}}>
              {MOODS.map(m=>(
                <button key={m.id} className="tbtn" onClick={()=>logMood(m.id)} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${todayMood?.mood===m.id?m.color:m.color+"33"}`,background:todayMood?.mood===m.id?m.color+"22":"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:18}}>{m.icon}</span>
                  <span style={{fontSize:7,fontFamily:"Cinzel,serif",color:todayMood?.mood===m.id?m.color:"#444"}}>{m.label.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
            {[{l:"Streak",v:`${streak}d`,i:"🔥",c:"#f97316"},{l:"Estudos",v:fmtHM(Object.values(ac?.subjectMin||{}).reduce((a,b)=>a+b,0)),i:"📚",c:"#60a5fa"},{l:"Km total",v:fmtKm(char.stats.totalKm),i:"🏃",c:"#34d399"}].map((s,i)=>(
              <Card key={i} style={{padding:"10px",textAlign:"center"}}><div style={{fontSize:17,marginBottom:3}}>{s.i}</div><div style={{fontFamily:"Cinzel,serif",fontSize:13,color:s.c,fontWeight:700}}>{s.v}</div><div style={{fontSize:8,color:"#444",letterSpacing:1,marginTop:1}}>{s.l.toUpperCase()}</div></Card>
            ))}
          </div>

          {/* Habits today */}
          {totalHabits>0&&<Card glow="#34d39933" style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <Lbl mb={0}>HÁBITOS DO DIA</Lbl>
              <span style={{fontFamily:"Cinzel,serif",fontSize:12,color:"#34d399"}}>{habitsToday}/{totalHabits}</span>
            </div>
            <div style={{height:5,background:"#1a1838",borderRadius:3,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${totalHabits?pct(habitsToday,totalHabits):0}%`,background:"linear-gradient(90deg,#34d39977,#34d399)",borderRadius:3,transition:"width 0.4s"}}/>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(char.habits||[]).map(h=>{const done=!!h.log?.[todayStr()];return(
                <button key={h.id} className="tbtn" onClick={()=>toggleHabit(h.id)} style={{padding:"6px 10px",borderRadius:20,border:`1px solid ${done?h.color:h.color+"44"}`,background:done?h.color+"22":"transparent",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14}}>{done?"✓":h.icon}</span>
                  <span style={{fontSize:10,fontFamily:"Cinzel,serif",color:done?h.color:"#555"}}>{h.name}</span>
                </button>
              );})}
            </div>
          </Card>}

          {/* XP Chart */}
          <Card style={{marginBottom:10}}>
            <MiniBarChart data={last7} color="#f0c040" height={55} label="XP ÚLTIMOS 7 DIAS"/>
          </Card>

          <Card glow={remaining<0?"#ef444455":"#22c55e33"} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><Lbl mb={0}>SAÚDE FINANCEIRA</Lbl><span style={{fontFamily:"Cinzel,serif",fontSize:13,color:remaining>=0?"#22c55e":"#ef4444"}}>{curr(remaining)} livre</span></div>
            <div style={{height:7,background:"#1a1838",borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.min(100,(paidExp/salary)*100)}%`,background:"linear-gradient(90deg,#22c55e77,#22c55e)",borderRadius:3,transition:"width 0.5s"}}/></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:9,color:"#555"}}>Pago: {curr(paidExp)}</span><span style={{fontSize:9,color:"#555"}}>{curr(totalExp)} / {curr(salary)}</span></div>
          </Card>

          {bmi&&<Card glow={bmiC.c+"44"} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><Lbl mb={2}>IMC</Lbl><div style={{fontFamily:"Cinzel,serif",fontSize:22,color:bmiC.c,fontWeight:700}}>{bmi}</div><div style={{fontSize:11,color:bmiC.c}}>{bmiC.l}</div></div><div style={{textAlign:"right",fontSize:11,color:"#555"}}><div>{char.body.weight} kg</div><div>{char.body.height} cm</div></div></div></Card>}

          {readingBooks.length>0&&<Card glow="#60a5fa33" style={{marginBottom:10}}>
            <Lbl mb={6}>LENDO AGORA — {readingBooks.length}</Lbl>
            {readingBooks.map((b,i)=><div key={b.id||i} style={{marginBottom:i<readingBooks.length-1?8:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12}}>📖 <span style={{color:"#aaa"}}>{b.title}</span></span><span style={{fontFamily:"Cinzel,serif",fontSize:12,color:"#60a5fa"}}>{pct(b.page,b.total)}%</span></div>
              <div style={{height:4,background:"#1a1838",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct(b.page,b.total)}%`,background:"linear-gradient(90deg,#60a5fa77,#60a5fa)",borderRadius:3}}/></div>
            </div>)}
          </Card>}

          {/* Conquistas resumo */}
          <Card style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <Lbl mb={0}>CONQUISTAS</Lbl>
              <span style={{fontFamily:"Cinzel,serif",fontSize:12,color:"#f0c040"}}>{unlockedCount}/{ACHIEVEMENTS.length}</span>
            </div>
            <div style={{height:5,background:"#1a1838",borderRadius:3,overflow:"hidden",marginTop:6}}>
              <div style={{height:"100%",width:`${pct(unlockedCount,ACHIEVEMENTS.length)}%`,background:"linear-gradient(90deg,#f0c04077,#f0c040)",borderRadius:3,transition:"width 0.4s"}}/>
            </div>
          </Card>
        </div>}

        {/* ── DAILY ── */}
        {tab==="daily"&&<div style={{padding:"12px 12px 0"}}>
          <STabs tabs={[{id:"missoes",i:"⚔️",l:"Missões",c:"#f0c040"},{id:"habitos",i:"🌱",l:"Hábitos",c:"#34d399"},{id:"boss",i:"👹",l:"Boss",c:"#8b5cf6"},{id:"streak",i:"🔥",l:"Streak",c:"#f97316"}]} val={dailyTab} onChange={setDailyTab}/>

          {dailyTab==="missoes"&&<>
            {(()=>{const cores=QUESTS.filter(q=>q.core),done=cores.filter(q=>quests[q.id]).length,all=done===cores.length;return<div style={{background:all?"linear-gradient(135deg,#0a2010,#0d2a14)":"#0f0f1e",border:`1px solid ${all?"#22c55e55":"#2a1e0a"}`,borderRadius:10,padding:"9px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8,animation:all?"gpulse 3s infinite":"none"}}><span style={{fontSize:18}}>{all?"🏆":"🎯"}</span><div><div style={{fontFamily:"Cinzel,serif",fontSize:9,color:all?"#22c55e":"#f0c040",letterSpacing:1}}>{all?"COMPLETO! +20 XP BÔNUS":`${done}/${cores.length} MISSÕES PRINCIPAIS`}</div><div style={{fontSize:10,color:"#555"}}>Estudar + Treinar + Dormir bem</div></div></div>;})()}
            {["mente","corpo","disciplina"].map(cat=><div key={cat} style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><div style={{height:1,flex:1,background:`linear-gradient(90deg,${catColor[cat]}44,transparent)`}}/><span style={{fontFamily:"Cinzel,serif",fontSize:9,color:catColor[cat],letterSpacing:2}}>{cat.toUpperCase()}</span><div style={{height:1,flex:1,background:`linear-gradient(270deg,${catColor[cat]}44,transparent)`}}/></div>
              {QUESTS.filter(q=>q.cat===cat).map(q=>{const done=!!quests[q.id],locked=q.req&&!quests[q.req];return<button key={q.id} className="btn" onClick={()=>!locked&&toggleQuest(q)} style={{opacity:locked?0.35:1,marginBottom:5}}><div style={{background:done?`linear-gradient(135deg,${catColor[cat]}18,${catColor[cat]}08)`:"#0f0f1e",border:`1px solid ${done?catColor[cat]+"66":"#1a1838"}`,borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}><div style={{width:20,height:20,borderRadius:5,border:`2px solid ${done?catColor[cat]:"#2a2848"}`,background:done?catColor[cat]+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{done&&<span style={{color:catColor[cat],fontSize:11,fontWeight:900}}>✓</span>}</div><span style={{fontSize:16}}>{locked?"🔒":q.icon}</span><div style={{flex:1}}><div style={{fontSize:13,color:done?"#e8dfc0":"#777"}}>{q.label}</div>{q.core&&<div style={{fontSize:8,color:"#f0c04044",fontFamily:"Cinzel,serif",letterSpacing:1}}>MISSÃO PRINCIPAL</div>}</div><span style={{fontFamily:"Cinzel,serif",fontWeight:700,color:done?catColor[cat]:"#333",fontSize:11}}>+{q.xp}</span></div></button>;})}
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><div style={{height:1,flex:1,background:"linear-gradient(90deg,#ef444444,transparent)"}}/><span style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#ef4444",letterSpacing:2}}>PENALIDADES</span><div style={{height:1,flex:1,background:"linear-gradient(270deg,#ef444444,transparent)"}}/></div>
            {PENALTIES.map(pen=>{const on=!!pens[pen.id];return<button key={pen.id} className="btn" onClick={()=>togglePen(pen)} style={{marginBottom:5}}><div style={{background:on?"#1e0808":"#0f0f1e",border:`1px solid ${on?"#ef444466":"#1a1838"}`,borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}><div style={{width:20,height:20,borderRadius:5,border:`2px solid ${on?"#ef4444":"#2a2848"}`,background:on?"#ef444433":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{on&&<span style={{color:"#ef4444",fontSize:11,fontWeight:900}}>✗</span>}</div><span style={{fontSize:16}}>{pen.icon}</span><span style={{flex:1,fontSize:13,color:on?"#ef9999":"#777"}}>{pen.label}</span><span style={{fontFamily:"Cinzel,serif",fontWeight:700,color:"#ef4444",fontSize:11}}>{pen.xp}</span></div></button>;})}
          </>}

          {dailyTab==="habitos"&&<>
            <button className="sbtn" onClick={()=>setAddingHabit(v=>!v)} style={{background:"#0f0f1e",border:"1px solid #34d39944",color:"#34d399",fontSize:10,letterSpacing:2,marginBottom:10}}>{addingHabit?"✕ CANCELAR":"+ NOVO HÁBITO"}</button>
            {addingHabit&&<Card style={{marginBottom:10}}>
              <Lbl>CRIAR HÁBITO</Lbl>
              <input className="inp" value={newHabitName} onChange={e=>setNewHabitName(e.target.value)} placeholder="Nome do hábito" style={{marginBottom:7}}/>
              <div style={{display:"flex",gap:5,marginBottom:8}}>
                {[{id:"daily",l:"Diário"},{id:"weekly",l:"Semanal"}].map(f=><button key={f.id} className="tbtn" onClick={()=>setNewHabitFreq(f.id)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${newHabitFreq===f.id?"#34d39966":"#2a2848"}`,background:newHabitFreq===f.id?"#34d39922":"#0f0f1e",color:newHabitFreq===f.id?"#34d399":"#555",fontFamily:"Cinzel,serif",fontSize:9}}>{f.l}</button>)}
              </div>
              <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                {HABIT_ICONS.map(ic=><button key={ic} className="tbtn" onClick={()=>setNewHabitIcon(ic)} style={{fontSize:18,opacity:newHabitIcon===ic?1:0.3}}>{ic}</button>)}
              </div>
              <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                {HABIT_COLORS.map(c=><button key={c} className="tbtn" onClick={()=>setNewHabitColor(c)} style={{width:22,height:22,borderRadius:"50%",background:c,border:`2px solid ${newHabitColor===c?"#fff":"transparent"}`,flexShrink:0}}/>)}
              </div>
              <button className="sbtn" onClick={addHabit} style={{background:`linear-gradient(135deg,${newHabitColor}22,${newHabitColor}11)`,border:`1px solid ${newHabitColor}55`,color:newHabitColor,fontSize:11}}>✓ CRIAR</button>
            </Card>}

            {(char.habits||[]).length===0&&!addingHabit&&<div style={{textAlign:"center",padding:"30px 0",color:"#444",fontSize:12}}>
              <div style={{fontSize:36,marginBottom:8}}>🌱</div>
              <div>Nenhum hábito ainda</div>
              <div style={{fontSize:10,marginTop:4,color:"#333"}}>Crie hábitos para ganhar +5 XP por dia</div>
            </div>}

            {(char.habits||[]).map(h=>{
              const done=!!h.log?.[todayStr()];
              // streak do hábito
              let hStreak=0;
              const d2=new Date();
              for(let i=0;i<60;i++){const ds=`${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,"0")}-${String(d2.getDate()).padStart(2,"0")}`;if(h.log?.[ds]) hStreak++; else break;d2.setDate(d2.getDate()-1);}
              return(
                <div key={h.id} style={{background:done?`linear-gradient(135deg,${h.color}18,${h.color}08)`:"#0f0f1e",border:`1px solid ${done?h.color+"66":"#1a1838"}`,borderRadius:12,padding:"11px 13px",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <button className="tbtn" onClick={()=>toggleHabit(h.id)} style={{width:26,height:26,borderRadius:6,border:`2px solid ${done?h.color:"#2a2848"}`,background:done?h.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>
                      {done?"✓":h.icon}
                    </button>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:done?"#e8dfc0":"#aaa"}}>{h.name}</div>
                      <div style={{fontSize:9,color:"#555",fontFamily:"Cinzel,serif"}}>{h.freq==="weekly"?"SEMANAL":"DIÁRIO"} · 🔥{hStreak}d · +5 XP</div>
                    </div>
                    <button className="tbtn" onClick={()=>removeHabit(h.id)} style={{color:"#333",fontSize:12}}>🗑</button>
                  </div>
                </div>
              );
            })}
          </>}

          {dailyTab==="boss"&&<Card glow={bossComplete&&!char.boss?.claimed?"#f0c04077":char.boss?.claimed?"#22c55e55":"#2a2248"} anim={bossComplete&&!char.boss?.claimed?"pulse 2s infinite":"none"}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:26}}>{boss.icon}</span><div style={{flex:1}}><Lbl mb={2}>BOSS SEMANAL</Lbl><div style={{fontSize:15,color:"#e8dfc0"}}>{boss.name}</div></div><span style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#f0c040",fontWeight:700}}>+{boss.xp} XP</span></div>
            <div style={{fontSize:12,color:"#666",marginBottom:10}}>{boss.desc}</div>
            {Object.entries(bGls).map(([k,goal])=>{const labels={studyMin:"Estudo",trainCount:"Treinos",questions:"Questões",runKm:"Corrida"};const vals={studyMin:`${fmtHM(char.boss?.studyMin||0)} / ${fmtHM(goal)}`,trainCount:`${char.boss?.trainCount||0} / ${goal}x`,questions:`${char.boss?.questions||0} / ${goal}`,runKm:`${(char.boss?.runKm||0).toFixed(1)} / ${goal}km`};return<div key={k} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#777"}}>{labels[k]}</span><span style={{fontSize:11,color:bPcts[k]>=100?"#22c55e":"#888",fontFamily:"Cinzel,serif"}}>{vals[k]}</span></div><div style={{height:5,background:"#1a1838",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${bPcts[k]||0}%`,background:bPcts[k]>=100?"#22c55e":"#8b5cf6",borderRadius:3,transition:"width 0.5s"}}/></div></div>;})}
            {bossComplete&&!char.boss?.claimed&&<button className="sbtn" onClick={claimBoss} style={{marginTop:10,background:"linear-gradient(135deg,#f0c040,#d4a017)",color:"#000",fontWeight:700,fontSize:13}}>⚔️ REIVINDICAR +{boss.xp} XP</button>}
            {char.boss?.claimed&&<div style={{marginTop:8,textAlign:"center",fontSize:11,color:"#22c55e",fontFamily:"Cinzel,serif",letterSpacing:1}}>✓ BOSS DERROTADO ESTA SEMANA</div>}
          </Card>}

          {dailyTab==="streak"&&<>
            <Card glow={streak>=7?"#f9731666":"#2a1e0a"} style={{textAlign:"center",padding:"22px 14px",marginBottom:10}}>
              <div style={{fontSize:44,marginBottom:6}}>{streak>=30?"🔥":streak>=7?"⚡":"💤"}</div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:36,fontWeight:900,color:"#f97316"}}>{streak}</div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:10,color:"#f9731699",letterSpacing:3,margin:"4px 0 10px"}}>DIAS CONSECUTIVOS</div>
              {multi>1&&<div style={{background:"#f9731622",border:"1px solid #f9731644",borderRadius:8,padding:"6px 14px",display:"inline-block",fontFamily:"Cinzel,serif",fontSize:12,color:"#f97316",marginBottom:10}}>✨ ×{multi.toFixed(2)} ATIVO</div>}
              <div style={{display:"flex",justifyContent:"space-around"}}>
                {[{l:"Recorde",v:char.streak?.best||0,c:"#f0c040"},{l:"Dias ativos",v:char.stats.activeDays||0,c:"#a78bfa"},{l:"Missões",v:char.stats.totalQuests||0,c:"#34d399"}].map((s,i)=><div key={i}><div style={{fontFamily:"Cinzel,serif",fontSize:20,color:s.c}}>{s.v}</div><div style={{fontSize:9,color:"#555"}}>{s.l}</div></div>)}
              </div>
            </Card>
            {/* Mood history */}
            <Card>
              <Lbl mb={8}>HUMOR — ÚLTIMOS 14 DIAS</Lbl>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {(()=>{const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;days.push(ds);}return days.map(ds=>{const entry=(char.moodLog||[]).find(m=>m.date===ds);const mood=entry?MOODS.find(m=>m.id===entry.mood):null;return<div key={ds} title={ds} style={{width:20,height:20,borderRadius:5,background:mood?mood.color+"33":"#1a1838",border:`1px solid ${mood?mood.color+"55":"transparent"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{mood?.icon||""}</div>;});})()}
              </div>
            </Card>
          </>}
        </div>}

        {/* ── STUDY ── */}
        {tab==="study"&&<div style={{padding:"12px 12px 0"}}>
          {/* Concurso selector */}
          <div style={{display:"flex",gap:5,marginBottom:6}}>
            <select className="inp" style={{flex:1}} value={char.activeConcurso} onChange={e=>switchConcurso(e.target.value)}>
              {(char.concursos||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="tbtn" onClick={()=>setAddingConcurso(v=>!v)} style={{background:"#1a1535",border:"1px solid #a78bfa55",color:"#a78bfa",borderRadius:8,padding:"9px 12px",fontFamily:"Cinzel,serif",fontSize:10,flexShrink:0}}>+ NOVO</button>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:10}}>
            <button className="tbtn" onClick={()=>{setEditingConcursoId(ac?.id);setEditingSubjects(v=>!v);setRenamingConcId(null);}} style={{flex:1,padding:"6px 0",borderRadius:7,border:"1px solid #60a5fa44",background:editingSubjects&&editingConcursoId===ac?.id?"#0a1a2a":"transparent",color:"#60a5fa",fontFamily:"Cinzel,serif",fontSize:9}}>✎ MATÉRIAS</button>
            <button className="tbtn" onClick={()=>{setRenamingConcId(ac?.id);setRenamingConcName(ac?.name||"");setEditingSubjects(false);}} style={{flex:1,padding:"6px 0",borderRadius:7,border:"1px solid #f0c04044",background:renamingConcId===ac?.id?"#1a1400":"transparent",color:"#f0c040",fontFamily:"Cinzel,serif",fontSize:9}}>✎ RENOMEAR</button>
            <button className="tbtn" onClick={()=>deleteConcurso(ac?.id)} style={{padding:"6px 10px",borderRadius:7,border:"1px solid #ef444433",background:"transparent",color:"#ef4444",fontSize:12}}>🗑</button>
          </div>
          {renamingConcId===ac?.id&&<div style={{display:"flex",gap:5,marginBottom:10}}><input className="inp" value={renamingConcName} onChange={e=>setRenamingConcName(e.target.value)} placeholder="Novo nome..."/><button className="tbtn" onClick={renameConcurso} style={{background:"#1a1400",border:"1px solid #f0c04055",color:"#f0c040",borderRadius:8,padding:"9px 13px",fontFamily:"Cinzel,serif",fontSize:11,flexShrink:0}}>OK</button><button className="tbtn" onClick={()=>setRenamingConcId(null)} style={{color:"#555",fontSize:16,flexShrink:0}}>✕</button></div>}
          {addingConcurso&&<div style={{display:"flex",gap:5,marginBottom:10}}><input className="inp" value={newConcName} onChange={e=>setNewConcName(e.target.value)} placeholder="Nome do concurso..."/><button className="tbtn" onClick={addConcurso} style={{background:"#1a1535",border:"1px solid #a78bfa55",color:"#a78bfa",borderRadius:8,padding:"9px 13px",fontFamily:"Cinzel,serif",fontSize:11,flexShrink:0}}>OK</button><button className="tbtn" onClick={()=>setAddingConcurso(false)} style={{color:"#555",fontSize:16,flexShrink:0}}>✕</button></div>}

          {editingSubjects&&editingConcursoId===ac?.id&&<Card glow="#60a5fa33" style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl mb={0} color="#60a5fa">MATÉRIAS — {ac?.name}</Lbl><button className="tbtn" onClick={()=>setEditingSubjects(false)} style={{color:"#555",fontSize:16}}>✕</button></div>
            {(ac?.subjects||[]).map(sub=>(
              <div key={sub.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,background:"#0a0a18",borderRadius:8,padding:"7px 10px"}}>
                <span style={{fontSize:16}}>{sub.icon}</span>
                <span style={{flex:1,fontSize:12,color:"#aaa"}}>{sub.name}</span>
                <div style={{width:14,height:14,borderRadius:"50%",background:sub.color,flexShrink:0}}/>
                <button className="tbtn" onClick={()=>removeSubject(ac.id,sub.id)} style={{color:"#ef4444",fontSize:13,flexShrink:0}}>🗑</button>
              </div>
            ))}
            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1a1838"}}>
              <Lbl color="#34d399" mb={6}>+ NOVA MATÉRIA</Lbl>
              <input className="inp" value={newSubName} onChange={e=>setNewSubName(e.target.value)} placeholder="Nome da matéria" style={{marginBottom:7}}/>
              <div style={{display:"flex",gap:6,marginBottom:7,flexWrap:"wrap"}}>{SUBJECT_ICONS.map(ic=><button key={ic} className="tbtn" onClick={()=>setNewSubIcon(ic)} style={{fontSize:18,opacity:newSubIcon===ic?1:0.3}}>{ic}</button>)}</div>
              <div style={{display:"flex",gap:5,marginBottom:9,flexWrap:"wrap"}}>{SUBJECT_COLORS.map(c=><button key={c} className="tbtn" onClick={()=>setNewSubColor(c)} style={{width:22,height:22,borderRadius:"50%",background:c,border:`2px solid ${newSubColor===c?"#fff":"transparent"}`,flexShrink:0}}/>)}</div>
              <button className="sbtn" onClick={addSubject} style={{background:`linear-gradient(135deg,${newSubColor}22,${newSubColor}11)`,border:`1px solid ${newSubColor}55`,color:newSubColor,fontSize:10}}>+ ADICIONAR MATÉRIA</button>
            </div>
          </Card>}

          <STabs tabs={[{id:"timer",i:"⏱️",l:"Estudo",c:"#60a5fa"},{id:"questoes",i:"🎯",l:"Questões",c:"#a78bfa"},{id:"simulado",i:"📋",l:"Simulado",c:"#f97316"},{id:"livros",i:"📖",l:"Livros",c:"#f0c040"}]} val={studyTab} onChange={setStudyTab}/>

          {/* TIMER */}
          {studyTab==="timer"&&<>
            {(ac?.subjects||[]).length===0?(
              <Card style={{textAlign:"center",padding:"20px"}}><div style={{fontSize:32,marginBottom:8}}>📚</div><div style={{fontSize:12,color:"#555",marginBottom:10}}>Nenhuma matéria cadastrada</div><button className="sbtn" onClick={()=>{setEditingConcursoId(ac?.id);setEditingSubjects(true);}} style={{background:"#1a1535",border:"1px solid #60a5fa55",color:"#60a5fa",fontSize:10}}>+ ADICIONAR MATÉRIAS</button></Card>
            ):<>
              <Lbl>MATÉRIA — {ac?.name?.toUpperCase()}</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                {(ac?.subjects||[]).map(sub=>{
                  const mins=(ac.subjectMin||{})[sub.id]||0;
                  const goal=(char.studyGoals||{})[sub.id];
                  const isSelected=timerSub===sub.id;
                  return<button key={sub.id} className="tbtn" onClick={()=>setTimerSub(isSelected?null:sub.id)} style={{width:"100%"}}>
                    <div style={{background:isSelected?`linear-gradient(135deg,${sub.color}28,${sub.color}12)`:`linear-gradient(135deg,${sub.color}14,${sub.color}06)`,border:`2px solid ${isSelected?sub.color:sub.color+"44"}`,borderRadius:11,padding:"11px 10px",textAlign:"center",transition:"all 0.15s",position:"relative"}}>
                      {goal&&<div style={{position:"absolute",top:5,right:7,fontSize:8,color:mins>=goal?"#22c55e":"#555",fontFamily:"Cinzel,serif"}}>{Math.min(100,Math.round(mins/goal*100))}%</div>}
                      <div style={{fontSize:20,marginBottom:3}}>{sub.icon}</div>
                      <div style={{fontFamily:"Cinzel,serif",fontSize:8,color:sub.color,letterSpacing:1,marginBottom:2}}>{sub.name?.split(" ")[0]?.toUpperCase()}</div>
                      <div style={{fontSize:10,color:"#555",marginBottom:2}}>{mins>0?fmtHM(mins):"—"}</div>
                      {goal&&<div style={{height:2,background:"#1a1838",borderRadius:1,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.min(100,pct(mins,goal))}%`,background:sub.color,borderRadius:1}}/></div>}
                      {goal&&<div style={{fontSize:8,color:"#555"}}>Meta: {fmtHM(goal)}</div>}
                      <div style={{background:isSelected?sub.color:sub.color+"88",color:"#000",borderRadius:5,padding:"3px 0",fontFamily:"Cinzel,serif",fontSize:8,fontWeight:700,marginTop:4}}>{isSelected?"✓ SELECIONADA":"SELECIONAR"}</div>
                      {/* Goal edit */}
                      {isSelected&&<button className="tbtn" onClick={e=>{e.stopPropagation();setEditingGoal(editingGoal===sub.id?null:sub.id);setGoalInput(goal?String(goal):"");}} style={{marginTop:5,fontSize:8,color:"#555",fontFamily:"Cinzel,serif",letterSpacing:1}}>✎ META</button>}
                    </div>
                  </button>;
                })}
              </div>

              {editingGoal&&<div style={{display:"flex",gap:6,marginBottom:10,background:"#0f0f1e",border:"1px solid #60a5fa33",borderRadius:9,padding:"10px 12px"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#555",marginBottom:4}}>META SEMANAL (minutos)</div>
                  <input className="inp" value={goalInput} onChange={e=>setGoalInput(e.target.value)} type="number" placeholder="Ex: 300 = 5h" style={{padding:"7px 10px"}}/>
                </div>
                <button className="tbtn" onClick={()=>saveGoal(editingGoal)} style={{background:"#0a1a2a",border:"1px solid #60a5fa55",color:"#60a5fa",borderRadius:8,padding:"9px 13px",fontFamily:"Cinzel,serif",fontSize:9,flexShrink:0,alignSelf:"flex-end"}}>OK</button>
                <button className="tbtn" onClick={()=>setEditingGoal(null)} style={{color:"#555",fontSize:16,alignSelf:"center",flexShrink:0}}>✕</button>
              </div>}

              <Card glow={timerSub?"#60a5fa33":"#1a1838"} style={{marginBottom:10}}>
                <Lbl color="#60a5fa" mb={8}>REGISTRAR SESSÃO</Lbl>
                {timerSub?(()=>{
                  const sub=(ac?.subjects||[]).find(s=>s.id===timerSub)||{icon:"📚",color:"#60a5fa",name:"Estudo"};
                  return <>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,background:`${sub.color}11`,borderRadius:8,padding:"8px 10px"}}>
                      <span style={{fontSize:18}}>{sub.icon}</span>
                      <span style={{fontFamily:"Cinzel,serif",fontSize:10,color:sub.color,letterSpacing:1}}>{sub.name}</span>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:"#555",fontFamily:"Cinzel,serif",letterSpacing:1,marginBottom:4}}>HORA INÍCIO</div>
                        <input className="inp" type="time" value={studyStart} onChange={e=>setStudyStart(e.target.value)} style={{textAlign:"center",fontSize:18,fontFamily:"Cinzel,serif",color:"#60a5fa",padding:"10px 8px"}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",paddingTop:20}}><span style={{color:"#333",fontSize:20}}>→</span></div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:"#555",fontFamily:"Cinzel,serif",letterSpacing:1,marginBottom:4}}>HORA FIM</div>
                        <input className="inp" type="time" value={studyEnd} onChange={e=>setStudyEnd(e.target.value)} style={{textAlign:"center",fontSize:18,fontFamily:"Cinzel,serif",color:"#60a5fa",padding:"10px 8px"}}/>
                      </div>
                    </div>
                    {previewMins!==null&&previewMins>0&&(
                      <div style={{background:"#60a5fa11",border:"1px solid #60a5fa33",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#aaa"}}>⏱ {fmtHM(previewMins)} de estudo</span>
                        <span style={{fontFamily:"Cinzel,serif",fontSize:12,color:"#60a5fa",fontWeight:700}}>+{Math.round(previewMins/2)} XP</span>
                      </div>
                    )}
                    <button className="sbtn" onClick={saveStudySession} style={{background:"linear-gradient(135deg,#0a1a2a,#0d2040)",border:"1px solid #60a5fa55",color:"#60a5fa",fontSize:11,letterSpacing:2}}>✓ REGISTRAR ESTUDO</button>
                  </>;
                })():(
                  <div style={{textAlign:"center",padding:"12px 0",fontSize:12,color:"#444"}}>← Selecione uma matéria acima</div>
                )}
              </Card>

              <Lbl>TEMPO TOTAL POR MATÉRIA</Lbl>
              {(ac?.subjects||[]).map(sub=>{const mins=(ac.subjectMin||{})[sub.id]||0,mx=Math.max(...(ac.subjects||[]).map(s=>(ac.subjectMin||{})[s.id]||0),1);const goal=(char.studyGoals||{})[sub.id];return<div key={sub.id} style={{background:"#0f0f1e",border:"1px solid #1a1838",borderRadius:8,padding:"7px 12px",marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12}}>{sub.icon} <span style={{color:"#888"}}>{sub.name}</span></span><span style={{fontFamily:"Cinzel,serif",fontSize:10,color:mins>0?sub.color:"#333"}}>{mins>0?fmtHM(mins):"—"}{goal?` / ${fmtHM(goal)}`:""}</span></div><div style={{height:3,background:"#1a1838",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${goal?Math.min(100,pct(mins,goal)):(mins/mx)*100}%`,background:goal&&mins>=goal?"#22c55e":sub.color,borderRadius:2,transition:"width 0.4s"}}/></div></div>;})}

              {/* Study chart */}
              {subjectChartData.some(d=>d.v>0)&&<Card style={{marginTop:10}}>
                <Lbl mb={8}>HORAS POR MATÉRIA</Lbl>
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:55}}>
                  {subjectChartData.map((d,i)=>{const mx2=Math.max(...subjectChartData.map(x=>x.v),0.1);return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:"100%",height:Math.max(2,(d.v/mx2)*43),background:d.v>0?d.color:"#1a1838",borderRadius:"3px 3px 0 0",transition:"height 0.3s"}}/>
                    <div style={{fontSize:7,color:"#444",fontFamily:"Cinzel,serif"}}>{d.l}</div>
                  </div>;})}
                </div>
              </Card>}
            </>}
          </>}

          {/* QUESTÕES */}
          {studyTab==="questoes"&&<>
            {(ac?.subjects||[]).length===0?(
              <Card style={{textAlign:"center",padding:"20px"}}><div style={{fontSize:12,color:"#555"}}>Adicione matérias ao concurso primeiro</div></Card>
            ):<>
              {weakSubs.length>0&&<div style={{background:"linear-gradient(135deg,#1e0808,#2a0a0a)",border:"1px solid #ef444466",borderRadius:11,padding:"11px 13px",marginBottom:10,animation:"rpulse 2.5s infinite"}}><Lbl color="#ef4444" mb={6}>⚠️ ABAIXO DE 80% — FOQUE AQUI</Lbl>{weakSubs.map(s=>{const d=getQStats(s.id,ac);return<div key={s.id} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12}}>{s.icon} <span style={{color:"#ef9999"}}>{s.name}</span></span><span style={{fontFamily:"Cinzel,serif",color:"#ef4444",fontWeight:700}}>{pct(d.correct,d.total)}%</span></div>;})}</div>}
              <Card style={{marginBottom:10}}>
                <Lbl>REGISTRAR QUESTÕES</Lbl>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                  <input className="inp" value={qCorr} onChange={e=>setQCorr(e.target.value)} type="number" min="0" placeholder="Acertos"/>
                  <input className="inp" value={qTot} onChange={e=>setQTot(e.target.value)} type="number" min="1" placeholder="Total"/>
                </div>
                <select className="inp" value={qSub} onChange={e=>setQSub(e.target.value)} style={{marginBottom:8}}>
                  {(ac?.subjects||[]).map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
                <button className="sbtn" onClick={submitQ} style={{background:"linear-gradient(135deg,#1a1535,#221c42)",border:"1px solid #a78bfa55",color:"#a78bfa",fontSize:11}}>✓ REGISTRAR (+0.5 XP/ACERTO)</button>
              </Card>
              <div style={{display:"flex",gap:5,marginBottom:10}}>{[{id:"today",l:"Hoje"},{id:"7d",l:"7 dias"},{id:"30d",l:"30 dias"},{id:"all",l:"Sempre"}].map(p=><button key={p.id} className="tbtn" onClick={()=>setQPeriod(p.id)} style={{flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${qPeriod===p.id?"#a78bfa55":"#1a1838"}`,background:qPeriod===p.id?"#1a1535":"#0f0f1e",color:qPeriod===p.id?"#a78bfa":"#555",fontFamily:"Cinzel,serif",fontSize:9}}>{p.l}</button>)}</div>
              <Lbl>DESEMPENHO</Lbl>
              {(ac?.subjects||[]).map(sub=>{const d=getQStats(sub.id,ac);const acc=d.total>0?pct(d.correct,d.total):null;const weak=acc!==null&&acc<80;return<div key={sub.id} style={{background:weak?"linear-gradient(135deg,#1e080855,#2a0a0a55)":"#0f0f1e",border:`1px solid ${weak?"#ef444455":"#1a1838"}`,borderRadius:10,padding:"9px 12px",marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:acc!==null?4:0}}><span style={{fontSize:12}}>{sub.icon} <span style={{color:"#aaa"}}>{sub.name}</span></span><div style={{display:"flex",alignItems:"center",gap:7}}>{acc!==null&&<span style={{fontSize:10,color:"#555"}}>{d.correct}/{d.total}</span>}<span style={{fontFamily:"Cinzel,serif",fontSize:14,fontWeight:700,color:acc===null?"#333":acc>=80?sub.color:"#ef4444"}}>{acc===null?"—":`${acc}%`}</span>{weak&&<span>⚠️</span>}</div></div>{acc!==null&&<><div style={{height:4,background:"#1a1838",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${acc}%`,background:acc>=80?sub.color:"#ef4444",borderRadius:2,transition:"width 0.4s"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontSize:8,color:"#444"}}>Meta: 80%</span>{weak?<span style={{fontSize:8,color:"#ef4444"}}>Faltam {80-acc}%</span>:<span style={{fontSize:8,color:"#34d39977"}}>✓ Na meta</span>}</div></>}</div>;})}
            </>}
          </>}

          {/* SIMULADO */}
          {studyTab==="simulado"&&<>
            <button className="sbtn" onClick={()=>setAddingSimulado(v=>!v)} style={{background:"#0f0f1e",border:"1px solid #f9731644",color:"#f97316",fontSize:10,letterSpacing:2,marginBottom:10}}>{addingSimulado?"✕ CANCELAR":"+ REGISTRAR SIMULADO"}</button>
            {addingSimulado&&<Card style={{marginBottom:10}}>
              <Lbl>NOVO SIMULADO</Lbl>
              <input className="inp" value={simName} onChange={e=>setSimName(e.target.value)} placeholder="Nome (ex: Simulado CESPE #1)" style={{marginBottom:6}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                <input className="inp" value={simScore} onChange={e=>setSimScore(e.target.value)} type="number" placeholder="Acertos"/>
                <input className="inp" value={simTotal} onChange={e=>setSimTotal(e.target.value)} type="number" placeholder="Total questões"/>
              </div>
              <input className="inp" value={simTime} onChange={e=>setSimTime(e.target.value)} placeholder="Tempo (ex: 3h20min)" style={{marginBottom:9}}/>
              {simScore&&simTotal&&<div style={{marginBottom:9,padding:"8px 12px",background:"#f9731611",border:"1px solid #f9731433",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#aaa"}}>Desempenho</span>
                <span style={{fontFamily:"Cinzel,serif",fontSize:14,fontWeight:700,color:pct(parseInt(simScore),parseInt(simTotal))>=70?"#22c55e":"#ef4444"}}>{pct(parseInt(simScore)||0,parseInt(simTotal)||1)}%</span>
              </div>}
              <button className="sbtn" onClick={addSimulado} style={{background:"linear-gradient(135deg,#1e0a00,#2a1400)",border:"1px solid #f9731455",color:"#f97316",fontSize:11}}>✓ SALVAR SIMULADO</button>
            </Card>}

            {(char.simulados||[]).length===0&&!addingSimulado&&<div style={{textAlign:"center",padding:"30px 0",color:"#444"}}><div style={{fontSize:36,marginBottom:8}}>📋</div><div>Nenhum simulado registrado</div></div>}

            {(char.simulados||[]).length>1&&(()=>{
              const sims=[...(char.simulados||[])].reverse().slice(-8);
              const mx=Math.max(...sims.map(s=>s.score),1);
              return<Card style={{marginBottom:10}}>
                <Lbl mb={8}>EVOLUÇÃO DOS SIMULADOS</Lbl>
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:60}}>
                  {sims.map((s,i)=>{const a=pct(s.score,s.total);const color=a>=70?"#22c55e":a>=50?"#f59e0b":"#ef4444";return<div key={s.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{fontSize:7,color:color,fontFamily:"Cinzel,serif"}}>{a}%</div>
                    <div style={{width:"100%",height:Math.max(4,(s.score/mx)*44),background:color,borderRadius:"3px 3px 0 0",transition:"height 0.3s"}}/>
                    <div style={{fontSize:6,color:"#444",fontFamily:"Cinzel,serif"}}>{s.date?.slice(5)}</div>
                  </div>;})}</div>
              </Card>;
            })()}

            {(char.simulados||[]).map(s=>{const a=pct(s.score,s.total);return<div key={s.id} style={{background:"#0f0f1e",border:`1px solid ${a>=70?"#22c55e44":a>=50?"#f59e0b44":"#ef444433"}`,borderRadius:11,padding:"11px 13px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div><div style={{fontSize:13,color:"#e8dfc0"}}>{s.name}</div><div style={{fontSize:10,color:"#555"}}>{s.date}{s.concurso?` · ${(char.concursos||[]).find(c=>c.id===s.concurso)?.name||""}`:""}{s.time?` · ${s.time}`:""}</div></div>
                <div style={{fontFamily:"Cinzel,serif",fontSize:18,color:a>=70?"#22c55e":a>=50?"#f59e0b":"#ef4444",fontWeight:700}}>{a}%</div>
              </div>
              <div style={{height:5,background:"#1a1838",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${a}%`,background:a>=70?"#22c55e":a>=50?"#f59e0b":"#ef4444",borderRadius:3}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:9,color:"#555"}}>{s.score}/{s.total} questões</span><span style={{fontSize:9,color:"#555"}}>+{Math.round(s.score*0.5)} XP</span></div>
            </div>;})}
          </>}

          {/* LIVROS */}
          {studyTab==="livros"&&<>
            <button className="sbtn" onClick={()=>setAddingBook(v=>!v)} style={{background:"#0f0f1e",border:"1px solid #60a5fa44",color:"#60a5fa",fontSize:10,letterSpacing:2,marginBottom:10}}>{addingBook?"✕ CANCELAR":"+ ADICIONAR LIVRO"}</button>
            {addingBook&&<Card style={{marginBottom:10}}>
              <Lbl>NOVO LIVRO</Lbl>
              <input className="inp" value={bookTitle} onChange={e=>setBookTitle(e.target.value)} placeholder="Título" style={{marginBottom:6}}/>
              <input className="inp" value={bookAuthor} onChange={e=>setBookAuthor(e.target.value)} placeholder="Autor" style={{marginBottom:6}}/>
              <input className="inp" value={bookPages} onChange={e=>setBookPages(e.target.value)} type="number" placeholder="Total de páginas" style={{marginBottom:9}}/>
              <button className="sbtn" onClick={addBook} style={{background:"linear-gradient(135deg,#1a1535,#221c42)",border:"1px solid #60a5fa55",color:"#60a5fa",fontSize:11}}>✓ ADICIONAR</button>
            </Card>}
            {readingBooks.length>0&&<>
              <Lbl>LENDO AGORA — {readingBooks.length}</Lbl>
              {readingBooks.map((b)=>{
                const p2=pct(b.page,b.total);const isUpdating=updatingBookId===b.id;
                return<Card key={b.id} glow="#60a5fa33" style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,color:"#e8dfc0",marginBottom:2}}>{b.title}</div>{b.author&&<div style={{fontSize:11,color:"#60a5fa88",marginBottom:6}}>por {b.author}</div>}</div>
                    <button className="tbtn" onClick={()=>removeBook(b.id)} style={{color:"#333",fontSize:13,marginLeft:8,flexShrink:0}}>✕</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#777"}}>Pág. {b.page} / {b.total}</span><span style={{fontFamily:"Cinzel,serif",fontSize:14,color:"#60a5fa",fontWeight:700}}>{p2}%</span></div>
                  <div style={{height:8,background:"#1a1838",borderRadius:4,overflow:"hidden",marginBottom:9}}><div style={{height:"100%",width:`${p2}%`,background:"linear-gradient(90deg,#60a5fa77,#60a5fa)",borderRadius:4,transition:"width 0.5s",boxShadow:"0 0 8px #60a5fa55"}}/></div>
                  {isUpdating?(
                    <div style={{display:"flex",gap:6,marginBottom:6}}>
                      <input className="inp" value={bookPageInput} onChange={e=>setBookPageInput(e.target.value)} type="number" placeholder={`Pág. atual (${b.page})`} style={{flex:1}}/>
                      <button className="tbtn" onClick={()=>updateBookPage(b.id)} style={{background:"#1a1535",border:"1px solid #60a5fa55",color:"#60a5fa",borderRadius:8,padding:"9px 13px",fontFamily:"Cinzel,serif",fontSize:9,flexShrink:0}}>OK</button>
                      <button className="tbtn" onClick={()=>{setUpdatingBookId(null);setBookPageInput("");}} style={{color:"#555",fontSize:16,flexShrink:0}}>✕</button>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:6}}>
                      <button className="tbtn" onClick={()=>{setUpdatingBookId(b.id);setBookPageInput("");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #60a5fa44",color:"#60a5fa",fontFamily:"Cinzel,serif",fontSize:9}}>✎ ATUALIZAR PÁGINA</button>
                      {p2>=100&&<button className="tbtn" onClick={()=>finishBook(b.id)} style={{flex:1,padding:"8px 0",borderRadius:8,background:"linear-gradient(135deg,#f0c040,#d4a017)",color:"#000",fontFamily:"Cinzel,serif",fontSize:9,fontWeight:700,animation:"pulse 2s infinite"}}>🎉 FINALIZAR +80 XP</button>}
                    </div>
                  )}
                </Card>;
              })}
            </>}
            {(char.books?.library||[]).length>0&&<>
              <Lbl>BIBLIOTECA — {char.books.library.length}</Lbl>
              {char.books.library.map((b,i)=>(
                <div key={b.id||i} style={{background:"linear-gradient(135deg,#1a1400,#1e1600)",border:"1px solid #f0c04033",borderRadius:10,padding:"10px 13px",marginBottom:5,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>📗</span>
                  <div style={{flex:1}}><div style={{fontSize:13,color:"#e8dfc0"}}>{b.title}</div><div style={{fontSize:10,color:"#f0c04077"}}>{b.author}{b.finishedDate?` · ${b.finishedDate}`:""}</div></div>
                  <span style={{fontFamily:"Cinzel,serif",fontSize:10,color:"#f0c040"}}>+80 XP</span>
                </div>
              ))}
            </>}
          </>}
        </div>}

        {/* ── BODY ── */}
        {tab==="body"&&<div style={{padding:"12px 12px 0"}}>
          <STabs tabs={[{id:"treino",i:"💪",l:"Treino",c:"#ef4444"},{id:"corrida",i:"🏃",l:"Corrida",c:"#34d399"},{id:"medidas",i:"📏",l:"Medidas",c:"#60a5fa"}]} val={bodyTab} onChange={setBodyTab}/>

          {bodyTab==="treino"&&<>
            {workoutView==="list"&&<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <Lbl mb={0}>MINHAS FICHAS</Lbl>
                <button className="tbtn" onClick={()=>setWorkoutView("new")} style={{background:"#1a1535",border:"1px solid #a78bfa55",color:"#a78bfa",borderRadius:8,padding:"5px 12px",fontFamily:"Cinzel,serif",fontSize:9,letterSpacing:1}}>+ NOVA FICHA</button>
              </div>
              {Object.entries(plans).map(([key,plan])=>(
                <div key={key} style={{background:`linear-gradient(135deg,${plan.color}14,${plan.color}06)`,border:`1px solid ${plan.color}44`,borderRadius:12,padding:"12px 13px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:24}}>{plan.icon}</span><div style={{flex:1}}><div style={{fontFamily:"Cinzel,serif",fontSize:11,color:plan.color,letterSpacing:1}}>{plan.label}</div><div style={{fontSize:11,color:"#888"}}>{plan.focus}</div><div style={{fontSize:10,color:"#555"}}>{plan.exercises.length} exercícios</div></div></div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="tbtn" onClick={()=>startWorkout(key)} style={{flex:2,padding:"9px 0",borderRadius:8,background:plan.color,color:"#000",fontFamily:"Cinzel,serif",fontSize:10,fontWeight:700}}>▶ INICIAR</button>
                    <button className="tbtn" onClick={()=>openEditPlan(key)} style={{flex:1,padding:"9px 0",borderRadius:8,background:"#0f0f1e",border:`1px solid ${plan.color}44`,color:plan.color,fontFamily:"Cinzel,serif",fontSize:9}}>✎ EDITAR</button>
                    {!plan.isDefault&&<button className="tbtn" onClick={()=>deletePlan(key)} style={{padding:"9px 10px",borderRadius:8,background:"#1e0808",border:"1px solid #ef444433",color:"#ef4444",fontSize:12}}>🗑</button>}
                  </div>
                </div>
              ))}
              {(char.workoutLog||[]).length>0&&<><Lbl style={{marginTop:10}}>HISTÓRICO</Lbl>{(char.workoutLog||[]).slice(0,4).map((w,i)=><div key={i} style={{background:"#0f0f1e",border:"1px solid #1a1838",borderRadius:9,padding:"8px 12px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:12,color:"#aaa"}}>{w.label}</span><div style={{fontSize:10,color:"#555"}}>{w.date} · {w.done}/{w.total}</div></div><span style={{fontFamily:"Cinzel,serif",fontSize:12,color:"#f0c040"}}>+{w.xp} XP</span></div>)}</>}
            </>}

            {workoutView==="active"&&activeWorkout&&(()=>{const plan=plans[activeWorkout];const done2=plan.exercises.filter(e=>doneEx[e.id]).length;return<div>
              <div style={{background:`linear-gradient(135deg,${plan.color}18,${plan.color}06)`,border:`1px solid ${plan.color}55`,borderRadius:12,padding:"12px",marginBottom:10}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:plan.color,letterSpacing:2,marginBottom:2}}>{plan.label.toUpperCase()}</div>
                <div style={{fontSize:12,color:"#aaa",marginBottom:8}}>{plan.focus}</div>
                <div style={{height:5,background:"#1a1838",borderRadius:3,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${(done2/plan.exercises.length)*100}%`,background:plan.color,borderRadius:3,transition:"width 0.3s"}}/></div>
                <div style={{fontSize:10,color:"#555"}}>{done2}/{plan.exercises.length} exercícios</div>
              </div>
              {plan.exercises.map(ex=>{const done3=!!doneEx[ex.id];return<button key={ex.id} className="btn" onClick={()=>setDoneEx(d=>({...d,[ex.id]:!d[ex.id]}))} style={{marginBottom:6}}><div style={{background:done3?`linear-gradient(135deg,${plan.color}18,${plan.color}08)`:"#0f0f1e",border:`1px solid ${done3?plan.color+"66":"#1a1838"}`,borderRadius:10,padding:"11px 12px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${done3?plan.color:"#2a2848"}`,background:done3?plan.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{done3&&<span style={{color:plan.color,fontSize:12,fontWeight:900}}>✓</span>}</div><div style={{flex:1}}><div style={{fontSize:13,color:done3?"#e8dfc0":"#aaa"}}>{ex.name}</div><div style={{fontSize:11,color:plan.color}}>{ex.sets}x {ex.reps} · {ex.rest}</div></div></div><div style={{fontSize:10,color:"#555",paddingLeft:32}}>💡 {ex.tip}</div></div></button>;})}
              <div style={{display:"flex",gap:6,marginTop:4,marginBottom:10}}><button className="tbtn" onClick={()=>{setActiveWorkout(null);setWorkoutView("list");}} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid #2a2848",color:"#666",fontFamily:"Cinzel,serif",fontSize:10}}>CANCELAR</button><button className="tbtn" onClick={finishWorkout} style={{flex:2,padding:"10px",borderRadius:9,background:`linear-gradient(135deg,${plan.color}22,${plan.color}11)`,border:`1px solid ${plan.color}55`,color:plan.color,fontFamily:"Cinzel,serif",fontSize:11}}>✓ CONCLUIR</button></div>
            </div>;})()} 

            {workoutView==="edit"&&editPlan&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div><div style={{fontFamily:"Cinzel,serif",fontSize:11,color:editPlan.color}}>EDITANDO: {editPlan.label}</div><div style={{fontSize:11,color:"#666"}}>{editPlan.exercises.length} exercícios</div></div>
                <div style={{display:"flex",gap:6}}>
                  <button className="tbtn" onClick={()=>{setWorkoutView("list");setEditingPlanKey(null);setEditPlan(null);}} style={{color:"#555",fontFamily:"Cinzel,serif",fontSize:9,border:"1px solid #2a2848",borderRadius:7,padding:"6px 10px"}}>CANCELAR</button>
                  <button className="tbtn" onClick={saveEditPlan} style={{color:editPlan.color,fontFamily:"Cinzel,serif",fontSize:9,border:`1px solid ${editPlan.color}55`,borderRadius:7,padding:"6px 10px",background:`${editPlan.color}22`}}>✓ SALVAR</button>
                </div>
              </div>
              <Card style={{marginBottom:10}}>
                <input className="inp" value={editPlan.label} onChange={e=>setEditPlan(p=>({...p,label:e.target.value}))} placeholder="Nome da ficha" style={{marginBottom:6}}/>
                <input className="inp" value={editPlan.focus} onChange={e=>setEditPlan(p=>({...p,focus:e.target.value}))} placeholder="Foco"/>
              </Card>
              <Lbl>EXERCÍCIOS</Lbl>
              {editPlan.exercises.map((ex,idx)=>(
                <Card key={ex.id} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <input className="inp" value={ex.name} onChange={e=>updateExField(idx,"name",e.target.value)} style={{flex:1,marginRight:8,padding:"6px 9px",fontSize:13}}/>
                    <button className="tbtn" onClick={()=>removeExercise(idx)} style={{color:"#ef4444",fontSize:16,flexShrink:0}}>🗑</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
                    <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>SÉRIES</div><input className="inp" value={ex.sets} onChange={e=>updateExField(idx,"sets",e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                    <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>REPS</div><input className="inp" value={ex.reps} onChange={e=>updateExField(idx,"reps",e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                    <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>DESCANSO</div><input className="inp" value={ex.rest} onChange={e=>updateExField(idx,"rest",e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                  </div>
                  <input className="inp" value={ex.tip} onChange={e=>updateExField(idx,"tip",e.target.value)} placeholder="Dica" style={{fontSize:11,padding:"6px 9px"}}/>
                </Card>
              ))}
              <Card glow="#34d39933" style={{marginBottom:10}}>
                <Lbl color="#34d399">+ ADICIONAR EXERCÍCIO</Lbl>
                <input className="inp" value={newExName} onChange={e=>setNewExName(e.target.value)} placeholder="Nome" style={{marginBottom:6}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:6}}>
                  <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>SÉRIES</div><input className="inp" value={newExSets} onChange={e=>setNewExSets(e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                  <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>REPS</div><input className="inp" value={newExReps} onChange={e=>setNewExReps(e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                  <div><div style={{fontSize:8,color:"#555",marginBottom:2}}>DESCANSO</div><input className="inp" value={newExRest} onChange={e=>setNewExRest(e.target.value)} style={{padding:"6px 8px",fontSize:12}}/></div>
                </div>
                <input className="inp" value={newExTip} onChange={e=>setNewExTip(e.target.value)} placeholder="Dica" style={{marginBottom:9,fontSize:11}}/>
                <button className="sbtn" onClick={addExerciseToEdit} style={{background:"linear-gradient(135deg,#0a2010,#0d2a14)",border:"1px solid #34d39955",color:"#34d399",fontSize:11}}>+ ADICIONAR</button>
              </Card>
            </div>}

            {workoutView==="new"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <Lbl mb={0}>NOVA FICHA</Lbl>
                <button className="tbtn" onClick={()=>setWorkoutView("list")} style={{color:"#555",fontSize:16}}>✕</button>
              </div>
              <Card style={{marginBottom:10}}>
                <input className="inp" value={newPlanName} onChange={e=>setNewPlanName(e.target.value)} placeholder="Nome da ficha" style={{marginBottom:7}}/>
                <input className="inp" value={newPlanFocus} onChange={e=>setNewPlanFocus(e.target.value)} placeholder="Foco" style={{marginBottom:10}}/>
                <Lbl>ÍCONE</Lbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{PLAN_ICONS.map(ic=><button key={ic} className="tbtn" onClick={()=>setNewPlanIcon(ic)} style={{fontSize:22,opacity:newPlanIcon===ic?1:0.3}}>{ic}</button>)}</div>
                <Lbl>COR</Lbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{PLAN_COLORS.map(c=><button key={c} className="tbtn" onClick={()=>setNewPlanColor(c)} style={{width:28,height:28,borderRadius:8,background:c,border:`3px solid ${newPlanColor===c?"#fff":"transparent"}`}}/>)}</div>
                <button className="sbtn" onClick={createNewPlan} style={{background:`linear-gradient(135deg,${newPlanColor}33,${newPlanColor}11)`,border:`1px solid ${newPlanColor}66`,color:newPlanColor,fontSize:12,fontWeight:700}}>✓ CRIAR FICHA</button>
              </Card>
            </div>}
          </>}

          {bodyTab==="corrida"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>{[{l:"Total",v:fmtKm(char.stats.totalKm),i:"📍",c:"#34d399"},{l:"Corridas",v:`${char.stats.totalRuns||0}x`,i:"🏃",c:"#60a5fa"},{l:"Recorde",v:fmtKm(char.stats.prKm),i:"🏅",c:"#f0c040"}].map((s,i)=><Card key={i} style={{padding:"10px",textAlign:"center"}}><div style={{fontSize:17,marginBottom:3}}>{s.i}</div><div style={{fontFamily:"Cinzel,serif",fontSize:13,color:s.c,fontWeight:700}}>{s.v}</div><div style={{fontSize:8,color:"#444",letterSpacing:1,marginTop:1}}>{s.l.toUpperCase()}</div></Card>)}</div>
            <Card glow="#34d39933" style={{marginBottom:10}}><Lbl>REGISTRAR CORRIDA</Lbl><div style={{display:"flex",gap:5,marginBottom:6}}><input className="inp" value={runKm} onChange={e=>setRunKm(e.target.value)} type="number" step="0.1" placeholder="Distância (km)" style={{flex:1}}/><input className="inp" value={runMin} onChange={e=>setRunMin(e.target.value)} type="number" placeholder="Tempo (min)" style={{flex:1}}/></div><div style={{display:"flex",gap:4,marginBottom:8}}>{[2,5,8,10].map(k=><button key={k} className="tbtn" onClick={()=>setRunKm(String(k))} style={{flex:1,padding:"7px 0",borderRadius:7,border:`1px solid ${parseFloat(runKm)===k?"#34d39966":"#2a2848"}`,background:parseFloat(runKm)===k?"#34d39922":"transparent",color:parseFloat(runKm)===k?"#34d399":"#555",fontFamily:"Cinzel,serif",fontSize:9}}>{k}km</button>)}</div>{runKm&&<div style={{marginBottom:8,padding:"6px 10px",background:"#141228",borderRadius:7,display:"flex",justifyContent:"space-between",fontSize:11,color:"#888"}}><span>XP estimado</span><span style={{color:"#34d399",fontFamily:"Cinzel,serif",fontWeight:700}}>+{RUN_XP(parseFloat(runKm)||0)}{parseFloat(runKm)>(char.stats.prKm||0)?" + 20 PR!":""}</span></div>}<button className="sbtn" onClick={logRun} style={{background:"linear-gradient(135deg,#0a2010,#0d2a14)",border:"1px solid #34d39955",color:"#34d399",fontSize:11}}>🏃 REGISTRAR</button></Card>
            {(char.runs||[]).length>0&&(()=>{const now=new Date();const days=[];for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);}const byDay={};(char.runs||[]).forEach(r=>{if(r.date)byDay[r.date]=(byDay[r.date]||0)+r.km;});return<><Lbl>ÚLTIMOS 30 DIAS</Lbl><div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginBottom:10}}>{days.map(d=>{const km2=byDay[d]||0;return<div key={d} style={{height:18,borderRadius:3,background:km2>=10?"#34d399":km2>=5?"#22a374":km2>0?"#115c3f":"#1a1838"}}/>;})}</div></>;})()}
            {(char.runs||[]).length>0&&<><Lbl>HISTÓRICO</Lbl>{(char.runs||[]).slice(0,10).map((r,i)=><div key={i} style={{background:"#0f0f1e",border:`1px solid ${r.pr?"#f0c04044":"#1a1838"}`,borderRadius:9,padding:"8px 12px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:12}}>🏃 <span style={{color:"#888"}}>{r.date}</span></span>{r.pace&&<div style={{fontSize:9,color:"#555"}}>{Math.floor(r.pace/60)}'{r.pace%60}" /km</div>}</div><div style={{display:"flex",gap:7,alignItems:"center"}}>{r.pr&&<span style={{fontSize:8,fontFamily:"Cinzel,serif",color:"#f0c040",background:"#f0c04022",border:"1px solid #f0c04044",borderRadius:5,padding:"1px 5px"}}>PR</span>}<span style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#34d399",fontWeight:700}}>{r.km}km</span><span style={{fontSize:10,color:"#555"}}>+{r.xp}</span></div></div>)}</>}
          </>}

          {bodyTab==="medidas"&&<>
            <Card style={{marginBottom:10}}><Lbl>ALTURA E PESO</Lbl><div style={{display:"flex",gap:5,marginBottom:8}}><input className="inp" value={weightIn} onChange={e=>setWeightIn(e.target.value)} type="number" step="0.1" placeholder={`Peso kg${char.body?.weight?` (${char.body.weight})`:""}`} style={{flex:1}}/><input className="inp" value={heightIn} onChange={e=>setHeightIn(e.target.value)} type="number" placeholder={`Altura cm${char.body?.height?` (${char.body.height})`:""}`} style={{flex:1}}/></div><button className="sbtn" onClick={saveBodyStats} style={{background:"linear-gradient(135deg,#0a2010,#0d2a14)",border:"1px solid #34d39955",color:"#34d399",fontSize:11}}>💾 SALVAR</button></Card>
            {bmi&&<Card glow={bmiC.c+"44"} style={{marginBottom:10,textAlign:"center",padding:"20px 14px"}}><Lbl mb={8}>IMC</Lbl><div style={{fontFamily:"Cinzel,serif",fontSize:48,fontWeight:900,color:bmiC.c,textShadow:`0 0 20px ${bmiC.c}66`}}>{bmi}</div><div style={{fontFamily:"Cinzel,serif",fontSize:14,color:bmiC.c,marginBottom:8}}>{bmiC.l}</div><div style={{height:8,background:"#1a1838",borderRadius:4,overflow:"hidden",marginBottom:12}}><div style={{height:"100%",width:`${Math.min(100,Math.max(0,((bmi-10)/30)*100))}%`,background:`linear-gradient(90deg,${bmiC.c}77,${bmiC.c})`,borderRadius:4}}/></div><div style={{fontSize:12,color:"#888"}}>{bmiC.t}</div><div style={{display:"flex",justifyContent:"space-around",marginTop:14}}>{[{l:"PESO",v:`${char.body.weight}kg`},{l:"ALTURA",v:`${char.body.height}cm`}].map((s,i)=><div key={i}><div style={{fontFamily:"Cinzel,serif",fontSize:16,color:"#e8dfc0"}}>{s.v}</div><div style={{fontSize:9,color:"#555"}}>{s.l}</div></div>)}</div></Card>}
            <Card><Lbl>TABELA IMC</Lbl>{[["< 18.5","Abaixo do peso","#60a5fa"],[" 18.5 – 24.9","Peso ideal ✓","#22c55e"],["25 – 29.9","Sobrepeso","#f59e0b"],["30 – 34.9","Obesidade I","#f97316"],["≥ 35","Obesidade II+","#ef4444"]].map(([r,l,c],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:"#777"}}>{r}</span><span style={{fontSize:11,color:c,fontFamily:"Cinzel,serif"}}>{l}</span></div>)}</Card>
          </>}
        </div>}

        {/* ── LIFE ── */}
        {tab==="life"&&<div style={{padding:"12px 12px 0"}}>
          <STabs tabs={[{id:"financeiro",i:"💰",l:"Finanças",c:"#22c55e"},{id:"conquistas",i:"🏆",l:"Conquistas",c:"#f0c040"},{id:"stats",i:"📊",l:"Stats",c:"#60a5fa"},{id:"perfil",i:"👤",l:"Perfil",c:"#a78bfa"}]} val={lifeTab} onChange={setLifeTab}/>

          {lifeTab==="financeiro"&&<>
            <Card glow="#22c55e33" style={{marginBottom:10}}>
              <Lbl mb={6}>SALÁRIO MENSAL</Lbl>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                <div style={{position:"relative",flex:1}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:13,pointerEvents:"none"}}>R$</span>
                  <input
                    className="inp"
                    value={salaryIn||String(salary)}
                    onChange={e=>setSalaryIn(e.target.value)}
                    onFocus={e=>setSalaryIn(String(salary))}
                    type="number"
                    placeholder="Seu salário"
                    style={{paddingLeft:36,fontSize:18,fontFamily:"Cinzel,serif",color:"#22c55e",fontWeight:700}}
                  />
                </div>
                <button onClick={saveSalary} style={{padding:"10px 16px",borderRadius:9,background:"linear-gradient(135deg,#0a2010,#0d2a14)",border:"1px solid #22c55e55",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:10,cursor:"pointer",flexShrink:0,letterSpacing:1}}>✓ SALVAR</button>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,color:"#555"}}>Disponível agora</span>
                <span style={{fontFamily:"Cinzel,serif",fontSize:15,color:availableNow>=0?"#22c55e":"#ef4444",fontWeight:700}}>{curr(availableNow)}</span>
              </div>
              <div style={{height:8,background:"#1a1838",borderRadius:4,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",width:`${Math.min(100,(paidExp/Math.max(salary,1))*100)}%`,background:"linear-gradient(90deg,#22c55e77,#22c55e)",borderRadius:4,transition:"width 0.5s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#555"}}>
                <span>Pago: {curr(paidExp)} · A pagar: {curr(unpaidExp)}</span>
                <span>Total: {curr(totalExp)}</span>
              </div>
            </Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl mb={0}>GASTOS E CONTAS</Lbl><button className="tbtn" onClick={()=>setAddingExp(v=>!v)} style={{background:"#0a2010",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:7,padding:"4px 10px",fontFamily:"Cinzel,serif",fontSize:8}}>+ ADICIONAR</button></div>
            {addingExp&&<Card style={{marginBottom:10}}><Lbl>NOVO GASTO</Lbl><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>{["🍽️","📱","🌐","💳","🏠","🎮","💊","📚","✈️","🎵","⛽","💄"].map(ic=><button key={ic} className="tbtn" onClick={()=>setNewExpIcon(ic)} style={{fontSize:17,opacity:newExpIcon===ic?1:0.3}}>{ic}</button>)}</div><input className="inp" value={newExpName} onChange={e=>setNewExpName(e.target.value)} placeholder="Nome do gasto" style={{marginBottom:5}}/><input className="inp" value={newExpAmt} onChange={e=>setNewExpAmt(e.target.value)} type="number" placeholder="Valor (R$)" style={{marginBottom:5}}/><div style={{display:"flex",gap:5,marginBottom:9}}><input className="inp" value={newExpInst} onChange={e=>setNewExpInst(e.target.value)} type="number" placeholder="Parcela atual" style={{flex:1}}/><input className="inp" value={newExpTotal} onChange={e=>setNewExpTotal(e.target.value)} type="number" placeholder="Total parcelas" style={{flex:1}}/></div><div style={{display:"flex",gap:5}}><button className="tbtn" onClick={()=>setAddingExp(false)} style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #2a2848",color:"#666",fontFamily:"Cinzel,serif",fontSize:9}}>CANCELAR</button><button className="tbtn" onClick={addExpense} style={{flex:2,padding:"9px",borderRadius:8,background:"linear-gradient(135deg,#0a2010,#0d2a14)",border:"1px solid #22c55e55",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:10}}>✓ ADICIONAR</button></div></Card>}
            {expenses.map(exp=><div key={exp.id} style={{background:exp.paid?"linear-gradient(135deg,#0a2010,#0d2a14)":"#0f0f1e",border:`1px solid ${exp.paid?"#22c55e44":"#1a1838"}`,borderRadius:11,padding:"11px 12px",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:9}}><button className="tbtn" onClick={()=>togglePaid(exp.id)} style={{width:22,height:22,borderRadius:5,border:`2px solid ${exp.paid?"#22c55e":"#2a2848"}`,background:exp.paid?"#22c55e33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{exp.paid&&<span style={{color:"#22c55e",fontSize:11,fontWeight:900}}>✓</span>}</button><span style={{fontSize:18}}>{exp.icon}</span><div style={{flex:1}}><div style={{fontSize:13,color:exp.paid?"#aaa":"#e8dfc0",textDecoration:exp.paid?"line-through":"none"}}>{exp.name}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:1}}>{exp.installments&&<div style={{fontSize:10,color:"#a78bfa"}}>📋 {exp.installments.current}/{exp.installments.total}x{exp.installments.current<exp.installments.total&&<button className="tbtn" onClick={()=>advanceInstallment(exp.id)} style={{marginLeft:4,fontSize:9,color:"#a78bfa",border:"1px solid #a78bfa44",borderRadius:4,padding:"1px 5px",fontFamily:"Cinzel,serif"}}>+1</button>}</div>}<span style={{fontSize:10,color:"#555"}}>+{FIN_XP(exp.amount)} XP</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><span style={{fontFamily:"Cinzel,serif",fontSize:13,color:exp.paid?"#22c55e":"#e8dfc0"}}>{curr(exp.amount)}</span><button className="tbtn" onClick={()=>removeExpense(exp.id)} style={{color:"#333",fontSize:11}}>✕</button></div></div></div>)}
          </>}

          {lifeTab==="conquistas"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"Cinzel,serif",fontSize:10,color:"#f0c040"}}>{unlockedCount}/{ACHIEVEMENTS.length} desbloqueadas</div>
              <div style={{height:5,width:120,background:"#1a1838",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct(unlockedCount,ACHIEVEMENTS.length)}%`,background:"linear-gradient(90deg,#f0c04077,#f0c040)",borderRadius:3}}/></div>
            </div>
            {/* Category filter */}
            <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
              {["all","streak","estudo","questoes","treino","corrida","livros","boss","nivel"].map(c=>(
                <button key={c} className="tbtn" onClick={()=>setAchCat(c)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${achCat===c?"#f0c04066":"#2a2848"}`,background:achCat===c?"#1a1400":"transparent",color:achCat===c?"#f0c040":"#444",fontFamily:"Cinzel,serif",fontSize:8,letterSpacing:1}}>
                  {c==="all"?"TODOS":c.toUpperCase()}
                </button>
              ))}
            </div>
            {ACHIEVEMENTS.filter(a=>achCat==="all"||a.cat===achCat).map(ach=>{
              const unlocked=(char.unlockedAch||[]).includes(ach.id);
              return<div key={ach.id} style={{background:unlocked?"linear-gradient(135deg,#1a1000,#2a1e00)":"#0f0f1e",border:`1px solid ${unlocked?"#f0c04055":"#1a1838"}`,borderRadius:11,padding:"11px 13px",marginBottom:6,display:"flex",alignItems:"center",gap:10,opacity:unlocked?1:0.5,animation:unlocked?"none":"none"}}>
                <div style={{fontSize:24,filter:unlocked?"none":"grayscale(1)",flexShrink:0}}>{ach.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:unlocked?"#e8dfc0":"#666",fontFamily:unlocked?"Cinzel,serif":"inherit"}}>{ach.name}</div>
                  <div style={{fontSize:10,color:"#555"}}>{ach.desc}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"Cinzel,serif",fontSize:11,color:unlocked?"#f0c040":"#333"}}>+{ach.xp} XP</div>
                  {unlocked&&<div style={{fontSize:8,color:"#22c55e",fontFamily:"Cinzel,serif"}}>✓ DESBLOQ.</div>}
                </div>
              </div>;
            })}
          </>}

          {lifeTab==="stats"&&<>
            <STabs tabs={[{id:"xp",i:"⚡",l:"XP",c:"#f0c040"},{id:"geral",i:"📊",l:"Geral",c:"#60a5fa"}]} val={statsTab} onChange={setStatsTab}/>
            {statsTab==="xp"&&<>
              <Card style={{marginBottom:10}}>
                <MiniBarChart data={last7} color="#f0c040" height={80} label="XP GANHO — ÚLTIMOS 7 DIAS"/>
              </Card>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                {[{l:"Total XP",v:char.totalXP.toLocaleString(),c:"#f0c040",i:"⭐"},{l:"Nível",v:cur.lv,c:cur.color,i:"⬆️"},{l:"Streak",v:`${streak}d`,c:"#f97316",i:"🔥"},{l:"Multiplier",v:`×${multi.toFixed(2)}`,c:"#a78bfa",i:"✨"}].map((s,i)=>(
                  <Card key={i} style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{s.i}</div><div style={{fontFamily:"Cinzel,serif",fontSize:15,color:s.c,fontWeight:700}}>{s.v}</div><div style={{fontSize:9,color:"#444",letterSpacing:1,marginTop:1}}>{s.l.toUpperCase()}</div></Card>
                ))}
              </div>
            </>}
            {statsTab==="geral"&&<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[
                  {l:"Horas de estudo",v:`${char.stats.totalStudyHours||0}h`,c:"#60a5fa",i:"📚"},
                  {l:"Questões",v:(char.stats.totalQuestions||0).toLocaleString(),c:"#a78bfa",i:"🎯"},
                  {l:"Treinos",v:`${char.stats.totalWorkouts||0}x`,c:"#ef4444",i:"💪"},
                  {l:"Km rodados",v:fmtKm(char.stats.totalKm),c:"#34d399",i:"🏃"},
                  {l:"Livros lidos",v:`${char.stats.booksFinished||0}`,c:"#f0c040",i:"📖"},
                  {l:"Bosses",v:`${char.stats.bossesCleared||0}`,c:"#8b5cf6",i:"👹"},
                  {l:"Simulados",v:`${(char.simulados||[]).length}`,c:"#f97316",i:"📋"},
                  {l:"Hábitos",v:`${(char.habits||[]).length}`,c:"#34d399",i:"🌱"},
                ].map((s,i)=>(
                  <Card key={i} style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{s.i}</div><div style={{fontFamily:"Cinzel,serif",fontSize:16,color:s.c,fontWeight:700}}>{s.v}</div><div style={{fontSize:8,color:"#444",letterSpacing:1,marginTop:1}}>{s.l.toUpperCase()}</div></Card>
                ))}
              </div>
              <Card style={{marginTop:10}}>
                <Lbl mb={8}>ESTUDO POR MATÉRIA (HORAS)</Lbl>
                {subjectChartData.some(d=>d.v>0)?<div style={{display:"flex",alignItems:"flex-end",gap:3,height:60}}>
                  {subjectChartData.map((d,i)=>{const mx2=Math.max(...subjectChartData.map(x=>x.v),0.1);return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:"100%",height:Math.max(2,(d.v/mx2)*48),background:d.v>0?d.color:"#1a1838",borderRadius:"3px 3px 0 0"}}/>
                    <div style={{fontSize:6,color:"#444",fontFamily:"Cinzel,serif"}}>{d.l}</div>
                  </div>;})}
                </div>:<div style={{fontSize:11,color:"#444",textAlign:"center",padding:"10px 0"}}>Registre sessões de estudo</div>}
              </Card>
            </>}

            {/* Export, Import & Notif */}
            <input ref={importRef} type="file" accept=".json" onChange={importData} style={{display:"none"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:12}}>
              <button className="tbtn" onClick={exportData} style={{padding:"11px",borderRadius:10,background:"#0a2010",border:"1px solid #22c55e44",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:1}}>📤 EXPORTAR</button>
              <button className="tbtn" onClick={()=>importRef.current?.click()} style={{padding:"11px",borderRadius:10,background:"#0a1a0a",border:"1px solid #22c55e66",color:"#22c55e",fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:1}}>📥 IMPORTAR</button>
              <button className="tbtn" onClick={requestNotif} style={{padding:"11px",borderRadius:10,background:"#0a0a1e",border:"1px solid #60a5fa44",color:"#60a5fa",fontFamily:"Cinzel,serif",fontSize:10,letterSpacing:1,gridColumn:"1/-1"}}>🔔 ATIVAR NOTIFICAÇÕES INTELIGENTES</button>
            </div>
            <div style={{marginTop:8,fontSize:9,color:"#333",fontFamily:"Cinzel,serif",textAlign:"center",letterSpacing:1}}>Notificações: streak em risco, treino parado, boss semanal</div>
          </>}

          {lifeTab==="perfil"&&<>
            <Card style={{marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:12}}><div onClick={()=>setShowAvatarEditor(v=>!v)} style={{cursor:"pointer",flexShrink:0}}><AvatarSVG {...(char.avatar||{})} size={70}/><div style={{fontSize:8,color:"#555",textAlign:"center",marginTop:2}}>toque para editar</div></div><div style={{flex:1}}>{editingUsername?<div><input className="inp" value={usernameIn} onChange={e=>setUsernameIn(e.target.value)} placeholder="Seu nome" style={{marginBottom:6}}/><div style={{display:"flex",gap:5}}><button className="tbtn" onClick={saveUsername} style={{flex:1,padding:"7px",borderRadius:7,background:"#f0c04022",border:"1px solid #f0c04055",color:"#f0c040",fontFamily:"Cinzel,serif",fontSize:9}}>✓ SALVAR</button><button className="tbtn" onClick={()=>setEditingUsername(false)} style={{padding:"7px 10px",borderRadius:7,border:"1px solid #2a2848",color:"#555",fontSize:11}}>✕</button></div></div>:<button className="tbtn" onClick={()=>{setEditingUsername(true);setUsernameIn(char.username||"");}} style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontFamily:"Cinzel,serif",fontSize:18,color:"#f0c040",letterSpacing:2}}>{char.username||"Jogador"}</span><span style={{fontSize:10,color:"#444"}}>✎</span></button>}<div style={{fontSize:10,color:"#a78bfa",fontFamily:"Cinzel,serif"}}>{dynTitle.icon} {dynTitle.title}</div><div style={{fontSize:10,color:"#555",marginTop:3}}>Lv.{cur.lv} · {cur.title} · {char.totalXP.toLocaleString()} XP</div></div></div></Card>
            <Lbl>ROADMAP — 20 NÍVEIS</Lbl>
            {LEVELS.map(lvl=>{const tU=timeUnlocked(lvl.months),xpOk=char.totalXP>=lvl.xp,isCur=cur.lv===lvl.lv,isPast=cur.lv>lvl.lv,uDate=unlockDate(lvl.months);return<div key={lvl.lv} style={{background:isCur?`linear-gradient(135deg,${lvl.color}18,${lvl.color}08)`:"#0f0f1e",border:`1px solid ${isCur?lvl.color+"66":isPast?"#2a2848":"#1a1838"}`,borderRadius:9,padding:"8px 12px",marginBottom:4,display:"flex",alignItems:"center",gap:9,opacity:!tU?0.4:1}}><div style={{fontFamily:"Cinzel,serif",fontWeight:900,fontSize:13,color:isPast?lvl.color:tU?"#e8dfc0":"#444",width:22,textAlign:"center",flexShrink:0}}>{isPast?"✓":tU?lvl.lv:"🔒"}</div><div style={{flex:1,minWidth:0}}><div style={{fontFamily:"Cinzel,serif",fontSize:10,color:tU?"#e8dfc0":"#444"}}>{lvl.title}</div><div style={{fontSize:9,color:"#444"}}>{lvl.xp.toLocaleString()} XP</div>{!tU&&<div style={{fontSize:8,color:"#f0c04055",fontFamily:"Cinzel,serif"}}>🔒 {uDate.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})} ({daysLeft(uDate)}d)</div>}{tU&&!xpOk&&!isPast&&<div style={{fontSize:8,color:"#a78bfa77"}}>Faltam {(lvl.xp-char.totalXP).toLocaleString()} XP</div>}</div>{isCur&&<div style={{fontSize:7,fontFamily:"Cinzel,serif",color:lvl.color,border:`1px solid ${lvl.color}55`,borderRadius:4,padding:"2px 5px",flexShrink:0}}>ATUAL</div>}</div>;})}
          </>}
        </div>}

      </div>

      {/* NAV */}
      <div style={{position:"fixed",bottom:0,left:0,width:"100%",background:"#09080f",borderTop:"1px solid #181530",display:"flex",justifyContent:"space-around",padding:"6px 0 10px",zIndex:100,flexShrink:0}}>
        {[
          {id:"home",i:"🏠",l:"Home",always:true},
          {id:"daily",i:"⚔️",l:"Daily",always:true},
          {id:"study",i:"📚",l:"Estudar",mod:"estudo"},
          {id:"body",i:"💪",l:"Treino",mod:"treino"},
          {id:"life",i:"💵",l:"Life",always:true},
        ].filter(t=>t.always||hasModule(t.mod)).map(t=>(
          <button key={t.id} className="tbtn" onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"3px 9px",borderRadius:9,background:tab===t.id?"#1a1535":"transparent",position:"relative"}}>
            {t.id==="study"&&weakSubs.length>0&&<div style={{position:"absolute",top:0,right:5,width:6,height:6,borderRadius:"50%",background:"#ef4444"}}/>}
            {t.id==="life"&&(char.friendRequests||[]).length>0&&<div style={{position:"absolute",top:0,right:5,width:6,height:6,borderRadius:"50%",background:"#f0c040"}}/>}
            <div style={{fontSize:19}}>{t.i}</div>
            <div style={{fontFamily:"Cinzel,serif",fontSize:7,letterSpacing:1,color:tab===t.id?"#f0c040":"#3a3555"}}>{t.l.toUpperCase()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
