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

The broom isn't shared: everyone has it to themselves, and others see you flying but not the broom. After you get off, it goes back to its spot `return-after` seconds later. It stops at walls and floors, sliding along them (`collide`).

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
| `bundle-base` | `bundles/` next to the script | Folder URL to load the broom's bundles from instead. |

## How it works

JavaScript can't fly a player smoothly, but Visual Scripting can. So `snippet.js` loads a small kit for each broom spot: an asset bundle holding the broom and its label, with a Visual Scripting graph that does the flying. The kit is spawned under an object named `broom-<instance>-<n>` (n is the broom's number: 1 for `position`, 2 for `broom-2-position` and so on), which is the broom's key. When a broom spawns, its graph calls `window.broomFlightReady(key)` in the page, and the snippet answers with that placement's settings through `scene.SendToVisualScripting("broom-flight-set", "key|Name=value")`.

On PC, the page also listens for `W`, `A`, `S`, `D`, `Q`, and `E` and sends `*|KeyX`, `*|KeyY`, and `*|KeyZ` (`-1..1`) to `broom-flight-set` when they change; a broom uses them while you ride it.

When new bundles are uploaded to `bundles/<platform>/broomflight`, bump `BUNDLE_VERSION` in `snippet.js`: the app caches bundles by URL, so without a new version players keep the old one.

## Files

- `snippet.js`, `broom.js`, `snippet.html`: the Creator SDK snippet and its definition.
- `bundles/`: the broom kit for each platform (windows, android, linux, osx).
- `index.html`: the example space, and the guide shown in a normal browser.
- `test.html`: the example space with the snippet and bundles loaded from wherever it's served (e.g. `http://127.0.0.1:8081/test.html` from a local server), to try changes before publishing.

## License

GPL-3.0. See [LICENSE](LICENSE).
