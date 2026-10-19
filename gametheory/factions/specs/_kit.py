"""Shorthand used by every faction spec. Not a faction file itself (no FACTIONS list)."""
FACTIONS = []


def U(name, arch, models=None, ab=(), bl=False, **over):
    """A datasheet: archetype id + faction DNA + absolute stat overrides + abilities.
    ab items: (AB key | 'flat:N' | 'custom' | 'text', name, rules text[, {field overrides}])."""
    d = dict(name=name, arch=arch, ab=list(ab), **over)
    if models:
        d['models'] = models
    if bl:
        d['bl'] = True
    return d


def W(lib, name, **ch):
    """A library weapon renamed (and optionally tweaked): W('heavy_rifle', 'Rivet gun', pen='-2')."""
    return dict(_lib=lib, name=name, **ch)


def NW(name, typ, rng, A, wound, pen, D, *traits):
    """A brand-new weapon profile."""
    return {'name': name, 'type': typ, 'range': rng if typ == 'Ranged' else 'Melee', 'A': str(A), 'wound': wound,
            'pen': str(pen), 'D': str(D), 'traits': list(traits)}


def D(name, play, rule, enh, strats):
    """A detachment. enh: (name, bearer unit, AB key, text[, overrides]); strats: (name, CP, when, effect)."""
    return {'name': name, 'play': play, 'rule': rule, 'enh': enh, 'strats': strats}


def R(name, text, cost=None):
    d = {'name': name, 'text': text}
    if cost:
        d['risk_cost'] = cost
    return d
