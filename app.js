'use strict';

// Results are transcribed from sec/5_exp.tex. These interactions present
// manuscript evidence and dataset annotations; they do not perform inference.
const evidence = {
  generalization: {
    ood: [51.00, 45.89, 74.92],
    main: [77.91, 87.26, 91.07],
    labels: ['Monocular depth', 'Binocular depth', 'Binocular disparity → depth']
  },
  interventions: {
    labels: ['Duplicated left', 'Single left', 'Zero right', 'Shuffled right', 'Correct stereo'],
    depth: [7.40, 80.82, 79.70, 70.16, 94.51],
    object: [8.18, 40.26, 39.81, 32.49, 64.43]
  },
  transfer: [
    ['Omni3D', 8.21], ['DA-2K', 2.37], ['OmniSpatial', 2.48],
    ['MindCube', 3.71], ['VSI-Bench', 0.92]
  ]
};

function setPressed(buttons, selected) {
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
}

// The RoboCasa example comes from figures/assets/benchmark/provenance.json.
const demoExamples = {
  correspondence: {
    question: 'Find the bottled water in the left image. Where is the same physical object in the right image?',
    answer: '[336, 121, 389, 220]',
    unit: 'Right-image bounding box · pixels'
  },
  disparity: {
    question: 'What is the representative horizontal disparity of the bottled water between the left and right images?',
    answer: '29.9',
    unit: 'Normalized disparity · image width = 1000 (23.95 px at width 800)'
  },
  depth: {
    question: 'With focal length fₓ = 267 px and baseline B = 0.06 m, what is the bottled water’s depth along the left-camera z-axis?',
    answer: '0.669 m',
    unit: 'Reference object-center depth · left-camera frame'
  }
};
const demoButtons = [...document.querySelectorAll('[data-demo]')];
demoButtons.forEach(button => button.addEventListener('click', () => {
  setPressed(demoButtons, button);
  const sample = demoExamples[button.dataset.demo];
  document.getElementById('demo-question').textContent = sample.question;
  document.getElementById('demo-answer').textContent = sample.answer;
  document.getElementById('demo-unit').textContent = sample.unit;
}));

const scaleButtons = [...document.querySelectorAll('[data-scale]')];
scaleButtons.forEach(button => button.addEventListener('click', () => {
  setPressed(scaleButtons, button);
  document.querySelectorAll('[data-model]').forEach(row => {
    row.classList.toggle('selected', row.dataset.model === button.dataset.scale);
  });
}));

function drawBars(element, labels, values, accentIndex, context) {
  element.replaceChildren();
  element.setAttribute('aria-label', context);
  labels.forEach((label, index) => {
    const row = document.createElement('div');
    row.className = `bar-row${index === accentIndex ? ' accent' : ''}`;
    const info = document.createElement('div');
    info.className = 'bar-info';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('span');
    value.className = 'bar-value';
    value.textContent = values[index].toFixed(2);
    info.append(name, value);
    const track = document.createElement('div');
    track.className = 'bar-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = `${values[index]}%`;
    track.append(fill);
    row.append(info, track);
    element.append(row);
  });
}
const splitButtons = [...document.querySelectorAll('[data-split]')];
function drawGeneralization(split) {
  drawBars(document.getElementById('generalization-chart'), evidence.generalization.labels,
    evidence.generalization[split], 2, `Depth delta-1 percentage on the ${split === 'ood' ? 'out-of-domain' : 'main'} split. Axis: 0 to 100.`);
}
splitButtons.forEach(button => button.addEventListener('click', () => {
  setPressed(splitButtons, button);
  drawGeneralization(button.dataset.split);
}));
drawGeneralization('ood');

function drawInterventions(metric) {
  drawBars(document.getElementById('intervention-chart'), evidence.interventions.labels,
    evidence.interventions[metric], 4,
    `Right-view interventions: ${metric === 'depth' ? 'depth delta-1 percentage' : 'object-level average score'}. Axis: 0 to 100.`);
}
document.getElementById('intervention-metric').addEventListener('change', event => drawInterventions(event.target.value));
drawInterventions('depth');

// Qualitative panels are extracted without altering the figure's colors.
const depthLabels = ['RGB input', 'Ground truth', 'StereoVLM-2B · stereo', 'StereoVLM-2B · monocular'];
const depthAlts = ['Observed scene', 'Reference depth reconstruction', 'Stereo-conditioned depth prediction', 'Single-view depth prediction'];
const sceneNames = { 0: 'DROID robot tabletop', 2: 'Xperience-10M workbench', 4: 'Out-of-domain conference room' };
function drawDepthGallery(scene) {
  const gallery = document.getElementById('depth-gallery');
  gallery.replaceChildren();
  depthLabels.forEach((label, index) => {
    const figure = document.createElement('figure');
    figure.className = `depth-tile${index === 2 ? ' ours' : ''}`;
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    const image = document.createElement('img');
    image.src = window.STEREO_DEPTH_GALLERY?.[scene]?.[index]
      || `assets/depth-${scene}-${index}.webp`;
    image.alt = `${depthAlts[index]}: ${sceneNames[scene]}`;
    image.width = 374;
    image.height = 176;
    image.loading = 'eager';
    image.decoding = 'async';
    figure.append(caption, image);
    gallery.append(figure);
  });
}
const sceneButtons = [...document.querySelectorAll('[data-scene]')];
sceneButtons.forEach(button => button.addEventListener('click', () => {
  setPressed(sceneButtons, button);
  drawDepthGallery(button.dataset.scene);
}));
drawDepthGallery('0');

const transferChart = document.getElementById('transfer-chart');
evidence.transfer.forEach(([label, gain]) => {
  const row = document.createElement('div');
  row.className = 'transfer-row';
  const name = document.createElement('span');
  name.textContent = label;
  const track = document.createElement('div');
  track.className = 'bar-track';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.width = `${gain / 10 * 100}%`;
  track.append(fill);
  const value = document.createElement('strong');
  value.textContent = `+${gain.toFixed(2)}`;
  row.append(name, track, value);
  transferChart.append(row);
});
transferChart.setAttribute('aria-label', 'Gains from stereo instruction tuning. Shared bar scale: 0 to 10 points.');


// All four original scenes load with the page for immediate, independent switching.
const methodSceneButtons = [...document.querySelectorAll('[data-method-scene]')];
methodSceneButtons.forEach(button => button.addEventListener('click', () => {
  setPressed(methodSceneButtons, button);
  document.querySelectorAll('[data-method-panel]').forEach(panel => {
    panel.hidden = panel.dataset.methodPanel !== button.dataset.methodScene;
  });
}));
