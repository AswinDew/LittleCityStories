from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ProjectSkillTests(unittest.TestCase):
    def test_four_scoped_project_skills_exist_with_real_commands(self):
        for name in ['city-builder-engine', 'economy-simulation', 'procedural-game-assets', 'game-playtesting']:
            with self.subTest(name=name):
                path = ROOT / '.agents/skills' / name / 'SKILL.md'
                self.assertTrue(path.is_file(), str(path))
                content = path.read_text(encoding='utf-8')
                self.assertIn('name: ' + name, content)
                self.assertIn('description: Use when', content)
                for reference in re.findall(r'(?:src|tools|tests)/[A-Za-z0-9_./-]+\.(?:ts|py|json)', content):
                    self.assertTrue((ROOT / reference).is_file(), reference)


if __name__ == '__main__':
    unittest.main()
