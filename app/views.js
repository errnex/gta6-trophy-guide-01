// Rendering for the Leonida Platinum guide: checklist rows, the detail pane,
// the roadmap stages and the missables page. All text comes from trophies.json;
// nothing here invents a trophy, a place or a step.

export const KIND_LABELS = {
  story: 'Story', side: 'Side missions', collectibles: 'Collectibles',
  activities: 'Activities', exploration: 'Exploration', money: 'Money', completion: 'Completion',
};

const STORY_KINDS = new Set(['story', 'side']);

export function isStoryTrophy(trophy) {
  return STORY_KINDS.has(trophy.kind);
}

export function spoilerHidden(trophy, spoilerOn, earned) {
  return spoilerOn && isStoryTrophy(trophy) && !earned.has(trophy.name);
}

export function filterTrophies(trophies, state) {
  const q = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.hideEarned && state.earned.has(t.name)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.count_label || '')).toLowerCase().includes(q)) return false;
    return true;
  });
}

function tag(text, cls) {
  const s = document.createElement('span');
  s.className = 'tag' + (cls ? ' ' + cls : '');
  s.textContent = text;
  return s;
}

export function renderChecklist(listEl, metaEl, trophies, state, onSelect, onToggle) {
  const shown = filterTrophies(trophies, state);
  listEl.replaceChildren();
  if (state.kind === 'online') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = '<strong>No online trophies.</strong> The official list has no online trophies: GTA VI launched as a single-player game, and every one of the 55 trophies is earned offline. (Push Square, 18 Nov 2026, via Exophase.)';
    listEl.append(div);
  }
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy grade-' + t.grade + (state.earned.has(t.name) ? ' earned' : '') + (state.selected === t.name ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.name);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => onToggle(t.name, box.checked));
    box.addEventListener('click', (e) => e.stopPropagation());
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    if (spoilerHidden(t, state.spoilerOn, state.earned)) {
      name.textContent = 'Hidden story trophy — earn it to reveal';
      name.classList.add('spoiler-name');
    } else {
      name.textContent = t.name;
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = spoilerHidden(t, state.spoilerOn, state.earned) ? 'Story trophy — name and description hidden until earned.' : t.description;
    const target = document.createElement('div');
    target.className = 'trophy-target';
    target.textContent = spoilerHidden(t, state.spoilerOn, state.earned) ? '' : (t.count_label || '');
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    tags.append(tag(KIND_LABELS[t.kind] || t.kind));
    if (t.missable) tags.append(tag('Missable', 'missable'));
    if (t.count) tags.append(tag('PSN count: ' + t.count));
    body.append(name, desc, target, tags);
    const grade = document.createElement('span');
    grade.className = 'grade-label';
    const dot = document.createElement('span');
    dot.className = 'grade-dot';
    grade.append(dot, t.grade);
    li.append(box, body, grade);
    li.addEventListener('click', () => onSelect(t.name));
    listEl.append(li);
  }
  metaEl.textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies · ' + state.earned.size + ' earned';
}

export function renderDetail(paneEl, trophy, sources, earned, onToggle) {
  paneEl.replaceChildren();
  if (!trophy) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to see its official description, its guide and its sources.';
    paneEl.append(p);
    return;
  }
  const isEarned = earned.has(trophy.name);
  const h2 = document.createElement('h2');
  h2.textContent = trophy.name;
  const meta = document.createElement('p');
  meta.className = 'official';
  const dot = document.createElement('span');
  dot.className = 'grade-dot';
  meta.append(dot, trophy.grade + ' trophy · ' + (KIND_LABELS[trophy.kind] || trophy.kind) + (trophy.count ? ' · PSN count: ' + trophy.count : '') + (trophy.missable ? ' · Missable' : ''));
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = 'Official description: “' + trophy.description + '”';
  const guideH = document.createElement('h3');
  guideH.textContent = 'Guide — in our own words';
  const guide = document.createElement('p');
  guide.textContent = trophy.guide;
  paneEl.append(h2, meta, official, guideH, guide);
  if (trophy.missable && trophy.missable_note) {
    const missH = document.createElement('h3');
    missH.textContent = 'Why it is flagged missable';
    const miss = document.createElement('p');
    miss.textContent = trophy.missable_note;
    paneEl.append(missH, miss);
  }
  const srcH = document.createElement('h3');
  srcH.textContent = 'Sources';
  const list = document.createElement('ul');
  list.className = 'sources';
  for (const id of trophy.source_ids || []) {
    const src = sources.find((s) => s.id === id);
    if (!src) continue;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = src.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = src.label;
    li.append(a);
    list.append(li);
  }
  const note = document.createElement('li');
  note.textContent = 'Guide text is our own advice from the official description, not yet checked in the game.';
  list.append(note);
  paneEl.append(srcH, list);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mark-btn' + (isEarned ? ' earned' : '');
  btn.textContent = isEarned ? '✓ Earned — click to unmark' : 'Mark as earned';
  btn.addEventListener('click', () => onToggle(trophy.name, !isEarned));
  paneEl.append(btn);
}

export const ROADMAP_STAGES = [
  { stage: 'Stage 1', title: 'Play the story, in order', note: 'Chapters 1 to 4 and the story missions inside them. Do each mission trophy when it appears.', ids: ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!', 'Top Of The World, Ma', 'Trust', 'Break the Bank', 'Family Matters', 'DWNFALL', 'Hi-Jacked', 'Snow Storm', 'Catch Me If You Can'] },
  { stage: 'Stage 2', title: 'Side strands, alongside the story', note: 'The five named character strands plus stranger missions. Finish every strand before the finale — they may not be available after it.', ids: ['Road to Rehabilitation', 'This Was No Boat Accident', 'The Lone Rider', 'Supply & Demand', 'Spin On This!', 'Strangers & Freaks', 'Fair Game'] },
  { stage: 'Stage 3', title: 'Collectibles and exploration', note: 'While you cross the map: meditate, WAiNK, explore areas, find cards and vehicles. These overlap, so one trip can tick three trophies.', ids: ['Positive Mental Attitude', 'You WAiNKer!', 'The Goodtime State', "Don't Touch My Deck", 'Whip It Good', 'On the Spot'] },
  { stage: 'Stage 4', title: 'Activities, combat and money', note: 'Races, shooting range, robberies, wanted-level tricks and the money grind. Most of it is repeatable after the story.', ids: ['Master of None', 'Cunning Stunts', 'The Shootist', 'Top Fun', 'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'One Last Thing', 'Hot Together', 'Retail Therapy', 'Gunslinger', 'Sneakthief', 'Maximum Withdrawal', 'A Classic Blitz Play', 'Pest Control', 'Capital Offense', 'Let’s Go Bowling', 'Ten Pin', 'Challenging Tank', 'In The Beginning…', 'Personal Best', 'Actions Speak Louder', 'Bad Luck, I Guess', 'The Truth Is Out There', 'Dime on the Dollar', 'Treat Yo Self', 'Little Boxes'] },
  { stage: 'Stage 5', title: 'Finale, 100% and the Platinum', note: 'Only when every missable is done: the final mission, then 100% completion, then the Platinum pops.', ids: ['You Gotta Know When to Get Off', 'A Long Road', 'Vice Got a Price!'] },
];

export function renderRoadmap(container, trophies, earned, onSelect) {
  container.replaceChildren();
  const byName = new Map(trophies.map((t) => [t.name, t]));
  for (const stage of ROADMAP_STAGES) {
    const div = document.createElement('div');
    div.className = 'stage';
    const count = document.createElement('p');
    count.className = 'stage-count';
    const done = stage.ids.filter((n) => earned.has(n)).length;
    count.textContent = stage.stage + ' · ' + done + ' of ' + stage.ids.length + ' earned';
    const h3 = document.createElement('h3');
    h3.textContent = stage.title;
    const note = document.createElement('p');
    note.textContent = stage.note;
    const ul = document.createElement('ul');
    for (const name of stage.ids) {
      const t = byName.get(name);
      if (!t) continue;
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-link';
      b.textContent = (earned.has(name) ? '✓ ' : '') + t.name + ' — ' + t.grade + (t.missable ? ' · Missable' : '') + (t.count_label ? ' · ' + t.count_label : '');
      b.addEventListener('click', () => onSelect(name));
      li.append(b);
      ul.append(li);
    }
    div.append(count, h3, note, ul);
    container.append(div);
  }
}

export function renderMissables(container, trophies, earned, onSelect) {
  container.replaceChildren();
  const flagged = trophies.filter((t) => t.missable);
  for (const t of flagged) {
    const row = document.createElement('div');
    row.className = 'missable-row';
    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = (earned.has(t.name) ? '✓ ' : '') + t.name + ' — ' + t.grade;
    const why = document.createElement('div');
    why.className = 'why';
    why.textContent = t.missable_note || 'Story moment — do it before the finale.';
    left.append(name, why);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Open guide';
    btn.addEventListener('click', () => onSelect(t.name));
    row.append(left, btn);
    container.append(row);
  }
}

export function updateProgress(trophies, earned) {
  const pct = Math.round((earned.size / trophies.length) * 100);
  document.getElementById('earnedCount').textContent = String(earned.size);
  document.getElementById('progressLabel').textContent = pct + '% to the Platinum';
  document.getElementById('progressFill').style.width = pct + '%';
  const counts = {};
  for (const t of trophies) if (earned.has(t.name)) counts[t.grade] = (counts[t.grade] || 0) + 1;
  const total = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  document.getElementById('gradeCounts').textContent =
    'Platinum ' + (counts.platinum || 0) + '/' + total.platinum +
    ' · Gold ' + (counts.gold || 0) + '/' + total.gold +
    ' · Silver ' + (counts.silver || 0) + '/' + total.silver +
    ' · Bronze ' + (counts.bronze || 0) + '/' + total.bronze;
}
