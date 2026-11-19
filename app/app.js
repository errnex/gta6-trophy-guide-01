// Leonida Platinum boot: load the trophy list, wire the controls, and keep the
// checklist, roadmap, missables and detail pane in sync with saved progress.
import { loadEarned, saveEarned, exportProgress, importProgressFile } from './store.js';
import {
  KIND_LABELS, renderChecklist, renderDetail, renderRoadmap, renderMissables, updateProgress,
} from './views.js';

const DATA_URL = 'data/trophies.json';
const VIEW_IDS = { checklist: 'checklistView', roadmap: 'roadmapView', missables: 'missablesView' };

const state = {
  trophies: [], sources: [], earned: loadEarned(),
  kind: 'all', grade: 'all', query: '', spoilerOn: false, hideEarned: false,
  view: 'checklist', selected: null,
};

const listEl = document.getElementById('trophyList');
const metaEl = document.getElementById('listMeta');
const paneEl = document.getElementById('detailPane');

function selectedTrophy() {
  return state.trophies.find((t) => t.name === state.selected) || null;
}

function renderAll() {
  renderChecklist(listEl, metaEl, state.trophies, state, selectTrophy, toggleEarned);
  renderDetail(paneEl, selectedTrophy(), state.sources, state.earned, toggleEarned);
  renderRoadmap(document.getElementById('roadmapStages'), state.trophies, state.earned, selectTrophy);
  renderMissables(document.getElementById('missablesList'), state.trophies, state.earned, selectTrophy);
  updateProgress(state.trophies, state.earned);
  document.getElementById('missablePill').textContent = String(state.trophies.filter((t) => t.missable).length);
}

function selectTrophy(name) {
  state.selected = name;
  showView('checklist');
  renderAll();
  paneEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleEarned(name, earned) {
  if (earned) state.earned.add(name);
  else state.earned.delete(name);
  saveEarned(state.earned);
  renderAll();
}

function showView(view) {
  state.view = view;
  for (const [name, id] of Object.entries(VIEW_IDS)) {
    document.getElementById(id).classList.toggle('hidden', name !== view);
  }
  for (const btn of document.querySelectorAll('#viewTabs button')) {
    btn.classList.toggle('active', btn.dataset.view === view);
  }
  document.getElementById('controls').style.display = view === 'checklist' ? '' : 'none';
}

function buildKindChips() {
  const chips = document.getElementById('kindChips');
  const kinds = [['all', 'All'], ...Object.entries(KIND_LABELS), ['missable', 'Missable'], ['online', 'Online']];
  for (const [value, label] of kinds) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (value === 'all') btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.kind = value;
      for (const b of chips.children) b.classList.toggle('active', b === btn);
      renderAll();
    });
    chips.append(btn);
  }
}

async function boot() {
  const doc = await (await fetch(DATA_URL)).json();
  state.trophies = doc.trophies;
  state.sources = doc.sources || [];
  buildKindChips();
  document.getElementById('search').addEventListener('input', (e) => { state.query = e.target.value; renderAll(); });
  document.getElementById('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderAll(); });
  document.getElementById('spoilerToggle').addEventListener('change', (e) => { state.spoilerOn = e.target.checked; renderAll(); });
  document.getElementById('hideEarnedToggle').addEventListener('change', (e) => { state.hideEarned = e.target.checked; renderAll(); });
  document.getElementById('exportBtn').addEventListener('click', () => exportProgress(state.earned));
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      state.earned = await importProgressFile(file, new Set(state.trophies.map((t) => t.name)));
      saveEarned(state.earned);
      renderAll();
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies?')) return;
    state.earned = new Set();
    saveEarned(state.earned);
    renderAll();
  });
  for (const btn of document.querySelectorAll('#viewTabs button')) {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  }
  renderAll();
  window.__shotReady = true;
}

boot();
