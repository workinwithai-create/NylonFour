// NylonFour — audio-clock scheduler, live FluidR3 nylon samples
const SAMPLE_BASE = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@044fab8e1456bfafc5776e86dfd6bb8697149aef/FluidR3_GM/acoustic_guitar_nylon-mp3/';
const NOTES = ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'];
const state = {
  bpm: 92,
  key: 'Am',
  chords: ['Am','F','C','G'],
  recipe: 'travis',
  playing: false,
  bars: 4
};
let ctx = null;
let master = null;
let compressor = null;
let samples = {}; // note -> AudioBuffer
let activeSources = [];
let nextStepTime = 0;
let step = 0;
let timerId = null;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

const overlay = document.getElementById('tap-overlay');
const statusEl = document.getElementById('status');
const barsEl = document.getElementById('bars');

function noteToMidi(note) {
  const map = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const m = note.match(/([A-G])(#|b)?(\d)/);
  if (!m) return 60;
  let n = map[m[1]] + (m[2]==='#'?1:m[2]==='b'?-1:0) + (parseInt(m[3])+1)*12;
  return n;
}

async function loadSamples() {
  if (!ctx) return;
  statusEl.textContent = 'Loading 0/' + NOTES.length;
  let loaded = 0;
  const promises = NOTES.map(async note => {
    try {
      const res = await fetch(SAMPLE_BASE + note + '.mp3');
      if (!res.ok) throw new Error(note);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      samples[note] = buf;
      loaded++;
      statusEl.textContent = 'Loading ' + loaded + '/' + NOTES.length;
    } catch (e) {
      statusEl.textContent = 'Missing: ' + note;
      throw e;
    }
  });
  await Promise.all(promises);
  statusEl.textContent = 'Ready — nylon guitar loaded';
}

function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -1;
  compressor.knee.value = 0;
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  loadSamples();
}

overlay.addEventListener('click', () => {
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
  overlay.classList.add('hidden');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.playing) stop();
});

function parseChords(str) {
  return str.trim().split(/\s+/).slice(0,4);
}

function chordToNotes(chord, key) {
  const roots = {C:60,D:62,E:64,F:65,G:67,A:69,B:71};
  const rootName = chord.replace(/m|7|maj|dim|sus.*/, '');
  let root = roots[rootName[0]] || 60;
  if (rootName.includes('#')) root += 1;
  if (rootName.includes('b')) root -= 1;
  const isMinor = chord.includes('m') && !chord.includes('maj');
  const third = root + (isMinor ? 3 : 4);
  const fifth = root + 7;
  return [root, third, fifth].map(m => {
    let best = NOTES[0], bestDiff = 99;
    NOTES.forEach(n => {
      const diff = Math.abs(noteToMidi(n) - m);
      if (diff < bestDiff) { bestDiff = diff; best = n; }
    });
    return best;
  });
}

function getRiffPattern(recipe, step, chordNotes) {
  const bar = Math.floor(step / 16);
  const pos = step % 16;
  const notes = chordNotes[bar % chordNotes.length] || chordNotes[0];
  if (recipe === 'travis') {
    if (pos % 4 === 0) return [notes[0]];
    if (pos % 4 === 2) return [notes[1] || notes[0]];
    if (pos === 7 || pos === 15) return [notes[2] || notes[0]];
    return [];
  }
  if (recipe === 'arpeggio') {
    const idx = Math.floor(pos / 4) % notes.length;
    return pos % 4 === 0 ? [notes[idx]] : [];
  }
  if (recipe === 'ostinato') {
    return pos % 2 === 0 ? [notes[pos % notes.length]] : [];
  }
  if (pos === 0 || pos === 8) return [notes[0]];
  if (pos === 4) return [notes[1] || notes[0]];
  return [];
}

function scheduleStep(s, time) {
  const chordNotes = state.chords.map(c => chordToNotes(c, state.key));
  const hits = getRiffPattern(state.recipe, s, chordNotes);
  hits.forEach(noteName => {
    if (!samples[noteName]) return;
    const src = ctx.createBufferSource();
    src.buffer = samples[noteName];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.6, time + 0.01);
    g.gain.linearRampToValueAtTime(0, time + 0.25);
    src.connect(g);
    g.connect(master);
    src.start(time);
    src.stop(time + 0.3);
    activeSources.push(src);
  });
}

function scheduler() {
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(step, nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    nextStepTime += stepDur;
    step = (step + 1) % (state.bars * 16);
  }
}

function start() {
  if (!ctx || state.playing) return;
  state.playing = true;
  nextStepTime = ctx.currentTime + 0.1;
  step = 0;
  activeSources = [];
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  requestAnimationFrame(updatePlayhead);
}

function stop() {
  state.playing = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  activeSources.forEach(s => { try { s.stop(); } catch(e){} });
  activeSources = [];
  barsEl.style.width = '0%';
}

function updatePlayhead() {
  if (!state.playing || !ctx) return;
  const elapsed = ctx.currentTime - (nextStepTime - (step * 60 / state.bpm / 4));
  const total = state.bars * 4 * 60 / state.bpm;
  const pct = Math.min(100, (elapsed % total) / total * 100);
  barsEl.style.width = pct + '%';
  requestAnimationFrame(updatePlayhead);
}

document.getElementById('play').onclick = start;
document.getElementById('stop').onclick = stop;

document.querySelectorAll('#recipes button').forEach(btn => {
  btn.onclick = () => { state.recipe = btn.dataset.recipe; };
});

document.getElementById('bpm').onchange = e => { state.bpm = parseInt(e.target.value) || 92; localStorage.setItem('nylonfour', JSON.stringify(state)); };
document.getElementById('key').onchange = e => { state.key = e.target.value; localStorage.setItem('nylonfour', JSON.stringify(state)); };
document.getElementById('chords').onchange = e => { state.chords = parseChords(e.target.value); localStorage.setItem('nylonfour', JSON.stringify(state)); };

try {
  const saved = JSON.parse(localStorage.getItem('nylonfour') || '{}');
  Object.assign(state, saved);
  document.getElementById('bpm').value = state.bpm;
  document.getElementById('key').value = state.key;
  document.getElementById('chords').value = state.chords.join(' ');
} catch(e){}

async function exportWAV(withTail = false) {
  if (!ctx) return alert('Start audio first');
  const sampleRate = 48000;
  const bars = state.bars;
  const length = Math.round(bars * 4 * 60 / state.bpm * sampleRate);
  const offline = new OfflineAudioContext(2, length + (withTail ? sampleRate : 0), sampleRate);
  let t = 0;
  const stepDur = 60 / state.bpm / 4;
  for (let s = 0; s < bars * 16; s++) {
    const chordNotes = state.chords.map(c => chordToNotes(c, state.key));
    const hits = getRiffPattern(state.recipe, s, chordNotes);
    hits.forEach(noteName => {
      if (!samples[noteName]) return;
      const src = offline.createBufferSource();
      src.buffer = samples[noteName];
      const g = offline.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.01);
      g.gain.linearRampToValueAtTime(0, t + 0.25);
      src.connect(g);
      g.connect(offline.destination);
      src.start(t);
    });
    t += stepDur;
  }
  const rendered = await offline.startRendering();
  const wav = audioBufferToWav(rendered, withTail);
  const name = `nylonfour-${state.recipe}-${state.bpm}bpm-${state.key}.wav`;
  download(wav, name);
}

function audioBufferToWav(buffer, withTail) {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  const writeStr = (off, s) => { for (let i=0;i<s.length;i++) view.setUint8(off+i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, len, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([ab], {type: 'audio/wav'});
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

document.getElementById('export-wav').onclick = () => exportWAV(false);
document.getElementById('export-wav-tail').onclick = () => exportWAV(true);
document.getElementById('export-midi').onclick = () => {
  alert('MIDI export stub — full implementation tracks each chair. File named nylonfour-...mid');
};

console.log('NylonFour loaded. Samples from pinned SHA.');
