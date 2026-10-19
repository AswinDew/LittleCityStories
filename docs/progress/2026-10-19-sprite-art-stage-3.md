# Sprite art upgrade — stage 3

Plan: docs/superpowers/plans/2026-10-18-citizen-sprite-art-upgrade.md, Tasks 3–4.

Authorized: four professions, four separately authored directions, all 312 idle/walk/work frames as isolated previews. Preserve revised villager heads. No active generator, public atlas, runtime, simulation, commit/push or stage 4. Preserve the user's stage-2 work, now recorded in HEAD f5ffb5b (Step 2), in the shared branch.

Pre-flight: Task 3/4 extend draw_citizen(role,direction,state,frame); Task 5 later consumes the exact same 312-frame role/direction/activity contract. Counts and timing stay aligned with the production CLIPS contract. Preview writes only outside public/ and carries (32,60) anchors.

Ruling: continue the established native PowerShell and progress-document workflow; no Bash bookkeeping or automatic commits. The stage-3 checkpoint takes precedence over executing all later stages.

Design: preserve the approved villager idle drawing; reuse its explicitly drawn head views without image mirroring. Farmer has a straw hat and tied apron; lumberjack broader shoulders, vest and beard; builder a headband and leather tool apron. Six-pose gait uses alternating contact, passing and lift with counter-swinging arms. Work changes torso lean, shoulder/hand placement and tool angle, with preparation, contact and recovery. All pixels use the locked project palette, binary alpha and integer geometry.

Task 3: complete — watched idle/walk availability tests fail on the previous villager-only source, then implemented all 128 idle/walk poses. Fixed the initially simultaneous foot lift by making stance and swing complementary; all six walking poses remain distinct and one foot supports y60. Profession shapes differ beyond palette swaps. Original villager idle views remain byte-identical, verified against pre-change hashes.

Task 4: complete — observed contract/export tests fail at 128 versus 312 frames before adding work. All 184 working poses use authored lean/drop/hand/tool tracks. Refined the apron drop toward the pelvis, removed a duplicate water recovery pose, rigidly translated heads/headwear instead of shearing them with the torso, and aligned two-handed grips with rotated tool geometry.

Preview: all 312 originals, 30 contact sheets (native/2×), 30 GIFs (normal/3× slow), overview PNGs, metadata and an HTML gallery under test-results/citizen-style-stage-3. All 377 generated preview files match byte-for-byte across two independent exports. Original eight-pose export remains available for stage-1 reproducibility.

Verification: all 20 Python asset tests passed after the final fixes. All 312 original frames passed the pixel-art skill auditor: zero semi-transparent pixels, zero orphan pixels, max 16 colors, 64px alignment. Palette membership/padding/boot stability/gait/body articulation and correct GIF frame counts/timing are covered by tests. Inspected original/2× work and walk sheets across all directions; normal and slow loops are provided for user review. No runtime or generated production files were changed, so browser/build checks await the integration stage.

Final review: fresh reviewer inspected source, representative rendered sheets and tests. Found one P2 continuity defect: northern villager strap orientation reversed on activity changes and the SW pouch jumped to the other hip. Fixed in one pass after a new regression failed for NE/NW/SW; approved idle remains untouched. Independent trajectory inspection also found planted feet moving forward relative to facing; the new stance-trajectory test failed in all 16 role/direction cases, then passed after reversing stance travel and adjusting arm counter-swing by facing. Full suite: 20/20. Re-exported/re-audited final frames and confirmed all 377 files match the second export. No deferred review findings.

Status: implementation, technical verification and review fixes complete. Stop after this stage; the user reviews previews before stage 4.

## User-requested worker body revision

The user found the farmer, lumberjack and builder bodies distorted. Visual inspection identified overly wide shoulder/elbow strokes and broken-looking internal vest/apron outlines. Redrew the 192 worker frames with a compact continuous torso, shaped sleeves narrowing into forearms/wrists, smaller hands and pockets, fitted aprons, and separately drawn front/back clothing. Simplified the collar and back ties; the lumberjack back now has a continuous vest panel. The existing head drawing, work tracks, grips, durations, gait and baseline remain in place.

All 20 asset tests passed after the revision. All 312 original frames passed the pixel-art auditor (max 16 colors, zero orphan pixels and zero partial alpha). A frame-by-frame comparison against the saved pre-revision source confirmed all 120 villager frames are byte-identical, all 192 worker frames were revised, and all worker foot regions y56–63 are byte-identical. Inspected the updated profession overview plus idle/walk/work sheets across directions, including harvest/chop/build/water. This is still an isolated visual checkpoint, not stage-4 integration.

## User-requested shoulder attachment revision

The user identified untidy shoulder/arm junctions. Separate sleeve cap outlines crossed the torso; tightly raised hands also made the old midpoint elbow collapse toward the shoulder. Worker torso and upper sleeves now form one binary-alpha surface with one 1px outer contour. Sleeve roots sit inside the torso and use rounded caps. A two-link elbow calculation keeps upper arm/forearm length in folded poses and bends outward; near/far forearms and grips keep their layer order. Builder sleeve shade now matches its linen shirt. No change to villager rendering or clip timing.

Added a raised-arm regression, observed it fail before the elbow helper existed, then pass. Final full asset suite: 21/21. All 312 final raw frames passed quality audit (max 16 colors, no partial alpha/orphans); two independent exports match all 377 files. Compared pre-revision source: all 120 villager frames and all 192 worker foot regions remain byte-identical. Inspected profession overview and harvest/chop/build sheets after the final geometry change. A labeled before/after board is saved at test-results/shoulder-attachment-comparison.png. Runtime/public assets remain unchanged; visual review still precedes stage 4.

## User-requested working arms and farmer leg connection revision

The user identified a disappearing arm in harvest/chop/build and partly disconnected-looking farmer legs. Reproduced the symptoms: 68 palm-visibility cases failed because far arms were behind the torso and palms were overwritten by handles/timber; twelve farmer pose cases failed the visible-thigh criterion as the apron dropped across the knees.

Fixed only the 72 harvest/chop/build frames. Reaching far upper arms now render across the chest, forearms appear above the torso, and both palms are drawn after tools and opposite forearms. The existing grips, shoulder contour and tool timing are retained. Body bend tapers to zero at y49 so the hem stays at the hips; an underlying pelvis joins the planted thighs without moving the boots.

Both new regressions passed after the fix. Full suite: 23/23. All 312 raw frames passed pixel-art audit (max 16 colors, zero partial alpha/orphans), and independent exports match 377 files. Pixel comparison: 72 target frames changed, the other 240 frames are byte-identical, and target boot regions y56–63 are byte-identical. Visually inspected all directions of the three updated work sheets; before/after board: test-results/work-hands-and-hips-revised.png. No production migration or stage 4.

## Further visual pose review

The user said the result was still imperfect. Reinspection found automatic elbows still created stretched/folded-looking arms, raised tools crowded the face, the builder support grip reached 24.41px from its opposing shoulder, and near/far grips did not reflect the change from front to back views.

Replaced only harvest/chop/build work-arm solving with explicit elbow/wrist key poses. Raised chop grips/tool tips move outside the head contour; builder holds its timber closer to the body, with a shorter hammer reach. Anatomical leading/support grips stay fixed when switching between north/south views, while near/far layer assignments change. The supporting arm uses its shirt material so it remains readable over the vest. Other activities retain their existing drawing path.

Observed new compact-reach and anatomical-hand regressions fail before implementation, then pass. A fresh independent visual/code review found tool shafts telescoping between frames (axe 25.2–15.8px, hammer 18.8–13.4px, hoe 15.7–21.3px). Tool tips, grips and shaft ends now share one axis with constant authored shaft lengths; a new length/grip regression failed before the fix and passed afterward. Review also identified stiff farmer knees. Harvest now shifts the knees and pelvis slightly during contact, with trouser cuffs ending at the boots. The knee-motion regression failed before this change and passes afterward.

Final verification: 27/27 asset tests. All 312 raw frames passed audit (max 16 palette colors, zero partial alpha/orphans); two independent exports match all 377 files. Pixel comparison confirms 72 target frames changed, the other 240 frames remain byte-identical, and target foot regions x20–43/y56–63 are unchanged. The new knee test initially compared the entire bottom strip, which includes the moving hoe blade at x46–50 or x14–18; it now checks the actual foot region, matching the existing boot-stability contract. Inspected all 72 target poses on four-direction sheets after the final fixes. Updated review board: test-results/work-poses-final-review.png. No outstanding technical review findings; final visual approval remains with the user. Production atlas/runtime and stages 4–5 remain untouched.
