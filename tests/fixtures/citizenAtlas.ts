import manifest from '../../public/generated/manifest.json';

/** Complete atlas contract at either supported density; no production PNG migration. */
export function citizenAtlasFixture(size: 32 | 64) {
  const data = structuredClone(manifest.atlases.citizens);
  const scale = size / data.frameSize.width;
  data.width *= scale; data.height *= scale;
  data.frameSize = { width: size, height: size };
  for (const directions of Object.values(data.animations)) for (const activities of Object.values(directions)) {
    for (const clip of Object.values(activities as Record<string, typeof data.animations.villager.NE.idle>)) {
      clip.anchor.x *= scale; clip.anchor.y *= scale;
      for (const frame of clip.frames) {
        frame.x *= scale; frame.y *= scale; frame.width *= scale; frame.height *= scale;
      }
    }
  }
  return data;
}
