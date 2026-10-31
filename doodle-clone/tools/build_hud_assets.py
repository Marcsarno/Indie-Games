#!/usr/bin/env python3
"""Trim + downsize the user's HUD/effects pack to phone-sized WebP. usage: python3 -I tools/build_hud_assets.py <halloween_hud_effects_art dir>"""
import sys, os
from PIL import Image
src = sys.argv[1]
SIZES = {'effects/collect_sparkle': 256, 'effects/landing_puff': 384, 'effects/platform_break_burst': 512, 'effects/pumpkin_bounce_ring': 384,
         'ui/candy_counter': 480, 'ui/score_counter': 480, 'ui/menu_panel': 560, 'ui/pause': 160, 'ui/play': 400, 'ui/retry': 220, 'ui/sound_on': 160, 'ui/sound_off': 160}
tot = 0
for k, w in SIZES.items():
    im = Image.open(os.path.join(src, k + '.png')).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox(); im = im.crop(bb)
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out = 'assets/' + ('fx/' if k.startswith('effects') else 'ui/') + os.path.basename(k) + '.webp'
    os.makedirs(os.path.dirname(out), exist_ok=True); im.save(out, 'WEBP', quality=88, alpha_quality=95, method=6)
    tot += os.path.getsize(out); print(out, im.size)
print(tot // 1024, 'KB total')
