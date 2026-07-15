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
// ── CRONOGRAMA ──
const CRON_WEEK = [
  { dow:0, tipo:"rest",   icon:"💤", materia:"Descanso",                            sub:"Revisão rápida opcional (20 min)"              },
  { dow:1, tipo:"shared", icon:"📝", materia:"Língua Portuguesa",                    sub:"Interpretação · gramática · coesão · redação"  },
  { dow:2, tipo:"shared", icon:"🧩", materia:"Matemática + Raciocínio Lógico",        sub:"Mat. Financeira → aritmética · Lógica (Bomb)" },
  { dow:3, tipo:"bb",     icon:"🏦", materia:"Conhecimentos Bancários + Atualidades", sub:"SFN · produtos bancários · mercado financeiro" },
  { dow:4, tipo:"bb",     icon:"🌎", materia:"Inglês + Redação",                      sub:"Leitura instrumental · dissertação"            },
  { dow:5, tipo:"shared", icon:"💻", materia:"Informática + Atualidades",              sub:"Office · redes · segurança · notícias"        },
  { dow:6, tipo:"bomb",   icon:"🚒", materia:null,                                    sub:"Rodízio mensal — 4 matérias"                  },
];
const CRON_BOMB = [
  { nome:"Física",                 icon:"⚛️", tip:"Vantagem UFRPE ✅"       },
  { nome:"Biologia + Atualidades", icon:"🧬", tip:"Ciências + notícias"    },
  { nome:"Direito Constitucional", icon:"⚖️", tip:"CF/88 — arts. principais"},
  { nome:"Hist. de Pernambuco",    icon:"🏛️", tip:"Formação histórica"     },
];
const CRON_PHASES = [
  { n:1, label:"Base Sólida",    qMeta:8,  periodo:"Meses 1–2", cor:"#1d4ed8" },
  { n:2, label:"Específicos BB", qMeta:12, periodo:"Meses 3–4", cor:"#16a34a" },
  { n:3, label:"Consolidação",   qMeta:18, periodo:"Mês 5+",    cor:"#7c3aed" },
];
const CRON_XP = { teoria:15, questoes:20, revisao:10, full:30 };
const CRON_ZERO = { phase:1, bomb_week:0, date:"", teoria:false, questoes:false, revisao:false, q_count:0, xp_day:0 };

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
  cronograma: { ...CRON_ZERO },
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
          cronograma: { ...CRON_ZERO, ...(c.cronograma||{}) },
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

  // ── GERAR ID FIREBASE ──
  const generateFirebaseUid=async()=>{
    const c=charRef.current;
    if(c.firebaseUid) return; // already has one
    const fbUid=`usr_${uid()}`;
    const nc={...c,firebaseUid:fbUid,friends:c.friends||[],friendRequests:c.friendRequests||[]};
    charRef.current=nc;setChar(nc);await save(nc,null,null);
    try{ fbSaveProfile(fbUid,{...nc,level:getLvl(nc.totalXP).cur.lv}); }catch(_){}
    showToast("ID gerado! ✓","#22c55e");
  };

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
// ── HANDLERS CRONOGRAMA ──
const cronToday = () => {
  const cron = { ...CRON_ZERO, ...(charRef.current?.cronograma || {}) };
  return cron.date === todayStr()
    ? cron
    : { ...cron, date: todayStr(), teoria: false, questoes: false, revisao: false, q_count: 0, xp_day: 0 };
};

const toggleCronTask = async (task) => {
  const c = charRef.current;
  const dow = new Date().getDay();
  const cron = cronToday();
  const wasAll = cron.teoria && cron.questoes && cron.revisao;
  const newVal = !cron[task];
  const updated = { ...cron, [task]: newVal };
  const nowAll = updated.teoria && updated.questoes && updated.revisao;
  let xpDelta = newVal ? CRON_XP[task] : -CRON_XP[task];
  if (nowAll && !wasAll)  xpDelta += CRON_XP.full;
  if (!nowAll && wasAll)  xpDelta -= CRON_XP.full;
  updated.xp_day = Math.max(0, (cron.xp_day || 0) + xpDelta);
  if (nowAll && !wasAll && dow === 6)
    updated.bomb_week = ((cron.bomb_week || 0) + 1) % 4;
  const newXP = Math.max(0, c.totalXP + xpDelta);
  let nc = { ...c, totalXP: newXP, cronograma: updated };
  nc = await checkAndAwardAch(nc);
  charRef.current = nc; setChar(nc);
  if (xpDelta !== 0) addFloat(xpDelta);
  triggerLvl(c.totalXP, newXP);
  await save(nc, null, null);
};

const adjustCronQ = async (delta) => {
  const c = charRef.current;
  const cron = cronToday();
  const q = Math.max(0, Math.min(99, (cron.q_count || 0) + delta));
  const nc = { ...c, cronograma: { ...cron, q_count: q } };
  charRef.current = nc; setChar(nc);
  await save(nc, null, null);
};

const setCronPhase = async (p) => {
  const c = charRef.current;
  const nc = { ...c, cronograma: { ...(c.cronograma || CRON_ZERO), phase: p } };
  charRef.current = nc; setChar(nc);
  await save(nc, null, null);
  showToast(`Fase ${p} ativa!`, CRON_PHASES[p - 1]?.cor || "#f0c040");
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
            <div key={i} style={{display:"flex
