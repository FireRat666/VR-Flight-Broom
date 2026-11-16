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
// One broom out each: sitting on a broom sends your other one away. Without sync everyone has brooms of their own:
// others see you flying but not the broom, and it goes back to its spot return-after seconds after you get off.
// With sync="true" the brooms at each spot are shared, numbered 1, 2, 3... with network ids every page agrees on:
// everyone sees the same broom, and whoever sits on it flies it. Sitting on one puts a new shared broom at the spot
// for everyone, until sync-limit are out; then the spot has a plain local broom again (only you see yours).
// A shared broom you're done with (return-after seconds after you get off, or when you sit on another, or leave)
// goes away for everyone.
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
//   sync          "true": the brooms are shared, and everyone sees them (one out each). Default false
//   sync-limit    Most shared brooms out in the space at once; past it, brooms are local. Default 10
//   respawn-delay Seconds after a shared broom is taken before the next one appears at its spot. Default 3
//   bundle-base   Folder URL of the kit bundles.                     Default bundles/ next to this file
//
// From the page's code (or the dev tools console), a broom can be brought to you: it's put 1.5 m in front of you at
// saddle height, facing the way you look (a fresh broom, with the same settings; it goes back to its own spot
// return-after seconds after you next get off it, as usual). With sync it's a local broom of your own, and the shared
// ones stay at their spot:
//   flightBroom.bring()            the first broom
//   flightBroom.bring(2)           broom 2 (broom-2-position), or a broom's key: flightBroom.bring('broom-1-2')
//   flightBroom.keys()             every broom's key
(() => {
  const SNIPPET_NAME = 'broom';
  const BUNDLE_FILE = 'broomflight';
  // The app caches kit bundles by URL, so bump this whenever the bundles are rebuilt.
  const BUNDLE_VERSION = '8';
  const SET_ID = 'broom-flight-set';
  // Your user state: the shared broom you have out, "key:n" (broom n of spot key), so every page counts it as taken.
  // Not "|": the app sends user state as name|value, so a "|" in the value cuts it short for everyone else.
  const BROOM_PROP = 'broom-flight-broom';
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
    ['sync', 'Sync', false],
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
    const limit = parseInt(attr('sync-limit'), 10);
    const delay = parseFloat(attr('respawn-delay'));
    return { vars, el, syncLimit: Number.isFinite(limit) && limit >= 0 ? limit : 10,
      respawnDelay: Number.isFinite(delay) && delay >= 0 ? delay : 3, labelText: attr('label-text'), position: parsePosition(attr('position')) || [0, 0.8, 2], yaw: Number.isFinite(yaw) ? yaw : 0 };
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
      return obj;
    } catch (e) {
      console.error(`${LOG}: failed to start ${key}`, e);
      return null;
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
      // Shared brooms are spawned by refresh() below, from who has which out.
      if (!vars.Sync) placements.get(key).obj = await spawnBroom(el, key, position, settings.yaw);
    }
    refresh();
  };

  // ---- Bringing a broom to you: read your head's pose once (the app sends pose-update only while you move, so this
  // waits up to 3 seconds for one), then swap the broom for a new one in front of you.
  const AHEAD = 1.5; // metres in front of your head
  const SADDLE_BELOW_EYES = 0.8; // metres from your eyes down to the saddle (standing)
  const onePose = (ms = 3000) => new Promise((resolve) => {
    const scene = BS.Scene.GetInstance();
    const done = (pose) => { clearTimeout(timer); try { scene.Off('pose-update', take); } catch (e) {} resolve(pose); };
    const take = (e) => done(e.detail);
    const timer = setTimeout(() => done(null), ms);
    scene.On('pose-update', take);
  });
  const inFrontOf = (head) => {
    const { position: p, rotation: q } = head;
    const fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y); // where you look, flattened
    const len = Math.hypot(fx, fz) || 1;
    return {
      position: [p.x + (fx / len) * AHEAD, p.y - SADDLE_BELOW_EYES, p.z + (fz / len) * AHEAD],
      yaw: (Math.atan2(fx, fz) * 180) / Math.PI,
    };
  };
  const findKey = (which) => {
    const keys = [...placements.keys()];
    if (which === undefined) return keys[0];
    if (typeof which === 'number') return keys.find((k) => k.endsWith(`-${which}`));
    return placements.has(String(which)) ? String(which) : undefined;
  };
  const bring = async (which) => {
    const key = findKey(which);
    const placement = key && placements.get(key);
    if (!placement) { console.warn(`${LOG}: no broom ${which === undefined ? '' : which} to bring`); return false; }
    const pose = await onePose();
    if (!pose) { console.warn(`${LOG}: no position from the app yet; move your head a little and try again`); return false; }
    const spot = inFrontOf(pose.head);
    const position = spot.position.map((n) => +n.toFixed(3));
    // With sync the shared brooms stay at their spot: you get a local one of your own (replacing one you brought).
    const slot = placement.vars.Sync ? 'brought' : 'obj';
    if (placement[slot]) { try { await placement[slot].Destroy(); } catch (e) {} }
    placement[slot] = await spawnBroom(placement.el, key, position, spot.yaw);
    return true;
  };
  window.flightBroom = { bring, keys: () => [...placements.keys()] };

  // ---- Sync: each spot's brooms are numbered, and their network ids are the same on every page ("key-s1",
  // "key-s2"...), so they're the same brooms for everyone. Everyone's user state says which broom they have out; from
  // that every page works out the same thing: the brooms out (kept, wherever their riders took them) and a new one
  // waiting at the spot (the lowest number not out), until sync-limit are out in the space. Past that the broom
  // waiting at the spot is a plain local one.
  const ME = '(me)';
  const taken = new Map();  // player uid (ME for you) -> { key, n }: the shared broom they have out
  const idFor = (key, n) => `${key}-s${n}`;

  const publish = () => {
    const m = taken.get(ME);
    BS.Scene.GetInstance().SetUserProps({ [BROOM_PROP]: m ? `${m.key}:${m.n}` : '' });
  };
  const readEntry = (value) => {
    const m = /^([A-Za-z0-9_-]+):(\d+)$/.exec(String(value || '').trim());
    return m ? { key: m[1], n: Number(m[2]) } : null;
  };
  const setTaken = (uid, entry) => {
    if (entry) taken.set(uid, entry);
    else taken.delete(uid);
  };

  // A broom spawned for a spot: kept as a record, so one that's dropped while it's still loading goes too.
  const spawnRecord = (place, name, n) => {
    const rec = { n, obj: null, gone: false };
    spawnBroom(place.el, name, place.position, place.yaw).then((obj) => {
      if (rec.gone && obj) obj.Destroy();
      else rec.obj = obj;
    });
    return rec;
  };
  const drop = (rec) => {
    rec.gone = true;
    if (rec.obj) rec.obj.Destroy();
  };

  const refresh = () => {
    for (const [key, place] of placements) {
      if (!place.vars.Sync) continue;
      place.out = place.out || new Map(); // n -> record
      const out = new Set();
      for (const entry of taken.values()) if (entry.key === key) out.add(entry.n);
      // Gone: no one has it out any more.
      for (const [n, rec] of place.out) {
        if (!out.has(n)) { drop(rec); place.out.delete(n); }
      }
      // Out: the one waiting here if it's that one, or spawned (it moves to wherever its rider has it).
      for (const n of out) {
        if (place.out.has(n)) continue;
        if (place.waiting && place.waiting.n === n) {
          place.out.set(n, place.waiting);
          place.waiting = null;
          // The next one waits a moment, so it isn't in the way while the rider gets settled and flies off.
          place.nextAt = Date.now() + place.respawnDelay * 1000;
        } else place.out.set(n, spawnRecord(place, `${key}~${idFor(key, n)}`, n));
      }
      // Waiting at the spot: shared while there's room, local (n 0) once sync-limit are out. They're swapped as the
      // room comes and goes, except a local one while it's out (you're riding it, or it's waiting to go home).
      const room = taken.size < place.syncLimit;
      if (place.waiting && place.waiting.n > 0 && !room) { drop(place.waiting); place.waiting = null; }
      if (place.waiting && place.waiting.n === 0 && room && !place.localOut) { drop(place.waiting); place.waiting = null; }
      const wait = (place.nextAt || 0) - Date.now();
      if (!place.waiting && wait > 0) {
        if (!place.timer) place.timer = setTimeout(() => { place.timer = null; refresh(); }, wait + 20);
      } else if (!place.waiting) {
        let n = 0;
        if (room) for (n = 1; out.has(n); n++);
        place.waiting = spawnRecord(place, n ? `${key}~${idFor(key, n)}` : key, n);
      }
    }
  };

  // You sat on shared broom `id` of spot `key`: it's yours (one each, so it replaces any other), and every page puts a
  // new one at the spot.
  window.broomFlightTaken = (key, id) => {
    key = String(key);
    id = String(id || '');
    const m = id.startsWith(`${key}-s`) ? Number(id.slice(key.length + 2)) : NaN;
    if (!Number.isInteger(m) || m < 1) return false;
    taken.set(ME, { key, n: m });
    publish();
    refresh();
    return true;
  };

  // A local broom of spot `key` is out (you sat on it) or back at its spot.
  window.broomFlightLocal = (key, out) => {
    const place = placements.get(String(key));
    if (place) { place.localOut = !!out; if (!out) refresh(); }
    return true;
  };

  // You're done with shared broom `id`: it goes away for everyone.
  window.broomFlightGone = (id) => {
    const m = taken.get(ME);
    if (m && idFor(m.key, m.n) === String(id)) {
      taken.delete(ME);
      publish();
      refresh();
    }
    return true;
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
    // Other players' shared brooms: the ones already out when you arrive, and as they change.
    for (const user of Object.values(scene.users || {})) {
      if (user && !user.isLocal && user.props) setTaken(user.uid, readEntry(user.props[BROOM_PROP]));
    }
    scene.On('user-state-changed', (e) => {
      const user = e.detail && e.detail.user;
      if (!user || user.isLocal) return;
      for (const change of e.detail.changes || []) {
        if (change.key !== BROOM_PROP) continue;
        setTaken(user.uid, readEntry(change.newValue));
        refresh();
      }
    });
    scene.On('user-left', (e) => {
      if (e.detail && taken.delete(e.detail.uid)) refresh();
    });
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  });
})();
