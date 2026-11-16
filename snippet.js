// Flight Broom as a SideQuest/Altspace Creator SDK snippet.
//
//   <bs-snippet name="broom" title="Flight Broom" single="true"
//     script="https://flight-broom.firer.at/snippet.js" position="0 0.8 2" yaw="0"></bs-snippet>
//
// A broomstick you sit on and fly. Click it to sit on it. In VR, hold its handles with one hand or both: lift them to
// climb, push them down to dive, move them left or right to turn (or use the left stick: forward dives, back climbs).
// The right stick up speeds you up, down slows you down, and clicking it in stops you. Lifting or pushing the handles also tilts you with the broom, and rises or sinks you even when you're
// still. Let go of the handles to hover. B (or jumping) gets you off. On a PC: W faster, S slower, A and D turn, E
// climb, Q dive (the handles work too), Space to get off. The broom stops at walls and floors (collide).
//
// This script loads a small kit (an asset bundle holding the broom, with a Visual Scripting graph that does the
// flying) for each broom spot: `position`, and broom-2-position, broom-3-position and so on. When a broom spawns its
// graph calls window.broomFlightReady(key), and this script answers with the settings.
// The broom isn't shared: everyone has it to themselves, and others see you flying but not the broom.
//
// Settings (attributes on the element, all optional):
//   position      Where the broom waits, "x y z" (the top of its saddle).                Default "0 0.8 2"
//   broom-N-position  More brooms, N = 2, 3, 4...: each one "x y z".                     Default none
//   yaw           Which way the brooms face, in degrees about up.                        Default 0
//   max-speed     Top speed in m/s.                                                     Default 12
//   accel         m/s gained or lost per second with the right stick (or W / S).       Default 4
//   turn-speed    Degrees per second with the handles right over to the side.          Default 90
//   max-pitch     Degrees the broom noses up or down with the handles right up or down. Default 50
//   stick-angle   Degrees the stick points up where it rests (level flight).            Default 25
//   seat-turn     Degrees the seat turns from the broom (90: side-saddle).              Default 0
//   broom-N-seat-turn  seat-turn for broom N only.                                      Default seat-turn
//   climb-speed   m/s straight up or down with the handles right up or down (or E / Q),
//                 on top of the speed, so you can rise or sink on the spot.            Default 3
//   tilt          How much of the nose up or down tilts you on the seat (0 upright, 1 all). Default 1
//   collide       "false": the broom flies through walls and floors.                  Default true
//   steer-range   Metres past the dead zone for a full turn or climb.                  Default 0.2
//   dead-zone     Metres round where the handles rest that don't steer.                Default 0.03
//   response      How quickly your speed follows, per second.                          Default 3
//   pitch-ease    How quickly the broom noses up and down, per second.                 Default 3
//   return-after  Seconds after you get off before the broom goes back ("false" or 0: never). Default 15
//   help          "false" to skip the toast with the controls the first time you sit.  Default true
//   label         "false" to hide the label over the brooms.                           Default true
//   label-text    What the label says (no double quotes).              Default "Click the broom to ride"
//   broom-N-label-text  label-text for broom N only.                                    Default label-text
//   bundle-base   Folder URL of the kit bundles.                     Default bundles/ next to this file
(() => {
  const SNIPPET_NAME = 'broom';
  const BUNDLE_FILE = 'broomflight';
  // The app caches kit bundles by URL, so bump this whenever the bundles are rebuilt.
  const BUNDLE_VERSION = '7';
  const SET_ID = 'broom-flight-set';
  const LOG = 'Flight Broom (snippet)';

  const NUMBERS = [
    ['max-speed', 'MaxSpeed', 12],
    ['accel', 'Accel', 4],
    ['turn-speed', 'TurnSpeed', 90],
    ['max-pitch', 'MaxPitch', 50],
    ['stick-angle', 'StickAngle', 25],
    ['seat-turn', 'SeatTurn', 0],
    ['climb-speed', 'ClimbSpeed', 3],
    ['tilt', 'Tilt', 1],
    ['steer-range', 'SteerRange', 0.2],
    ['dead-zone', 'DeadZone', 0.03],
    ['response', 'Response', 3],
    ['pitch-ease', 'PitchEase', 3],
    ['return-after', 'ReturnAfter', 15],
  ];
  const SWITCHES = [
    ['help', 'Help', true],
    ['label', 'ShowLabel', true],
    ['collide', 'Collide', true],
  ];

  const thisScript = document.currentScript;
  const started = new WeakSet();
  const placements = new Map(); // broom key -> its settings
  let count = 0;

  const bundleUrls = (el) => {
    const scriptUrl = el.getAttribute('script') || (thisScript && thisScript.src) || location.href;
    const custom = (el.getAttribute('bundle-base') || '').trim();
    const base = new URL(custom || 'bundles/', new URL(scriptUrl, location.href));
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const url = (platform) => new URL(`${platform}/${BUNDLE_FILE}?v=${BUNDLE_VERSION}`, base).href;
    return { windowsUrl: url('windows'), androidUrl: url('android'), linuxUrl: url('linux'), osxUrl: url('osx'), isScene: false };
  };

  const parsePosition = (text) => {
    const parts = String(text || '').trim().split(/[\s,]+/).map(parseFloat);
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : null;
  };

  const readSettings = (el) => {
    const attr = (name) => (el.getAttribute(name) || '').trim();
    const vars = {};
    for (const [name, key, fallback] of NUMBERS) {
      if (name === 'return-after' && /^(false|never|off)$/i.test(attr(name))) { vars[key] = 0; continue; }
      const n = parseFloat(attr(name));
      vars[key] = Number.isFinite(n) ? n : fallback;
    }
    for (const [name, key, fallback] of SWITCHES) {
      const v = attr(name).toLowerCase();
      vars[key] = (v === '' ? fallback : v === 'true') ? 1 : 0;
    }
    const yaw = parseFloat(attr('yaw'));
    return { vars, el, labelText: attr('label-text'), position: parsePosition(attr('position')) || [0, 0.8, 2], yaw: Number.isFinite(yaw) ? yaw : 0 };
  };

  const send = async (key) => {
    const settings = placements.get(key);
    if (!settings) return;
    const scene = BS.Scene.GetInstance();
    for (const [name, value] of Object.entries(settings.vars)) {
      await scene.SendToVisualScripting(SET_ID, `${key}|${name}=${value}`);
    }
    // The label's words go last, and only if set (the broom says "Click the broom to ride" by itself). The graph
    // drops double quotes, so they're left out here too.
    const words = settings.labelText.replace(/"/g, '');
    if (words) await scene.SendToVisualScripting(SET_ID, `${key}|LabelWords=${words}`);
  };

  window.broomFlightReady = (key) => {
    send(String(key)).catch((e) => console.warn(`${LOG}: sending settings failed`, e));
    return true;
  };

  const broomSpots = (el, first) => {
    const spots = [{ n: 1, position: first }];
    for (const { name, value } of Array.from(el.attributes)) {
      const m = /^broom-(\d+)-position$/.exec(name);
      if (!m || Number(m[1]) < 2) continue;
      const position = parsePosition(value);
      if (position) spots.push({ n: Number(m[1]), position });
      else if (value.trim()) console.warn(`${LOG}: ${name}="${value}" isn't "x y z", so that broom is left out`);
    }
    // broom-N-seat-turn turns that broom's seat only (broom-1-seat-turn works for the first one too).
    for (const spot of spots) {
      const turn = parseFloat((el.getAttribute(`broom-${spot.n}-seat-turn`) || '').trim());
      if (Number.isFinite(turn)) spot.seatTurn = turn;
      const words = (el.getAttribute(`broom-${spot.n}-label-text`) || '').trim();
      if (words) spot.labelText = words;
    }
    return spots.sort((a, b) => a.n - b.n);
  };

  const spawnBroom = async (el, key, position, yaw) => {
    try {
      const [x, y, z] = position;
      const obj = new BS.GameObject({
        name: key,
        localPosition: new BS.Vector3(x, y, z),
        localEulerAngles: new BS.Vector3(0, yaw, 0),
      });
      await obj.Async();
      await obj.AddComponent(new BS.AssetBundle(bundleUrls(el)));
      await obj.AddComponent(new BS.KitItem({ path: '*' }));
      console.log(`${LOG}: loading broom ${key} (bundle v${BUNDLE_VERSION}) at ${position.join(' ')}`);
    } catch (e) {
      console.error(`${LOG}: failed to start ${key}`, e);
    }
  };

  const start = async (el) => {
    if (started.has(el)) return;
    started.add(el);
    const base = `broom-${(el.getAttribute('instance') || '').trim() || ++count}`;
    const settings = readSettings(el);
    for (const { n, position, seatTurn, labelText } of broomSpots(el, settings.position)) {
      const key = `${base}-${n}`;
      const vars = seatTurn === undefined ? settings.vars : { ...settings.vars, SeatTurn: seatTurn };
      placements.set(key, { ...settings, vars, position, labelText: labelText || settings.labelText });
      if (vars.SeatTurn) console.log(`${LOG}: ${key} has its seat turned ${vars.SeatTurn} degrees`);
      await spawnBroom(el, key, position, settings.yaw);
    }
  };

  const scan = () => document.querySelectorAll(`bs-snippet[name="${SNIPPET_NAME}"]`).forEach(start);

  // PC keys: W / S faster and slower, A / D turn, E / Q climb and dive. The page hears the keyboard and sends every
  // broom KeyX / KeyY / KeyZ (-1..1) when they change; a broom uses them only while you ride it on a PC.
  const held = new Set();
  const sentKeys = { KeyX: 0, KeyY: 0, KeyZ: 0 };
  const sendKeys = () => {
    if (placements.size === 0) return;
    const K = BS.KeyCode;
    const axis = (plus, minus) => (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);
    const now = { KeyX: axis(K.D, K.A), KeyY: axis(K.W, K.S), KeyZ: axis(K.E, K.Q) };
    const scene = BS.Scene.GetInstance();
    for (const [name, value] of Object.entries(now)) {
      if (sentKeys[name] === value) continue;
      sentKeys[name] = value;
      scene.SendToVisualScripting(SET_ID, `*|${name}=${value}`).catch(() => {});
    }
  };

  window.addEventListener('bs-loaded', () => {
    const scene = BS.Scene.GetInstance();
    const K = BS.KeyCode;
    const flyKeys = new Set([K.W, K.A, K.S, K.D, K.Q, K.E]);
    scene.On('key-press', (e) => {
      const key = e.detail && e.detail.key;
      if (!flyKeys.has(key)) return;
      held.add(key);
      sendKeys();
    });
    scene.On('key-release', (e) => {
      const key = e.detail && e.detail.key;
      if (!held.delete(key)) return;
      sendKeys();
    });
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  });
})();
