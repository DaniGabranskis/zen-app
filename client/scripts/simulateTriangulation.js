// client/scripts/simulateTriangulation.js
// Node.js simulation of the triangulation flow to evaluate accuracy and balance.

const FAMS = ["AT","FA","OS","DC","J","CCG"];

const TAG2W = {
  Anxious:{AT:1.0,DC:0.2}, Tension:{AT:0.8,OS:0.2}, Frustration:{FA:1.0,OS:0.2},
  Anger:{FA:1.0}, Overload:{OS:1.0,AT:0.2}, Sadness:{OS:0.9,DC:0.2},
  Tired:{OS:0.7}, Disconnected:{DC:1.0}, Confusion:{DC:0.8,AT:0.3},
  Joy:{J:1.0,CCG:0.2}, Calm:{CCG:0.8,J:0.2}, Clarity:{CCG:0.8,J:0.2}, Gratitude:{CCG:0.9,J:0.3}
};

const GEN = { // prob. of negative on L1 and L2 per true family
  AT:{mood:0.85, body:0.75, energy:0.65, social:0.55, mind:0.80, load:0.55},
  FA:{mood:0.85, body:0.55, energy:0.55, social:0.45, mind:0.60, load:0.60},
  OS:{mood:0.90, body:0.65, energy:0.75, social:0.55, mind:0.55, load:0.80},
  DC:{mood:0.75, body:0.45, energy:0.55, social:0.80, mind:0.70, load:0.60},
  J:{mood:0.20, body:0.20, energy:0.20, social:0.20, mind:0.20, load:0.20},
  CCG:{mood:0.25, body:0.25, energy:0.25, social:0.25, mind:0.25, load:0.25}
};

function rnd(){ return Math.random(); }

function initBelief(prior){
  if (!prior) {
    const p = 1/FAMS.length;
    return {AT:p,FA:p,OS:p,DC:p,J:p,CCG:p};
  }
  const s = FAMS.reduce((acc,f)=>acc+(prior[f]||0),0)||1;
  const b = {}; FAMS.forEach(f=> b[f] = (prior[f]||0)/s); return b;
}

function updateBelief(belief, tags){
  const b = {...belief};
  for (const t of tags) {
    const w = TAG2W[t] || {};
    FAMS.forEach(f => b[f] *= (1 + (w[f] || 0)));
  }
  const s = FAMS.reduce((acc,f)=> acc + b[f], 0) || 1;
  FAMS.forEach(f => b[f] = b[f]/s);
  return b;
}
const confidence = (b) => Math.max(...FAMS.map(f=>b[f]));
const topFam = (b) => FAMS.reduce((best,f)=> b[f]>b[best]?f:best, FAMS[0]);

const PROBES = {
  PR_AT_OS: { left:{AT:["Anxious","Tension"]}, right:{OS:["Overload","Tired"]} },
  PR_AT_DC: { left:{AT:["Anxious","Tension"]}, right:{DC:["Disconnected","Confusion"]} },
  PR_FA_OS: { left:{FA:["Frustration","Anger"]}, right:{OS:["Overload","Sadness"]} },
  PR_OS_DC: { left:{OS:["Overload","Sadness","Tired"]}, right:{DC:["Disconnected","Confusion"]} },
  PR_J_CCG: { left:{J:["Joy"]}, right:{CCG:["Calm","Clarity","Gratitude"]} },
  PR_AT_FA: { left:{AT:["Anxious","Tension"]}, right:{FA:["Frustration","Anger"]} },
  PR_POS_NEG: { left:{POS:["Joy","Calm","Clarity"]}, right:{NEG:["Overload","Sadness","Anxious","Tension","Disconnected"]} }
};
const PROBE_MAP = {"AT-OS":"PR_AT_OS","AT-DC":"PR_AT_DC","FA-OS":"PR_FA_OS","OS-DC":"PR_OS_DC","J-CCG":"PR_J_CCG","AT-FA":"PR_AT_FA"};

function chooseProbe(belief){
  const ranked = [...FAMS].sort((a,b)=> belief[b]-belief[a]);
  const a = ranked[0], b = ranked[1];
  const key = [a,b].sort().join("-");
  return PROBE_MAP[key] || "PR_POS_NEG";
}

function genTagsL1L2(trueF){
  const p = GEN[trueF], tags=[];
  const moodNeg = rnd()<p.mood; tags.push(...(moodNeg?["Anxious","Tension","Sadness"]:["Joy","Calm","Clarity"]));
  const bodyTen = rnd()<p.body; tags.push(...(bodyTen?["Tension"]:["Calm"]));
  const lowEn   = rnd()<p.energy; tags.push(...(lowEn?["Tired","Sadness"]:["Clarity","Joy"]));
  const disc    = rnd()<p.social; tags.push(...(disc?["Disconnected"]:["Joy","Calm"]));
  const mindNeg = rnd()<p.mind; tags.push(...(mindNeg?["Anxious","Confusion"]:["Clarity"]));
  const loadNeg = rnd()<p.load; tags.push(...(loadNeg?["Overload","Tension"]:["Calm","Clarity"]));
  return tags;
}

function runSession(trueF, prior, confThr=0.58, maxProbes=2, probeCorrect=0.75){
  let belief = initBelief(prior);
  belief = updateBelief(belief, genTagsL1L2(trueF));
  let probes = 0;

  while (confidence(belief) < confThr && probes < maxProbes) {
    const pid = chooseProbe(belief);
    const pr = PROBES[pid];
    let pickLeft;
    if (pr.left[trueF]) pickLeft = rnd() < probeCorrect;
    else if (pr.right[trueF]) pickLeft = rnd() < (1 - probeCorrect);
    else if (pid === "PR_POS_NEG") {
      const isPos = trueF === "J" || trueF === "CCG";
      pickLeft = rnd() < (isPos ? probeCorrect : 1 - probeCorrect);
    } else pickLeft = rnd() < 0.5;

    const chosenTags = Object.values(pickLeft ? pr.left : pr.right)[0];
    belief = updateBelief(belief, chosenTags);
    probes++;
  }

  return { pred: topFam(belief), conf: confidence(belief), probes };
}

function simulate(n=20000, balanced=false, baseDist=null){
  const base = baseDist || Object.fromEntries(FAMS.map(f=>[f,1/FAMS.length]));
  const pickTrue = () => {
    let r = rnd(), acc=0;
    for (const f of FAMS){ acc += base[f]; if (r<=acc) return f; }
    return FAMS[FAMS.length-1];
  };

  const histPred = Object.fromEntries(FAMS.map(f=>[f,0]));
  const histTrue = Object.fromEntries(FAMS.map(f=>[f,0]));
  let acc=0, probes=0, confSum=0;
  const priorCounts = Object.fromEntries(FAMS.map(f=>[f,0]));

  for (let i=0;i<n;i++){
    const trueF = pickTrue();
    let prior = null;
    if (balanced) {
      const w = Object.fromEntries(FAMS.map(f=>[f, 1/(1+priorCounts[f]) ]));
      const s = FAMS.reduce((x,f)=>x+w[f],0);
      prior = Object.fromEntries(FAMS.map(f=>[f, w[f]/s ]));
    }
    const {pred, conf, probes:pb} = runSession(trueF, prior);
    histPred[pred]++; histTrue[trueF]++;
    if (pred===trueF) acc++;
    probes += pb; confSum += conf;
    if (balanced) priorCounts[pred]++;
  }

  return {
    accuracy: acc/n,
    avgProbes: probes/n,
    avgConf: confSum/n,
    pred: histPred,
    true: histTrue
  };
}

function pct(n, d){ return (100*n/d).toFixed(2)+"%"; }

function printDist(label, dist){
  const total = Object.values(dist).reduce((a,b)=>a+b,0) || 1;
  console.log(label);
  for (const f of FAMS) console.log(`  ${f}: ${dist[f]}  ${pct(dist[f], total)}`);
}

const n = Number((process.argv.find(a=>a.startsWith("--n="))||"").split("=")[1] || 20000);
const balanced = process.argv.includes("--balanced");

const out = simulate(n, balanced);
console.log("\n=== Triangulation Simulation ===");
console.log(`mode: ${balanced? "balanced-prior":"uniform-prior"}   N=${n}`);
console.log(`accuracy: ${(out.accuracy*100).toFixed(2)}%   avg_probes: ${out.avgProbes.toFixed(3)}   avg_conf: ${out.avgConf.toFixed(3)}`);
printDist("Predicted distribution:", out.pred);
printDist("True distribution:", out.true);
