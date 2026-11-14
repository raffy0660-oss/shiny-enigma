'use strict';
/* Per-shot camera + light (shadow falls opposite to dir's xz) */
const SHOTCAM = [
  { pitch: 36, fov: 58, dir: [-.62, .72, .3], key: [1, .88, .72], keyI: .78, shA: .62, exp: 1.0 },  // 0 desk blindfold
  { pitch: 34, fov: 58, dir: [-.6, .74, .3], key: [1, .86, .7], keyI: .78, shA: .62, exp: 1.0 },    // 1 cone desk
  { pitch: 36, fov: 58, dir: [-.62, .72, .3], key: [1, .88, .72], keyI: .78, shA: .62, exp: 1.0 },  // 2 stack
  { pitch: 20, fov: 58, dir: [-.5, .8, .35], key: [1, .95, .86], keyI: .7, shA: .5, exp: 1.0 },    // 3 floor
  { pitch: 16, fov: 58, dir: [-.5, .8, .35], key: [1, .95, .86], keyI: .7, shA: .5, exp: 1.0 },    // 4 floor low
  { pitch: 36, fov: 58, dir: [-.62, .72, .3], key: [1, .88, .72], keyI: .78, shA: .62, exp: 1.0 },  // 5 gear
  { pitch: 40, fov: 58, dir: [-.6, .74, .3], key: [1, .86, .7], keyI: .78, shA: .62, exp: 1.0 },    // 6 cone hole
  { pitch: 42, fov: 58, dir: [-.62, .72, .3], key: [1, .88, .72], keyI: .78, shA: .62, exp: 1.0 },  // 7 spiky gear
  { pitch: 44, fov: 58, dir: [-.55, .76, .34], key: [1, .92, .8], keyI: .75, shA: .55, exp: 1.0 },  // 8 real vs cgi
  { pitch: 24, fov: 58, dir: [-.5, .8, .35], key: [1, .97, .92], keyI: .72, shA: .45, exp: 1.0 },   // 9 counter
  { pitch: 24, fov: 58, dir: [-.5, .8, .35], key: [1, .97, .92], keyI: .72, shA: .45, exp: 1.0 },   // 10 counter 2
  { pitch: 12, fov: 58, dir: [-.62, .72, .3], key: [1, .96, .9], keyI: .74, shA: .52, exp: 1.0 },    // 11 shelf
];
const TL = {
  expr: [[0, 'penasaran'], [.72, 'kaget'], [1.34, 'senang'], [1.9, 'imut'], [2.55, 'kaget'], [2.95, 'penasaran'], [3.95, 'senang'],
    [4.13, 'penasaran'], [4.75, 'senang'], [5.5, 'imut'], [6.0, 'kaget'], [6.45, 'datar'], [6.83, 'senang'], [7.6, 'penasaran'], [8.25, 'curiga'], [8.85, 'penasaran'], [9.4, 'penasaran'],
    [9.95, 'curiga'], [10.75, 'datar'], [11.37, 'penasaran'], [11.42, 'kaget'], [11.86, 'kaget'], [12.05, 'pusing'], [12.52, 'datar'], [12.66, 'imut'], [12.84, 'penasaran'], [14.05, 'curiga'],
    [14.6, 'penasaran'], [15.0, 'kaget'], [15.62, 'kaget'], [15.9, 'senang'], [16.47, 'penasaran'], [17.1, 'senang'], [17.55, 'imut'], [18.02, 'imut'], [18.25, 'senang']],
  startle: [.72, 6.02, 15.02],
  fall: { hit: 11.84, up: 12.5, ang: 1.5, dirDeg: 125 },
  ride: [{ t0: 15.6, land: 16.17 }, { t0: 6.834, land: 7.15 }],
  gest: [
    { t0: .72, t1: 1.12, type: 'up' },
    { t0: 1.45, t1: 1.88, type: 'point', side: -1, tgt: [470, 1330] },
    { t0: 1.9, t1: 2.22, type: 'clap' },
    { t0: 2.6, t1: 2.95, type: 'lookout' },
    { t0: 3.95, t1: 4.13, type: 'present' },
    { t0: 4.2, t1: 4.68, type: 'lookout' },
    { t0: 4.75, t1: 5.45, type: 'dance' },
    { t0: 5.5, t1: 5.98, type: 'clap' },
    { t0: 6.05, t1: 6.45, type: 'up' },
    { t0: 6.45, t1: 6.83, type: 'facepalm' },
    { t0: 6.88, t1: 7.58, type: 'cheer' },
    { t0: 7.75, t1: 8.2, type: 'knock', side: -1 },
    { t0: 8.25, t1: 8.83, type: 'cross' },
    { t0: 9.38, t1: 9.92, type: 'lookout' },
    { t0: 10.0, t1: 10.08, type: 'cross' },
    { t0: 10.9, t1: 11.0, type: 'facepalm' },
    { t0: 11.84, t1: 12.15, type: 'up' },
    { t0: 12.62, t1: 12.83, type: 'shrug' },
    { t0: 12.95, t1: 13.45, type: 'point', side: -1, tgt: [270, 1500] },
    { t0: 14.12, t1: 14.6, type: 'shrug' },
    { t0: 14.65, t1: 15.0, type: 'lookout' },
    { t0: 15.02, t1: 15.12, type: 'up' },
    { t0: 15.65, t1: 16.12, type: 'up' },
    { t0: 16.2, t1: 16.47, type: 'cheer' },
    { t0: 16.5, t1: 16.78, type: 'lookout' },
    { t0: 16.8, t1: 17.5, type: 'press', side: -1, tgt: [726, 978], hit: 17.08 },
    { t0: 17.52, t1: 17.82, type: 'clap' },
    { t0: 18.25, t1: 18.85, type: 'wave', side: 1 },
    { t0: 18.9, t1: 19.47, type: 'dance' },
  ],
  button: { x0: 328, y0: 896, x1: 752, y1: 1026 },
  fake: { t0: 9.98, t1: 11.36 },
};
