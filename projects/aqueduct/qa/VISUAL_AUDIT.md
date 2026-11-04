# Visual audit: v1 (`final/aqueduct_short_720x1280.mp4`)

**Method:** 75 full-resolution frames were extracted and inspected: the start, middle and end of every camera key, plus the frames on both sides of every cut. They are in `qa/audit/fNNNN.jpg` (NNNN = frame number), with 4-up review sheets in `qa/audit/sheet_NN.jpg`. A one-in-15 overview of the whole film is in `qa/overview_1.jpg` and `qa/overview_2.jpg`.
**Verdict:** v1 is **not acceptable**. Most problems are systemic: the character method, the world's spatial logic, materials and resolution. They are not local framing slips, so shots will be rebuilt, not patched.

---

## A. Systemic problems (affect the whole film)

| # | Problem | Evidence | Root cause | Fix |
|---|---|---|---|---|
| A1 | **Characters are flat stickers on top of the picture.** They are never occluded, never lit by the scene, cast no real shadows, and read as "pasted on". Fountain jets cross a citizen's face; a worker appears to stand inside the windlass frame. | f0463, f0853, f1520, f1542, f1340 | Speed-driven 2D overlay (`overlay.ts`) with no depth test | **Real 3D characters** inside the scene: jointed, toon-shaded with the world's two-tone light, inked by the same ink pass, casting and receiving shadows, depth-tested. Heads keep the skill's bean shape and face style (face painted onto the head). |
| A2 | **Workers do not use their tools.** A mallet waves in mid-air beside a block (no chisel); the engineer stands *in front of* the groma instead of sighting along it; nobody touches the chorobates; the "sealer" sits in the channel like a doll. | f1030–f1073, f0405–f0461, f0463–f0505, f1255–f1367 | 2D poses cannot reach 3D objects | 3D rig (shoulder, elbow, wrist, hip, knee, spine) with posed animations that put hands *on* tools: chisel and mallet, sighting through the groma, pouring water into the chorobates groove, trowelling, cranking, guiding a rope, walking inside a treadwheel. |
| A3 | **Inconsistent character scale.** The worker at the chorobates looks barely taller than a 1.1 m table; the sealer's face fills the frame at f1340. | f0463, f1340 | Card scale + overlay perspective with no depth cues | All characters 1.65–1.80 m, modelled in metres and checked against doors (2.2 m), the table (1.1 m) and the channel (1.2 m × 1.8 m). |
| A4 | **No visible gradient: water source and city are at the same height.** The whole world sits at 47 m; the spring is no higher than the city, which contradicts "slope down the whole way". | f0299–f0403, f0587–f0730 | Flat channel geometry (constant CHY) | Real descending profile: spring high in the hills (~78 m), route mostly underground, arcade crossing at ~47 m, city castellum at ~45 m. The channel floor follows `channelY(x)`; the water surface flows downhill with downstream-directed streaks. |
| A5 | **Water looks like a cartoon decal.** White blobs on a flat cyan plane; the spring "cascade" is 3 floating 2D arcs with no source; splashes are 2D sprite crowns hovering on walls; fountain jets are 2D strokes. | f0299–f0403, f1390, f1440, f1487 | 2D overlay water + simple noise shader | 3D water: a flowing-surface shader with streaks moving downstream (speed tied to the gradient), depth tint and foam at the edges; cascades as curved 3D water sheets with a scrolling shader; spout jets as 3D tubes; splash and foam as depth-tested meshes. |
| A6 | **Low resolution and aliasing.** 720×1280 with no anti-aliasing, so stair-stepped ink lines and roof edges. | all frames, e.g. f1544 roofs | Speed settings (MSAA 0, 720p) | Render **1080×1920**, MSAA ×4, 2048–4096 shadow maps; textures painted at 2048 where seen close; final H.264 CRF 14–16, High profile. |
| A7 | **Flat, saturated, repetitive ground.** Neon tiled grass everywhere; mountains are flat cones; hills are smooth blobs; trees are lollipops. | f0405, f0463, f0770, f0223 | Single grass texture, cone mountains | Mediterranean palette (dry grass, ochre earth, limestone outcrops); painted terrain blending by slope and height (grass / dry grass / earth / rock); heightfield mountains with ridges; olive trees, stone pines, cypresses and shrubs with lumpy crowns; path tracks; rocks. |
| A8 | **Golden-hour shots go navy.** The valley floor turns dark blue and reads as a lake; the city sits in a blue void. | f0005–f0149, f1544–f1754 | Golden preset shade colour (0.15,0.15,0.30) on a terrain with no sky light | A warmer golden preset (shade lifted, violet kept only in true shadow), sky-coloured ambient fill, height fog, sun disc with bloom. |
| A9 | **Architecture is generic and partly wrong.** The temple has a *pyramid* roof, columns with no bases or capitals and no pediment; insulae look like 19th-century Italian blocks (shutters, identical boxes); the fountain is a "funnel on a pillar". | f0165–f0221, f1457–f1542, f1415–f1455 | Quick box modelling | A Roman forum: temple on a podium with front steps, columns with bases and capitals, entablature, **triangular pediment**, gabled tile roof; insulae of brick/plaster with shops (tabernae), small windows, a few balconies and gabled low-pitch tile roofs, varied heights; a domed bath building; the **castellum** where the channel ends; a street fountain of the Pompeii type (rectangular stone basin with a spout pillar). |
| A10 | **Arch undersides render lilac and stretched.** | f0909–f1003 | ExtrudeGeometry side-wall UVs stretched along the arc + cool shade colour | Arch rings built as separate voussoir geometry with radial UVs (visible voussoirs, like the Pont du Gard); warmer shade. |
| A11 | **Floating geometry.** The tier string course floats in the sky during construction (the upper tiers are hidden but the ledge stays); a translucent slab outline hangs over the crane shots. | f1075–f1253 (top of frame) | String course in the always-visible batch | All arcade parts belong to their tier group; construction state built as its own coherent set. |
| A12 | **Hard cuts between unrelated places with no geography.** The viewer never learns where the spring, tunnel, arcade and city are relative to each other. | cuts at f0298, f0404, f0586, f0769 | No establishing logic | One coherent route: spring (west, high) → tunnel hill → arcade over the valley → city (east, low). A map-like aerial "route" shot is reused, and each cut has a clear subject. |

---

## B. Shot-by-shot problems

| Shot | Time | Narration | What the viewer should see | What v1 shows (frames) | Rebuild plan |
|---|---|---|---|---|---|
| 1 HOOK | 0.0–5.0 s | "How did ancient Rome carry fresh water … without a single pump?" | A breathtaking aqueduct carrying water across a valley at sunrise, with the city ahead | Channel walls flat orange, valley floor navy (looks like a lake), the sun disc cut at the frame edge (f0005–f0077); aerial: navy valley, a white "carpet" (river plane) under the arches, the arcade ending in mid-air (f0079–f0149) | Golden sunrise fly-along *above and beside* the channel (water flowing toward the city), then a sweeping aerial of the whole arcade with river, trees and the city beyond. New golden grade. |
| 2 PROBLEM | 5.0–9.9 s | "Rome may have held a million people, and the clean springs were dozens of kilometres away." | A crowded city street, people queueing with empty jars at a dry fountain; then the distant hills where the springs are | Characters in a line facing the camera; wrong temple; funnel fountain (f0151–f0221); view west mostly fog and a roof corner (f0223–f0297) | Forum/street with insulae and temple, a crowd with amphorae at a dry Pompeii-style fountain (one person tips an empty jar); cut to a telephoto view over the roofs toward the far blue hills, with the aqueduct leading to them. |
| 3 GRAVITY | 9.9–13.5 s | "So engineers used one force that never rests: gravity." | Water emerging from a spring in the hills, collected and starting downhill | Pool sitting on flat grass, 2D arcs from nowhere, a channel like a garden wall (f0299–f0403) | Spring in a rocky hillside high above the valley: water emerges from the rock into a stone basin and pours over a lip into the channel; the camera follows the water downhill with the valley and arcade far below (gravity made visible). |
| 4 SURVEY | 13.5–19.5 s | "…a groma for straight lines, and … a chorobates." | Engineer *using* the groma to align ranging poles; workers *using* the chorobates | Engineer stands in front of the groma; table confusing, legs hidden, no action; a meaningless close-up of grass and a beam (f0405–f0585) | (a) Engineer leans to sight along the groma's plumb lines toward an assistant holding a red-and-white ranging pole 30 m away (a straight line of stakes on the ground). (b) Chorobates on 4 braced legs; one worker pours water into the groove while the engineer checks the plumb line against its mark; close-up of the level water in the groove and the plumb bob. |
| 5 SLOPE | 19.5–25.6 s | "…slope down the whole way. At Nîmes … thirty-four centimetres per kilometre." | The channel descending gently across the landscape, water flowing downhill | Flat channel on flat grass; then a decent water POV but with blob water (f0587–f0768) | Long side view of the channel contouring along a hillside down toward the valley, a floating leaf carried along; then the lens rides just above the flowing water (streaks moving away = downhill). |
| 6 TUNNEL | 25.6–30.3 s | "Most of it ran underground… dug shafts and tunnelled between them." | How shafts and tunnels connect | Wishing-well shapes on a grass hill; the connection to the channel never shown (f0770–f0907) | **Cutaway** of the hill (cross-section face with earth strata): vertical shafts from the surface down to the tunnel line, men digging at the faces with picks, baskets hoisted by windlasses, the tunnel meeting from both sides with the channel at the bottom. |
| 7 ARCHES | 30.3–33.5 s | "Only where a valley dropped away did they build arches." | The arcade striding across the valley | Good composition; arch intrados lilac and stretched; river plane flat (f0909–f1003) | Keep the framing idea with the improved materials (voussoirs, projecting stones, weathering), valley floor with the river, and a crane up. |
| 8 CONSTRUCTION | 33.5–41.8 s | "Workers cut blocks of up to six tonnes, lifted them with treadwheel cranes, and set them on wooden frames until each arch could hold itself." | Logical order: dress a block → hoist it with a treadwheel crane → set the voussoirs on the timber centering → keystone in → centering removed, the arch stands | Mallet waved beside a block with no chisel (f1005–f1073); the treadwheel stands alone in front of an arch, not connected to any crane; a floating ledge and translucent slab (f1075–f1159); the centering reads as a wagon wheel (f1161–f1253) | (a) Mason with chisel and mallet on a large block, chips flying, other blocks with lewis holes. (b) Treadwheel crane as one machine: A-frame jib, the wheel at its foot, the rope from the wheel's axle over the pulley at the jib head down to a block held by a lewis, two men walking inside the wheel, the block rising. (c) Low wide on the half-built arch: piers with projecting stones, timber centering, voussoirs from both sides; the keystone is lowered in (thud), then the centering is struck and lowered, and the arch stands on its own. |
| 9 SEALING | 41.8–45.6 s | "…sealed the channel with waterproof mortar made from crushed pottery." | A worker spreading pink mortar in the channel; crushed pottery visible | Doll-like sitting figure, giant face (f1255–f1367) | Worker kneeling in the channel, trowel in hand, spreading pink opus signinum from a basket; a pile of broken pottery and a mortar tub beside the channel; a fresh smooth pink section vs bare stone. |
| 10 PAYOFF | 45.6–51.4 s | "When the spring was opened, water flowed for about a day to reach the city: fountains, baths, and homes." | Gate opens → water surges downhill → water arrives over the arches → the city fountain runs and people rejoice | Sluice frame with no water passing; sprite splash on a wall; water hidden behind the wall in the tracking shot; jets through faces (f1369–f1542) | Gate lifted by a worker, water surges into the channel (3D foam front); the camera races alongside on the arcade top, looking down into the channel at the advancing front; the city castellum fills, the street fountain's spout starts, people fill amphorae and splash; steam rises from the baths. |
| 11 ENDING | 51.4–58.5 s | "Rome built eleven of these… still feeds the Trevi Fountain today." | A majestic final image of the city and the aqueduct at golden hour | Purple roof mass on a blue void; the aqueduct far and hazy (f1544–f1754) | Golden crane-up from the forum over the roofs to reveal the aqueduct arriving across the valley, warm light, sun low, birds; final hold on the arcade. |

---

## C. Historical and spatial logic checklist (v1 failures marked ✗)
| Item | v1 | Plan |
|---|---|---|
| Water flows downhill, source higher than destination | ✗ (everything at 47 m) | Spring ~78 m → castellum ~45 m; downstream-flowing water shader |
| Channel gradient consistent | ✗ (flat) | `channelY(x)` monotonic; the arcade portion near-level |
| Tunnels connect to the channel | ✗ (not shown) | Cutaway shows shafts → tunnel → channel |
| Treadwheel crane is one machine | ✗ | Wheel → axle → rope → jib pulley → lewis → block |
| Construction order (piers → centering → voussoirs → keystone → strike centering) | ✗ partial | Shown in order |
| Tools plausible and used (chisel + mallet, groma, chorobates, trowel, picks, baskets) | ✗ unused | Hands posed on the tools |
| Temple form | ✗ pyramid roof | Pedimented gable temple |
| Street fountain type | ✗ | Pompeii-type lacus with a spout |
| Characters' clothing (tunics, no modern items) | ✓ | Kept; 3D tunics, belts, sandals |
| Building and character dimensions | ✗ inconsistent | Metric modelling, checked against doors and steps |

---

## D. Technical causes of the "poor" look
| Cause | v1 | v2 |
|---|---|---|
| Output resolution | 720×1280 | 1080×1920 native |
| Anti-aliasing | none | MSAA ×4 |
| Shadow map | 1024² | 2048² (wide) / 4096² (close) |
| Characters | 2D overlay canvas | 3D, depth-tested, lit, inked |
| Textures | 1024–2048 canvases, one grass tile | 2048 painted stone with per-block variation, terrain blend by slope/height |
| Post | ink + tone + grade only | ink → depth of field on close-ups (skill values) → bloom (golden) → tone map → grade |
| Encode | CRF 17 from a CRF 12 intermediate | CRF 15, slow preset, High profile, from a near-lossless intermediate |

---

## E. Correction plan and time estimates
| Step | Work | Estimate |
|---|---|---|
| 1 | 3D character system: body, tunic, sandals, bean head with painted face (the skill's face style), rig + 10 animations (idle, walk, mallet+chisel, sight groma, pour, crank, rope guide, treadwheel walk, kneel+trowel, cheer/fill jar) | 1 h 30 |
| 2 | World: descending route profile, terrain material blend, heightfield mountains, vegetation, rocks, golden/day light presets | 1 h |
| 3 | Arcade detail (voussoirs, projecting stones, string courses in tier groups), channel with gradient, castellum | 40 min |
| 4 | Spring (caput aquae) set + 3D water system (channel flow, cascades, spout jets, foam front, splashes) | 1 h |
| 5 | Tunnel cutaway set | 45 min |
| 6 | Construction set (crane machine, centering strike, lewis, scaffolds) | 1 h |
| 7 | Forum/city (temple, insulae, baths, fountain) | 1 h |
| 8 | Shot redesign + cameras for all 11 shots | 45 min |
| 9 | Preview stills per shot, inspect, iterate (≥2 rounds) | 1 h 15 |
| 10 | Render 1080×1920 with MSAA/DOF/bloom (benchmark first) | ~1–2 h (machine time) |
| 11 | Re-cue sound to the new picture (new SFX events), re-mix | 30 min |
| 12 | Full-film QA (every shot, continuity, sync, glitches), final report | 45 min |
| **Total** | | **≈ 10–12 h** wall-clock |

The narration (voice, timing, facts) is kept: it was not part of the criticism, and keeping its timing lets the new shots land on the same words. v1 and all its sources are preserved (`final/aqueduct_short_720x1280.mp4`, git history).
