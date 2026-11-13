# Opening: voice sheet (for ElevenLabs)

One file per line. Generate 2 or 3 takes of each, keep the best, and name it as below.
Upload them all in one zip. I trim the silence, match the volumes and time the scene to the clips.
**You don't need to get the pauses right.** I add every pause and the cut in code.

## Tips
- Type the lines in normal case, as written here. ALL CAPS makes the voice shout.
- Don't add pauses or "..." for timing. The only exception is Marc's "...Reroll", where the trailing off is the joke.
- Dave: higher **Stability**, so he's the same flat voice every time. Friends: lower Stability for more energy.
- If your model takes tags in [brackets] (Eleven v3 does), the suggested tag is shown on each line. Otherwise, pick the take that sounds closest.
- Export MP3.

## Voices (4)
| Who | Sound |
|---|---|
| **Dave** (DM) | Deep, calm narrator. Totally deadpan. Never annoyed, never excited. |
| **Marc** | Young, bright, over-eager. Talks fast. |
| **Aaron** | Smug and pleased with himself. A little gremlin. |
| **Chris** | Dry, low energy, unimpressed. |

## Lines
| File | Who | Line | How |
|---|---|---|---|
| `open-01-dave` | Dave | For a thousand years, Oakhollow has buried its dead. | [slow, epic narrator] |
| `open-02-marc` | Marc | Sweet! Rolling a d20 to save the village! | [excited, blurting] (Marc's rewrite) |
| `open-03-dave` | Dave | Marc. We haven't started. | [flat, deadpan] no sigh |
| `open-05a-aaron` | Aaron | Nice, Marc. You killed the whole village. I loot everyone. | [delighted] quick |
| `open-05b-aaron` | Aaron | Even the kids. | [matter-of-fact] quieter |
| `open-06-dave` | Dave | They were already dead. It's a graveyard. | [flat, correcting] |
| `open-07-dave` | Dave | Then they got up. | [quiet, ominous] the one serious line |
| `open-08-chris` | Chris | Great. Now they want their stuff back. | [dry, unimpressed] |
| `open-09-dave` | Dave | And someone is paying for their bones. | [narrator] |
| `open-10-dave` | Dave | The survivors speak of something old, beneath the mountain. | [narrator, building] **say the whole line**; I cut it at "beneath the—" so the cut sounds natural |
| `open-11-aaron` | Aaron | A boss. I'm saving my potions. | [smug] fast, cuts Dave off |
| `open-12-chris` | Chris | You won't use them anyway. | [dry] |
| `open-13-dave` | Dave | Fine. Who are you playing tonight? | [gives up, then friendly] |
| `pick-barbarian` | Dave | A barbarian. Good. | [deadpan approval] |
| `pick-paladin` | Dave | A paladin. Good. | same |
| `pick-mage` | Dave | A mage. Good. | same |
| `pick-ranger` | Dave | A ranger. Good. | same |
| `open-15-dave` | Dave | You reach the camp. Roll. | [flat] |
| `open-16-dave` | Dave | A natural twenty. Of course. | [flat, a little tired] |
| `open-17-marc` | Marc | I'll re-roll. | [sulky mutter] (Marc's rewrite) |
| `cheer-marc`, `cheer-aaron`, `cheer-chris` | each | Yeah! | [cheering] optional; I layer them into one cheer |

Total: about 40 seconds of speech. Even 3 takes of everything is about 2 minutes, well inside the free credits.

# Aldo's homecoming (round 111d): voice prompts
Same voices. One clip per voice is fine (I split them). Files become `vo/aldo-NN-<who>.mp3`; once listed in
`VO_LEN` (sound.js) each line plays with its voice; until then the scene runs as captions.

Dave (Adam):
[deadpan, reading it off the page] Father! You brought him home! / [flat] She's eight. / [flat, plain] They had me in a cage. Wolves don't build cages. / [flat] They don't. / [low, steady] Before the wolves took me, I saw a man at the old mine. Tall hat. A lantern that burned green. / [matter-of-fact] Three dangers block the road north. Clear them and I'll cut the fallen tree. / [flat] You can't cut the tree. / [flat, kind] Take something. Rest by the fire. It'll mend you.

Aaron (Declan Sage): [all business] We did. That'll be fifty gold. / [generous] Then forty. / [fast] Not with that attitude. / [casual] Fifty gold's still on the table.

Marc (Mark): [confident] Some do. If they're motivated. / [eager] Or I cut the tree.

Chris (Titan): [dry, certain] Nobody good owns a green lantern.
