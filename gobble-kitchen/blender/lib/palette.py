"""The one shared palette. build_all.py mirrors it to src/game/palette.json for the game."""

PALETTE = {
    # the plan's palette
    'pumpkin':   '#E8833A',
    'cranberry': '#B23A48',
    'butter':    '#F6D58E',
    'cream':     '#FFF4E0',
    'crust':     '#D9A066',
    'roast':     '#B8673A',
    'cinnamon':  '#8C5A3C',
    'wood':      '#C68B59',
    'sage':      '#8FAE7E',
    'green':     '#4F7A5A',
    'teal':      '#7FB8B0',
    'shadow':    '#5B3A55',   # plum, never black
    'ink':       '#3B2630',
    # neutrals and helpers derived from it
    'wall':      '#F8E4C4',
    'wall_dining': '#F3C9A0',
    'tile_a':    '#F1D3AC',
    'tile_b':    '#E4BC8D',
    'wood_light': '#DDAA78',
    'wood_dark': '#9A6642',
    'steel':     '#CDC6C6',
    'steel_dark': '#8E848C',
    'ceramic':   '#FFF9EE',
    'potato_skin': '#B58350',
    'potato_spot': '#8F6238',
    'potato':    '#F5E3A6',
    'mash':      '#FBEDBE',
    'jelly':     '#C22F4B',
    'jelly_dark': '#8E2238',
    'feather':   '#A8683F',
    'feather_dark': '#7A4630',
    'feather_light': '#E0A46A',
    'beak':      '#F2B33D',
    'wattle':    '#D8453F',
    'white':     '#FFFFFF',
    'eye':       '#2C1B26',
    'glass':     '#3A2A3A',
    'glow':      '#FFD27A',
    'sky':       '#7FB8B0',
    'cloud':     '#FDF6E6',
    'leaf':      '#D9772F',
    'cat':       '#EFA35C',
    'cat_dark':  '#C97A3A',
    'bean':      '#6FA24A',
    'bean_dark': '#4E8238',
    'celery':    '#A9CC6B',
    'bread':     '#F1D49B',
    'toast':     '#D69A4E',
    'sweet':     '#EE8E3C',
    'sweet_dark': '#CF6B26',
    'marsh':     '#FFFDF6',
    'dough':     '#F3DFB2',
    'pie_fill':  '#D8762B',
    'juice':     '#E9B552',
    'herb':      '#5C9A4C',
}


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(key_or_hex):
    """Linear RGB tuple for a palette key or a '#RRGGBB' string."""
    h = PALETTE.get(key_or_hex, key_or_hex).lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def mix(a, b, t):
    a, b = lin(a) if isinstance(a, str) else a, lin(b) if isinstance(b, str) else b
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


# AO multiplies toward this (the plum shadow tint relative to white), never to black.
SHADOW_MULT = (0.60, 0.44, 0.58)
