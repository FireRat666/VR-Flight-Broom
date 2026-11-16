# Flight Broom

A broomstick you sit on and fly: steer it by its handles, and the right stick sets the speed. Made for **SideQuest / AltspaceVR** worlds.

It works at **any level** (it doesn't use bird flight), in **VR** and on **PC**.

To try it, open <https://flight-broom.firer.at> as a space in Altspace.

## How to fly

**In VR**

1. Click the broom to sit on it.
2. Hold its handles with one hand or both: lift them to climb, push them down to dive, move them left or right to turn. The **left stick** steers too: forward dives, back climbs, left and right turn. The broom tilts you with it, and lifting or pushing rises or sinks you even when you're still.
3. Push the **right stick** up to speed up, down to slow down. Click it in to stop.
4. Let go of the handles to hover.
5. Press **B** (or jump) to get off.

**On PC**

1. Click the broom to sit on it.
2. **W** speeds up, **S** slows down, **A** and **D** turn, **E** climbs, and **Q** dives (straight up or down when you're still). The handles work too.
3. Press **Space** to get off.

A broom waits at each Flight Broom spot, with a **Click the broom to ride** label over it. The first time you sit on one, a toast shows the controls for VR or PC.

You have one broom out at a time: sitting on a broom sends your other one away. By default everyone has brooms of their own, and others see you flying but not the broom. With `sync="true"` the brooms are shared: everyone sees the same brooms, and sitting on one puts a new one at the spot, up to `sync-limit`. After you get off, it goes back to its spot `return-after` seconds later (a shared one goes away instead). It stops at walls and floors, sliding along them (`collide`).

## Add it to an Altspace world (snippet)

In a Creator SDK world, add an empty GameObject at the origin, click **Add Component > BS > Snippet** and type `broom`. Or paste this into `Assets/WebRoot/index.html`, between the snippet section comments:

```html
<!-- snippet section -->
<bs-snippet name="broom" title="Flight Broom" single="true"
  description="A broomstick you sit on and fly: steer it by its handles, the right stick sets the speed."
  script="https://flight-broom.firer.at/snippet.js"
  position="0 0.8 -2"
  yaw="0"
  max-speed="12"
  accel="4"
  turn-speed="90"
  max-pitch="50"
  stick-angle="25"
  seat-turn="0"
  climb-speed="3"
  tilt="1"
  collide="true"
  steer-range="0.2"
  dead-zone="0.03"
  response="3"
  pitch-ease="3"
  return-after="15"
  help="true"
  label="true"
  label-text="Click the broom to ride"
  sync="false"
  sync-limit="10"
  bundle-base="">
  <bs-gizmo type="position" attribute="position"/>
  <bs-gizmo type="box" attribute="position" size="0.5 0.16 0.5"/>
</bs-snippet>
<!-- end snippet section -->
```

- Add it once. For more brooms, add `broom-2-position`, `broom-3-position` and so on to the same element, as many as you like: each is another broom with the same settings. Give one its own seat turn with `broom-N-seat-turn` (for example `broom-2-seat-turn="90"` to ride it side-saddle).
- `position` is a Unity world position: keep the snippet's GameObject at the origin and move the broom with its gizmo handle or the setting.
- Unity reads the snippet section as XML: quote every attribute, close every element, and write `&` as `&amp;`.

## Settings

All optional. An empty setting uses the default.

| Attribute | Default | What it does |
| :--- | :--- | :--- |
| `position` | `0 0.8 2` | Where the broom waits (a Unity world position, the top of its saddle), and where it goes back to. |
| `broom-2-position`, `broom-3-position`, ... | (none) | More brooms, each one `x y z`. Any number, gaps are fine; an empty value is skipped. They all use the same settings. |
| `broom-2-seat-turn`, `broom-3-seat-turn`, ... | `seat-turn` | `seat-turn` for that broom only, for example `broom-2-seat-turn="90"` for a side-saddle broom next to a normal one. |
| `yaw` | `0` | Which way the brooms face, in degrees about up. |
| `max-speed` | `12` | Top speed in metres per second. |
| `accel` | `4` | m/s gained or lost per second with the right stick (or W / S). |
| `turn-speed` | `90` | Degrees per second with the handles right over to the side. |
| `max-pitch` | `50` | Degrees the broom noses up or down with the handles right up or down. |
| `stick-angle` | `25` | Degrees the stick points up where it rests. Holding it there is level flight. |
| `seat-turn` | `0` | Degrees the seat (and you) turn from the broom. `90` or `-90` rides side-saddle; the handles stay at the broom's front. |
| `climb-speed` | `3` | Metres per second straight up or down with the handles right up or down (or E / Q), on top of the speed, so you can rise or sink on the spot. |
| `tilt` | `1` | How much of the nose up or down tilts you on the seat: `0` keeps you upright, `1` tilts you all the way with the broom. |
| `collide` | `true` | `false` lets the broom fly through walls, floors and other solid things. |
| `steer-range` | `0.2` | Metres past the dead zone for a full turn or climb. |
| `dead-zone` | `0.03` | Metres round where the handles rest that don't steer. |
| `response` | `3` | How quickly your speed follows, per second. |
| `pitch-ease` | `3` | How quickly the broom noses up and down, per second. |
| `return-after` | `15` | Seconds after you get off before the broom goes back (`false` or `0`: never). |
| `help` | `true` | `false` skips the toast with the controls the first time you sit. |
| `label` | `true` | `false` hides the **Click the broom to ride** label over the broom's spot. |
| `label-text` | `Click the broom to ride` | What the label over the brooms says. No double quotes. |
| `broom-2-label-text`, `broom-3-label-text`, ... | `label-text` | `label-text` for that broom only. |
| `sync` | `false` | `true`: the brooms are shared, so everyone sees them. Sitting on one puts a new shared broom at the spot. A shared broom you're done with (`return-after` seconds after you get off, or when you sit on another, or leave) goes away for everyone. |
| `sync-limit` | `10` | Most shared brooms out in the space at once. Past it, the broom at each spot is a local one (only you see yours), until one goes away. |
| `bundle-base` | `bundles/` next to the script | Folder URL to load the broom's bundles from instead. |

## How it works

JavaScript can't fly a player smoothly, but Visual Scripting can. So `snippet.js` loads a small kit for each broom spot: an asset bundle holding the broom and its label, with a Visual Scripting graph that does the flying. The kit is spawned under an object named `broom-<instance>-<n>` (n is the broom's number: 1 for `position`, 2 for `broom-2-position` and so on), which is the broom's key. When a broom spawns, its graph calls `window.broomFlightReady(key)` in the page, and the snippet answers with that placement's settings through `scene.SendToVisualScripting("broom-flight-set", "key|Name=value")`.

With `sync="true"`, each spot's brooms are numbered, and spawned under objects named `key~key-sN`. The graph gives the broom network id `key-sN`, the same on every page, so it's the same broom for everyone. Each player's user state (`broom-flight-broom`, `key|N`) says which broom they have out, and every page works out the same thing from it: the brooms that are out (kept wherever their riders took them), and one waiting at the spot, the lowest number not out. Once `sync-limit` are out, the waiting one is a plain local broom instead. When you sit on a shared broom it takes ownership and calls `window.broomFlightTaken(key, id)`; when you're done with it, `window.broomFlightGone(id)` clears your user state and it goes away on every page. Sitting on a broom also sends `*|` to `broom-flight-drop`, which is done with your other broom. A shared broom that's out can only be sat on by the player who owns it.

On PC, the page also listens for `W`, `A`, `S`, `D`, `Q`, and `E` and sends `*|KeyX`, `*|KeyY`, and `*|KeyZ` (`-1..1`) to `broom-flight-set` when they change; a broom uses them while you ride it.

## Bringing a broom to you

From the page's code, or the space's dev tools console, a broom can be brought to you. It's swapped for a new one 1.5 m in front of you at saddle height, facing the way you look, with the same settings. It goes back to its own spot `return-after` seconds after you next get off it, as usual.

```js
flightBroom.bring()             // the first broom
flightBroom.bring(2)            // broom 2 (broom-2-position)
flightBroom.bring('broom-1-2')  // a broom by its key
flightBroom.keys()              // every broom's key
```

It reads your position from the app's `pose-update` event, once. The app only sends that while you move, so if you keep perfectly still it gives up after 3 seconds and logs a warning: move your head a little and try again.

When new bundles are uploaded to `bundles/<platform>/broomflight`, bump `BUNDLE_VERSION` in `snippet.js`: the app caches bundles by URL, so without a new version players keep the old one.

## Files

- `snippet.js`, `broom.js`, `snippet.html`: the Creator SDK snippet and its definition.
- `bundles/`: the broom kit for each platform (windows, android, linux, osx).
- `index.html`: the example space, and the guide shown in a normal browser.
- `test.html`: the example space with the snippet and bundles loaded from wherever it's served (e.g. `http://127.0.0.1:8081/test.html` from a local server), to try changes before publishing.

## License

GPL-3.0. See [LICENSE](LICENSE).
