// Example 1: a new monster built on an existing family (the skeleton). No new body code: only a
// look (what it carries and wears) and its numbers. The simplest kind of submission.
ART.monster({
  id: 'bone_captain',
  name: 'BONE CAPTAIN',
  family: 'skeleton',
  look: { weapon: 'sword', shield: true, armored: true, helm: true, bone: M.OLDBONE, eye: M.FIREM, scale: 1.2 },
  stats: { hp: 30, dmg: [4, 8], speed: 26, reach: 1.35, xp: 34, chest: 26, shadow: 8, minLevel: 2 },
});
