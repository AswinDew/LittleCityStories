"""Preview-only art contract; does not replace the active citizen atlas."""
import sys
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/assets'))

from citizen_style import CLIPS, draw_citizen
from primitives import palette
from preview_citizens import preview, preview_all


class CitizenStyleTests(unittest.TestCase):
    def test_eight_idle_poses_are_crisp_padded_and_keep_their_feet_planted(self):
        allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
        signatures = []
        for direction in ('NE', 'NW', 'SE', 'SW'):
            frames = [draw_citizen('villager', direction, 'idle', frame) for frame in range(2)]
            self.assertNotEqual(frames[0].tobytes(), frames[1].tobytes())
            signatures.append(frames[0].tobytes())
            for image in frames:
                self.assertEqual(image.mode, 'RGBA')
                self.assertEqual(image.size, (64, 64))
                left, top, right, bottom = image.getbbox()
                self.assertGreaterEqual(left, 2)
                self.assertGreaterEqual(top, 2)
                self.assertLessEqual(right, 62)
                self.assertEqual(bottom, 61)
                self.assertTrue(48 <= bottom - top <= 54)
                for pixel in image.get_flattened_data():
                    self.assertIn(pixel[3], (0, 255))
                    if pixel[3]: self.assertIn(pixel[:3], allowed)
            self.assertEqual(frames[0].crop((0, 54, 64, 64)).tobytes(), frames[1].crop((0, 54, 64, 64)).tobytes())
        self.assertEqual(len(set(signatures)), 4)

    def test_directions_are_authored_individually_and_rendering_is_repeatable(self):
        for north, south in [('NE', 'SE'), ('NW', 'SW')]:
            self.assertNotEqual(draw_citizen('villager', north, 'idle', 0).tobytes(), draw_citizen('villager', south, 'idle', 0).tobytes())
        ne = draw_citizen('villager', 'NE', 'idle', 0)
        nw = draw_citizen('villager', 'NW', 'idle', 0)
        self.assertNotEqual(ne.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(), nw.tobytes())
        self.assertEqual(ne.tobytes(), draw_citizen('villager', 'NE', 'idle', 0).tobytes())

    def test_unimplemented_poses_are_rejected_instead_of_faked(self):
        for args in [('merchant', 'SE', 'idle', 0), ('villager', 'S', 'idle', 0),
                     ('builder', 'SE', 'harvest', 0), ('villager', 'SE', 'idle', -1),
                     ('villager', 'SE', 'idle', 2), ('villager', 'SE', 'idle', True),
                     ('villager', 'SE', 'idle', 0.5), ('farmer', 'NW', 'walk', 6)]:
            with self.subTest(args=args), self.assertRaises(ValueError): draw_citizen(*args)

    def test_preview_exports_all_eight_original_size_frames_and_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            output = preview(temp)
            metadata = json.loads((output / 'preview.json').read_text())
            self.assertTrue(metadata['previewOnly'])
            self.assertEqual(metadata['frameSize'], [64, 64])
            self.assertEqual(metadata['anchor'], [32, 60])
            self.assertEqual(len(metadata['poses']), 8)
            for pose in metadata['poses']:
                with Image.open(output / pose['file']) as image:
                    expected = draw_citizen('villager', pose['direction'], 'idle', pose['frame'])
                    self.assertEqual(image.tobytes(), expected.tobytes())
            with Image.open(output / 'idle-preview.gif') as gif:
                self.assertEqual(gif.n_frames, 2)
                self.assertEqual(gif.info['duration'], 500)

    def test_preview_cannot_replace_public_game_assets(self):
        for path in [ROOT / 'public', ROOT / 'public/generated/characters']:
            with self.subTest(path=path), self.assertRaises(ValueError): preview(path)

    def assert_clean_frame(self, image):
        allowed = {tuple(bytes.fromhex(value[1:])) for value in palette().values()}
        self.assertEqual(image.mode, 'RGBA'); self.assertEqual(image.size, (64, 64))
        left, top, right, bottom = image.getbbox()
        self.assertGreaterEqual(min(left, top), 2)
        self.assertLessEqual(max(right, bottom), 62)
        self.assertEqual(bottom, 61)
        for pixel in image.get_flattened_data():
            self.assertIn(pixel[3], (0, 255))
            if pixel[3]: self.assertIn(pixel[:3], allowed)

    def test_all_four_professions_have_idle_and_a_six_pose_gait(self):
        silhouettes = []
        for role in ('villager', 'farmer', 'lumberjack', 'builder'):
            for direction in ('NE', 'NW', 'SE', 'SW'):
                with self.subTest(role=role, direction=direction):
                    idle = [draw_citizen(role, direction, 'idle', i) for i in range(2)]
                    walk = [draw_citizen(role, direction, 'walk', i) for i in range(6)]
                    for image in idle + walk: self.assert_clean_frame(image)
                    self.assertEqual(idle[0].crop((0, 54, 64, 64)).tobytes(), idle[1].crop((0, 54, 64, 64)).tobytes())
                    self.assertEqual(len({image.tobytes() for image in walk}), 6)
                    self.assertGreaterEqual(len({image.crop((16, 49, 48, 64)).tobytes() for image in walk}), 4)
                    if direction == 'SE': silhouettes.append(idle[0].getchannel('A').tobytes())
        # Profession identities must change the shape, not merely the clothing hue.
        self.assertEqual(len(set(silhouettes)), 4)

    def test_all_work_clips_keep_contract_tools_in_frame_and_feet_still(self):
        expected = {
            'villager': [('idle', 2, 500), ('walk', 6, 100), ('work', 6, 120), ('mine', 8, 140), ('research', 8, 180)],
            'farmer': [('idle', 2, 500), ('walk', 6, 100), ('harvest', 6, 120), ('water', 6, 160)],
            'lumberjack': [('idle', 2, 500), ('walk', 6, 100), ('chop', 6, 120)],
            'builder': [('idle', 2, 500), ('walk', 6, 100), ('build', 6, 120)],
        }
        self.assertEqual(CLIPS, expected)
        from characters import CLIPS as production_clips
        self.assertEqual(CLIPS, production_clips)
        self.assertEqual(sum(count * 4 for clips in CLIPS.values() for _, count, _ in clips), 312)
        for role, clips in expected.items():
            for state, count, _ in clips[2:]:
                for direction in ('NE', 'NW', 'SE', 'SW'):
                    with self.subTest(role=role, state=state, direction=direction):
                        frames = [draw_citizen(role, direction, state, i) for i in range(count)]
                        for image in frames: self.assert_clean_frame(image)
                        self.assertEqual(len({image.tobytes() for image in frames}), count)
                        self.assertEqual(len({image.crop((20, 56, 44, 64)).tobytes() for image in frames}), 1)
                        # Work must articulate the worker too, not just move an isolated tool.
                        self.assertGreaterEqual(len({image.crop((20, 27, 45, 45)).tobytes() for image in frames}), 4)

    def test_complete_preview_exports_originals_and_correct_normal_slow_timing(self):
        with tempfile.TemporaryDirectory() as temp:
            output = preview_all(temp)
            data = json.loads((output / 'preview-all.json').read_text())
            self.assertEqual(len(data['poses']), 312)
            self.assertTrue(data['previewOnly']); self.assertEqual(data['anchor'], [32, 60])
            self.assertEqual(data['frameSize'], [64, 64]); self.assertEqual(len(data['clips']), 15)
            self.assertEqual(len({pose['file'] for pose in data['poses']}), 312)
            for pose in data['poses']:
                with Image.open(output / pose['file']) as image:
                    self.assertEqual(image.tobytes(), draw_citizen(pose['role'], pose['direction'], pose['state'], pose['frame']).tobytes())
            for clip in data['clips']:
                for speed, multiplier in [('normal', 1), ('slow', 3)]:
                    with Image.open(output / clip[speed]) as gif:
                        self.assertEqual(gif.n_frames, clip['frameCount'])
                        for i in range(gif.n_frames):
                            gif.seek(i)
                            self.assertEqual(gif.info['duration'], clip['frameDurationMs'] * multiplier)
                self.assertTrue((output / clip['sheet']).is_file())
            self.assertTrue((output / 'index.html').is_file())
        with self.assertRaises(ValueError): preview_all(ROOT / 'public/generated')

    def test_revised_villager_faces_stay_rigid_during_the_walk(self):
        for direction in ('NE', 'NW', 'SE', 'SW'):
            head = draw_citizen('villager', direction, 'idle', 0).crop((18, 7, 48, 28))
            for frame, bob in enumerate((0, -1, 0, 0, -1, 0)):
                with self.subTest(direction=direction, frame=frame):
                    walk = draw_citizen('villager', direction, 'walk', frame)
                    self.assertEqual(head.tobytes(), walk.crop((18, 7 + bob, 48, 28 + bob)).tobytes())

    def test_planted_walk_foot_moves_back_relative_to_forward_travel(self):
        for role in CLIPS:
            for direction in ('NE', 'NW', 'SE', 'SW'):
                facing = 1 if direction.endswith('E') else -1
                centers = []
                for frame in (1, 2):
                    image = draw_citizen(role, direction, 'walk', frame)
                    planted = [x for x in range(64) if image.getpixel((x, 60))[3]]
                    centers.append(sum(planted) / len(planted))
                with self.subTest(role=role, direction=direction):
                    self.assertLess((centers[1] - centers[0]) * facing, 0)

    def test_villager_strap_and_pouch_stay_on_the_same_side_after_idle(self):
        colors = palette()
        rgb = lambda name: tuple(bytes.fromhex(colors[name][1:]))
        def strap_side(image):
            xs = [x for y in range(32, 38) for x in range(26, 42) if image.getpixel((x, y))[:3] == rgb('wood_light')]
            self.assertTrue(xs)
            return sum(xs) / len(xs) > 32
        def pouch_side(image):
            counts = [sum(image.getpixel((x, y))[:3] == rgb('wood') for x in range(left, right) for y in range(40, 53))
                      for left, right in [(16, 32), (32, 48)]]
            return (counts[0] > counts[1]) - (counts[1] > counts[0])
        for direction in ('NE', 'NW', 'SE', 'SW'):
            idle = draw_citizen('villager', direction, 'idle', 0)
            walk = draw_citizen('villager', direction, 'walk', 0)
            with self.subTest(direction=direction):
                self.assertEqual(strap_side(walk), strap_side(idle))
                self.assertEqual(pouch_side(walk), pouch_side(idle))

    def test_raised_arm_keeps_a_bent_upper_arm_instead_of_collapsing_at_the_shoulder(self):
        from citizen_style import _arm_elbow
        from math import hypot
        for side in (-1, 1):
            shoulder = (32 + side * 8, 31)
            for hand in [(shoulder[0], 26), (shoulder[0] + side * 2, 30), (shoulder[0] - side * 2, 35)]:
                elbow = _arm_elbow(shoulder, hand, side)
                self.assertTrue(all(type(value) is int for value in elbow))
                self.assertTrue(6 <= hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]) <= 8)
                self.assertTrue(7 <= hypot(elbow[0] - hand[0], elbow[1] - hand[1]) <= 9)
                self.assertGreater((elbow[0] - shoulder[0]) * side, 0)

    def test_both_working_palms_remain_visible_above_tools_and_the_torso(self):
        from citizen_style import _work_motion
        colors = palette()
        skin = {tuple(bytes.fromhex(colors[key][1:])) for key in ('skin', 'skin_shadow', 'skin_light')}
        for role, state in [('farmer', 'harvest'), ('lumberjack', 'chop'), ('builder', 'build')]:
            for direction in ('NE', 'NW', 'SE', 'SW'):
                for frame in range(6):
                    image = draw_citizen(role, direction, state, frame)
                    hands = _work_motion(state, frame, 1 if direction.endswith('E') else -1, direction)
                    for hand in ('far', 'near'):
                        with self.subTest(role=role, direction=direction, frame=frame, hand=hand):
                            self.assertIn(image.getpixel(hands[hand])[:3], skin)

    def test_farmer_thighs_stay_visible_and_connected_during_the_deep_harvest_bend(self):
        colors = palette()
        trousers = {tuple(bytes.fromhex(colors[key][1:])) for key in ('wood_dark', 'green_dark')}
        for direction in ('NE', 'NW', 'SE', 'SW'):
            for frame in range(6):
                image = draw_citizen('farmer', direction, 'harvest', frame)
                with self.subTest(direction=direction, frame=frame):
                    for hip in (27, 37):
                        self.assertGreaterEqual(sum(image.getpixel((hip, y))[:3] in trousers for y in range(50, 55)), 3)
                    seen, pending = set(), [(32, 46)]
                    while pending:
                        x, y = pending.pop()
                        if (x, y) in seen or not (20 <= x < 44 and 44 <= y < 61) or not image.getpixel((x, y))[3]: continue
                        seen.add((x, y)); pending.extend([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)])
                    self.assertTrue({(27, 52), (37, 52), (27, 58), (37, 58)} <= seen)

    def test_builder_supporting_hand_stays_within_a_compact_reach(self):
        from citizen_style import _work_motion
        from math import hypot
        for facing, shoulder in [(1, (27, 33)), (-1, (37, 33))]:
            pose = _work_motion('build', 0, facing)
            self.assertLessEqual(hypot(pose['far'][0] - shoulder[0], pose['far'][1] - shoulder[1]), 18)

    def test_north_and_south_views_keep_the_tool_in_the_same_anatomical_hand(self):
        from citizen_style import _work_motion
        for state in ('harvest', 'chop', 'build'):
            for frame in range(6):
                for facing, south, north in [(1, 'SE', 'NE'), (-1, 'SW', 'NW')]:
                    front = _work_motion(state, frame, facing, south)
                    back = _work_motion(state, frame, facing, north)
                    self.assertEqual(front['tool_hand'], front['near'])
                    self.assertEqual(back['tool_hand'], back['far'])
                    self.assertEqual(front['tool_hand'], back['tool_hand'])
                    self.assertEqual(front['far'], back['near'])
                    for pose in (front, back):
                        for arm in ('near', 'far'):
                            self.assertEqual(len(pose[f'{arm}_elbow']), 2)

    def test_work_tools_keep_the_same_shaft_length_through_the_swing(self):
        from citizen_style import _work_motion
        from math import hypot
        for state, length in [('harvest', 22), ('chop', 24), ('build', 17)]:
            for direction in ('NE', 'NW', 'SE', 'SW'):
                for frame in range(6):
                    pose = _work_motion(state, frame, 1 if direction.endswith('E') else -1, direction)
                    tip, bottom = pose['tip'], pose['shaft_bottom']
                    actual = hypot(bottom[0] - tip[0], bottom[1] - tip[1])
                    with self.subTest(state=state, direction=direction, frame=frame):
                        self.assertLessEqual(abs(actual - length), 1)
                        hand = pose['tool_hand']
                        distance_to_shaft = abs((bottom[0] - tip[0]) * (tip[1] - hand[1]) -
                                                (tip[0] - hand[0]) * (bottom[1] - tip[1])) / actual
                        self.assertLessEqual(distance_to_shaft, 1)

    def test_farmer_shifts_knees_during_harvest_without_moving_the_boots(self):
        for direction in ('NE', 'NW', 'SE', 'SW'):
            ready = draw_citizen('farmer', direction, 'harvest', 0)
            contact = draw_citizen('farmer', direction, 'harvest', 3)
            with self.subTest(direction=direction):
                self.assertNotEqual(ready.crop((20, 51, 44, 55)).tobytes(), contact.crop((20, 51, 44, 55)).tobytes())
                # Restrict this to the feet: the hoe blade moves beside them.
                self.assertEqual(ready.crop((20, 56, 44, 64)).tobytes(), contact.crop((20, 56, 44, 64)).tobytes())


if __name__ == '__main__':
    unittest.main()
