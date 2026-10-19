"""Release factions 20 → 30 datasheets (+10 each) and the v4.3 rule revisions agreed in the Gemini review.
Append mode: the hand-made release files are kept; units are appended (or replaced by name)."""
from _kit import U, W, NW, D, R

Z = {'MOV': 0, 'MS': 0, 'RS': 0, 'ARM': 0, 'MIGHT_inf': 0, 'MIGHT_big': 1.0, 'CTRL': 0}

# =====================================================================================================
# 01 AURIC — pure elite: +10 more elites, no chaff. Rules unchanged (Stances + Solar Overdrive).
# =====================================================================================================
AURIC = dict(
    num='01', name='The Auric Solar-Host', append_to='01_auric_solar_host.json', dna=Z,
    gamble=R('Solar Overdrive', 'Once per round, one unit, when it activates: +1 Attack on all weapons and [SHREDDING WOUNDS] this '
             'activation, but its ARM is 1 worse until it next activates.', 'exposure (durability)'),
    skin={'heavy_rifle': 'Sol-bolter', 'plasma_gun': 'Lumen-plasma', 'chain_blade': 'Sun-chain blade', 'glaive': 'Bastion glaive'},
    units=[
        U('The Sun-Bound Exemplar', 'c2_leader', role='Leader (Epic Warlord)', MOV=7, MS=2, RS=2, ARM=3, MIGHT=8, CTRL=2, WARD=4,
          weapons=[W('heavy_pistol', 'Dawn-spear (ranged)', range='18"', A='2', wound='3+', pen='-2', D='2'), W('relic_blade', 'Dawn-spear', A='6', pen='-3', D='2')],
          ab=[('AU_rr1_all', 'Living Standard', 'Friendly units within 6″ re-roll Hit rolls of 1.'),
              ('flat:8', 'Sun\'s Judgement', 'Once per battle, when it fights, its melee Damage is 3.'),
              ('uny6', 'Unbowed', 'UNYIELDING 6+.')]),
        U('Sworn Apothecarion', 'c1_leader', role='Leader (Support)', MOV=6, MS=3, RS=3, ARM=3, MIGHT=4, CTRL=1, weapons=['heavy_pistol', 'chain_blade'],
          ab=[('flat:7', 'Gene-Seed Recovery', 'Once per round, return 1 slain model to the attached Class 1 unit (or heal D3 MIGHT on a Class 2 model within 3″).'),
              ('B_uny6', 'Combat Narthecium', 'The attached unit has UNYIELDING 6+.')]),
        U('Gilded Wardens', 'c2_elite_guard', models=[3, 5], MOV=6, MS=2, RS=3, ARM=3, MIGHT=4, CTRL=2, WARD=4,
          weapons=[W('glaive', 'Warden halberd (ranged)', type='Ranged', range='24"', A='2', wound='3+', pen='-1', D='2', traits=['[ASSAULT]']), W('glaive', 'Warden halberd')],
          ab=[('uny6', 'Vigil Unending', 'UNYIELDING 6+.'), ('flat:6', 'Throne-Guard', 'An attached Leader\'s damage is taken by this unit on a 4+.')]),
        U('Sworn Shield-Veterans', 'c2_heavy_infantry', models=[3, 5], MOV=6, MS=2, RS=4, ARM=3, MIGHT=3, CTRL=1, WARD=5,
          weapons=['heavy_pistol', W('power_weapon', 'Sun-forged sword', A='4', D='2')],
          ab=[('parry', 'Storm Shields', 'Enemies get −1 to Hit them in melee.'), ('atk_m_charge', 'Blade Discipline', '+1 Attack in melee on a round they charged.')]),
        U('Sworn Lumen-Blasters', 'c1_battle_brothers', models=[5, 10], MOV=6, MS=3, RS=3, ARM=3, MIGHT=2, CTRL=1, weapons=['plasma_gun', 'combat_blade'],
          ab=[('custom', 'Overcharged Coils', 'Ranged weapons get +1 Damage on a round they did not Move; each natural 1 to Hit is 1 Fatal Wound to this unit.',
               {'mods': {'dmg_mod': 1}, 'scope': 'ranged', 'uptime': 0.35})]),
        U('Sworn Gryph-Knights', 'c2_cavalry', models=[3, 3], MOV=12, MS=2, RS=3, ARM=3, MIGHT=4, CTRL=1, keywords=['[FLY]'],
          weapons=[W('heavy_rifle', 'Sol-carbine'), W('cavalry_lance', 'Sun-lance', A='4', pen='-2')],
          ab=[('dmg_m_charge', 'Diving Strike', '+1 Damage in melee on a round they charged.')]),
        U('Sworn Siege-walker', 'c3_walker', MOV=6, MS=3, RS=3, ARM=3, MIGHT=10, CTRL=2,
          weapons=['heavy_flamer', W('brute_fists', 'Siege-fist', A='5', D='3')],
          ab=[('uny6', 'Entombed Hero', 'UNYIELDING 6+.'), ('flat:3', 'Wall-Breaker', 'Crushing Impact for 0 CP against units in Dense terrain.')]),
        U('Sunhawk Interceptor', 'c4_battle_tank', MOV=16, MS=5, RS=3, ARM=3, MIGHT=14, CTRL=0, keywords=['[FLY]'],
          weapons=[W('las_lance', 'Sun-lance cannon'), W('heavy_stubber', 'Sol-bolter battery', A='4', pen='-1')],
          ab=[('flat:6', 'Strafing Run', 'May Shoot after its full Move and then make a 3″ move (aircraft only).')]),
        U('Solar Lance-Tank', 'c4_battle_tank', MOV=10, MS=5, RS=3, ARM=3, MIGHT=16, CTRL=2, keywords=['[FLY]'],
          weapons=['las_lance', 'las_lance', 'treads'],
          ab=[('rr1_r', 'Machine-Spirit', 'Re-roll ranged Hit rolls of 1.')]),
        U('Aurum Sentinel-Colossus', 'c4_heavy_walker', MOV=8, MS=2, RS=3, ARM=3, MIGHT=14, CTRL=3, WARD=5,
          weapons=[W('rotary_cannon', 'Sun-fire cannon', pen='-2'), W('brute_fists', 'Colossus fists', A='5')],
          ab=[('flat:6', 'Guardian of the Gate', 'Friendly Class 1–2 units within 3″ get +1 CTRL per model.')]),
    ],
)

# =====================================================================================================
# 02 GOLGOTHA — +10 and the Danger-Close gamble.
# =====================================================================================================
GOLGOTHA = dict(
    num='02', name='The Golgotha Trench-Legions', append_to='02_golgotha_trench_legions.json', dna=Z,
    patch_units={'Trench-Raider Squad': {'battleline': True}},
    gamble=R('Danger-Close', 'When an [INDIRECT FIRE] unit targets an enemy unit within 6″ of a friendly Golgotha unit, it re-rolls '
             'Hit rolls; each unmodified Hit roll of 1 inflicts 1 Fatal Wound on the friendly Golgotha unit closest to the target.',
             'durability (friendly fire)'),
    army=[('custom', 'Danger-Close', 'Artillery re-rolls hits near friendlies.', {'mods': {'reroll_hit': 'all'}, 'scope': 'ranged', 'uptime': 0.1, 'classes': [2, 3, 4, 5]})],
    skin={'service_rifle': 'Las-rifle', 'heavy_rifle': 'Hot-shot rifle'},
    units=[
        U('Marshal-General of the Iron Line', 'c2_leader', role='Leader (Epic Warlord)', MOV=6, MS=4, RS=3, ARM=4, MIGHT=5, CTRL=1, WARD=5,
          weapons=['heavy_pistol', 'power_weapon'],
          ab=[('flat:12', 'Supreme Command', 'Issues 2 Orders per activation; Order range 18″.'), ('B_hit_r', 'Grand Battery', 'The attached unit gets +1 to Hit with ranged weapons.')]),
        U('Regimental Colour-Bearer', 'c1_leader', role='Leader (Support)', MOV=6, MS=4, RS=4, ARM=5, MIGHT=3, CTRL=2, weapons=['pistol', 'combat_blade'],
          ab=[('suppimm', 'Hold the Colours', 'The attached unit cannot be Rattled.'), ('flat:4', 'Rally Point', '+1 CTRL per model for the attached unit.')]),
        U('Veteran Marksman', 'c1_leader', role='Leader (Specialist)', MOV=6, MS=4, RS=2, ARM=5, MIGHT=3, CTRL=1, keywords=['[INFILTRATORS]'],
          weapons=[W('sniper_rifle', 'Long-las', D='3'), 'combat_blade'],
          ab=[('stealth', 'Ghillie Cloak', '[STEALTH].')]),
        U('Engineer Sappers', 'c1_skirmishers', models=[5, 5], MOV=6, MS=4, RS=4, ARM=5, MIGHT=1, CTRL=1,
          weapons=[W('grenade_launcher', 'Demo-charges', range='6"', traits=['[ANTI-VEHICLE 4+]']), 'combat_blade'],
          ab=[('flat:5', 'Dig the Line', 'Once per battle, place a 6″ barricade (Light terrain) wholly within 6″ of this unit.')]),
        U('Penal Legion Breachers', 'c1_assault', models=[10, 10], MOV=7, MS=4, RS=5, ARM=5, MIGHT=1, CTRL=1, keywords=['[EXPENDABLE]'],
          weapons=['pistol', 'chain_blade'],
          ab=[('atk_m_charge', 'Last Chance', '+1 Attack in melee on a round they charged.')]),
        U('Cyber-Mastiff Pack', 'c1_swarm', models=[5, 10], MOV=10, MS=4, RS=6, ARM=5, MIGHT=1, CTRL=1, weapons=[W('claws', 'Steel jaws')],
          ab=[('scouts', 'Run Ahead', '[SCOUTS 6″].')]),
        U('Heavy Mortar Battery', 'c3_weapon_platform', MOV=4, MS=5, RS=4, ARM=4, MIGHT=6, CTRL=1, weapons=[W('siege_howitzer', 'Heavy mortar', range='48"', traits=['[INDIRECT FIRE]', '[SHRAPNEL 2]', '[SUPPRESSIVE]']), 'bayonet'],
          ab=[('flat:3', 'Pre-Sighted', 'Re-roll Hit rolls against units within 3″ of an objective.')]),
        U('Tank-Hunter Destroyer', 'c4_battle_tank', MOV=10, MS=5, RS=4, ARM=3, MIGHT=16, CTRL=2, weapons=[W('las_lance', 'Hunter las-cannon', A='2'), 'heavy_stubber', 'treads'],
          ab=[('hit_r_still', 'Ambush Position', '+1 to Hit if it did not Move.')]),
        U('Inferno-Crawler', 'c4_battle_tank', MOV=10, MS=5, RS=4, ARM=3, MIGHT=14, CTRL=2, weapons=[W('heavy_flamer', 'Inferno cannon', range='16"', A='2D6'), 'heavy_stubber', 'treads'],
          ab=[('flat:4', 'Burn Them Out', 'Units hit in Dense terrain are Rattled on a 4+.')]),
        U('Raptor Drop-Gunship', 'c4_transport', MOV=16, MS=5, RS=4, ARM=3, MIGHT=12, CTRL=0, keywords=['[FLY]', '[TRANSPORT 10]'],
          weapons=[W('rotary_cannon', 'Multi-laser', A='4', pen='0'), W('missile_launcher', 'Hellstrike missiles', A='2'), 'treads'],
          ab=[('flat:4', 'Grav-Chute Drop', 'Units may disembark after it moves (even after its full Move) and still act.')]),
    ],
)

# =====================================================================================================
# 11 CINDER — Burning Vessels REMOVED (involuntary self-damage); voluntary Cinder-Fury instead. +10.
# =====================================================================================================
CINDER = dict(
    num='11', name='The Cinder-Gorged Legion', append_to='11_cinder_gorged_legion.json', dna=Z,
    patch_units={'Ash-Zealots': {'battleline': True}, 'Cinder-Berserkers': {'battleline': True}},
    core=R('Blood-Tithe', 'Every model destroyed (either side) adds 1 Tithe. Permanent army-wide unlocks: 5 → +1″ Move · 10 → melee '
           '[ONSLAUGHT 1] · 15 → [UNYIELDING 5+] · 20 → +1 Damage. No ranged weapons. When shot, a unit may [SURGE D6″] toward the '
           'shooter. (v4.3: Burning Vessels removed — self-damage is now voluntary, see the Gamble.)'),
    gamble=R('Unleashed Cinder-Fury', 'When a unit activates, it may suffer D3 Fatal Wounds (they add to the Tithe): +1 Attack in '
             'melee and its melee weapons gain [CRASHING] this activation.', 'durability (voluntary)'),
    army=[('custom', 'Tithe 5: Haste', '+1″ Move.', {'mods': {'move_mod': 1}, 'scope': 'defense', 'uptime': 0.75}),
          ('custom', 'Tithe 10: Frenzy', 'Melee [ONSLAUGHT 1].', {'mods': {'sustained': 1}, 'scope': 'melee', 'uptime': 0.5}),
          ('custom', 'Tithe 15: Unyielding', 'UNYIELDING 5+.', {'mods': {'unyielding': 5}, 'scope': 'defense', 'uptime': 0.3}),
          ('custom', 'Tithe 20: Slaughter', '+1 Damage.', {'mods': {'dmg_mod': 1}, 'scope': 'melee', 'uptime': 0.15}),
          ('surge', 'Surge', 'Surge D6″ when shot.'),
          ('custom', 'Unleashed Cinder-Fury', 'Voluntary +1 Attack.', {'mods': {'attacks_mod': 1, 'wound_mod': 1}, 'scope': 'melee', 'uptime': 0.12})],
    units=[
        U('Cinder-Prince Ascendant', 'c4_behemoth_beast', role='Leader (Warlord)', MOV=10, MS=2, RS=6, ARM=3, MIGHT=14, CTRL=3, WARD=5, keywords=['[FLY]'],
          weapons=[W('relic_blade', 'Hellforged greataxe', A='6', wound='2+', pen='-3', D='3'), W('monster_talons', 'Brass talons', A='4')],
          ab=[('AU_atk_m', 'Lord of Slaughter', 'Friendly units within 9″ get +1 Attack on a round they charged.'), ('flat:6', 'Skull-Throne Favour', 'Each enemy Leader it destroys adds 3 Tithe.')]),
        U('Gorethane the Unchained', 'c2_leader', role='Leader (Epic Champion)', MOV=7, MS=2, RS=6, ARM=3, MIGHT=6, CTRL=1, WARD=5,
          weapons=[W('relic_blade', 'Bone-splitter', A='7', pen='-3', D='2')],
          ab=[('first', 'Unstoppable', '[STRIKE FIRST] on a round he charged.'), ('B_atk_m', 'The Betrayer\'s Rage', 'The attached unit gets +1 Attack in melee.')]),
        U('Blood-Priest of the Tithe', 'c1_leader', role='Leader (Support)', MOV=7, MS=3, RS=6, ARM=4, MIGHT=4, CTRL=1, WARD=5,
          weapons=[W('power_weapon', 'Sacrificial cleaver')],
          ab=[('flat:6', 'Offer the Skulls', 'When the attached unit destroys an enemy unit, +2 Tithe.'), ('B_wnd_m', 'Blood-Chant', 'The attached unit gets +1 to Wound on a round it charged.')]),
        U('Skull-Takers', 'c1_skirmishers', models=[3, 5], MOV=8, MS=3, RS=6, ARM=5, MIGHT=1, CTRL=1, keywords=['[INFILTRATORS]'],
          weapons=[W('chain_blade', 'Trophy-blades', A='3', pen='-1')],
          ab=[('custom', 'Head-Hunters', 'Melee [PRECISION].', {'mods': {'dmg_mod': 1}, 'scope': 'melee', 'uptime': 0.25})]),
        U('Eviscerator Packs', 'c1_battle_brothers', models=[5, 10], MOV=7, MS=3, RS=6, ARM=4, MIGHT=2, CTRL=1, UNYIELDING=6,
          weapons=[W('great_weapon', 'Eviscerator', A='2', wound='3+', pen='-2', D='2')],
          ab=[('atk_m_charge', 'Blood-Rush', '+1 Attack in melee on a round they charged.')]),
        U('Pyre-Knights', 'c2_cavalry', models=[3, 5], MOV=12, MS=3, RS=6, ARM=3, MIGHT=3, CTRL=1,
          weapons=[W('cavalry_lance', 'Pyre-lance', A='3', pen='-2')],
          ab=[('flat:4', 'Burning Charge', 'Crushing Impact for 0 CP on a round they charged.')]),
        U('Skull-Chariot of the Pyre', 'c3_walker', MOV=10, MS=3, RS=6, ARM=4, MIGHT=8, CTRL=2,
          weapons=[W('brute_fists', 'Blade-wheels & riders', A='6', wound='3+', pen='-1', D='1')],
          ab=[('flat:4', 'Scythed Run', 'When it moves over an enemy unit, roll a D6 per enemy model (max 6): each 5+ is 1 Fatal Wound.')]),
        U('Cinder-Spawn', 'c3_monster', MOV=8, MS=3, RS=6, ARM=5, MIGHT=7, CTRL=1,
          weapons=[W('monster_talons', 'Mutant maws', A='D6+2')],
          ab=[('flat:3', 'Tithe-Born', 'May be summoned for 6 Tithe (spent) within 6″ of a Leader, once per battle.')]),
        U('Brass Gore-Carrier', 'c4_transport', MOV=10, MS=4, RS=6, ARM=3, MIGHT=12, CTRL=2, keywords=['[TRANSPORT 10]'],
          weapons=[W('treads', 'Gore-ram', A='5', wound='3+', pen='-1', D='2')],
          ab=[('flat:4', 'Assault Ramp', 'Units that disembark may declare a Charge this activation.')]),
        U('Brass Gore-Wyrm', 'c4_behemoth_beast', MOV=9, MS=3, RS=6, ARM=4, MIGHT=14, CTRL=3,
          weapons=['monster_talons', W('colossal_jaws', 'Furnace-maw')],
          ab=[('uny6', 'Molten Hide', 'UNYIELDING 6+.')]),
    ],
)

# =====================================================================================================
# 16 STARFIRE — glide capped (escape only 1/round), Dawnstone Gems + Overcharged Dawnstone gamble. +10.
# =====================================================================================================
STARFIRE = dict(
    num='16', name='The Starfire High-Court', append_to='16_starfire_high_court.json', dna=Z,
    core=R('Solar Grace & Dawnstones', 'Every unit has [FLY]. After a unit finishes its Shoot or Fight action it may glide 3″. A glide '
           'may leave Engagement Range only if the enemy unit was destroyed, or once per round for the whole army (v4.3 cap). '
           'Dawnstone: each unit carries 1 gem per battle; shatter it when the unit activates for ONE of: +1 to Hit · +1 ARM (to 3+ '
           'cap) until the End of Round · re-roll a Charge roll.'),
    gamble=R('Overcharged Dawnstone', 'Shatter a unit\'s gem for TWO effects at once; that unit can no longer glide for the rest of '
             'the battle.', 'tempo / mobility'),
    army=[('glide', 'Solar Grace', 'Glide 3″ after acting (escape capped 1/round).'),
          ('custom', 'Dawnstone', 'Once per unit per battle.', {'mods': {'hit_mod': 1, 'save_mod': 1}, 'uptime': 0.1})],
    units=[
        U('Aelira Dawnspear, Sun-Herald', 'c3_mounted_leader', role='Leader (Epic Warlord)', MOV=14, MS=2, RS=2, ARM=3, MIGHT=8, CTRL=2, WARD=4, keywords=['[FLY]'],
          weapons=[W('heavy_pistol', 'Sun-spear throw', range='18"', A='2', wound='3+', pen='-2', D='2'), W('relic_blade', 'Dawnspear', A='5', pen='-3', D='2'), W('monster_talons', 'Griffon talons', A='4')],
          ab=[('AU_hit_m', 'Herald of Dawn', 'Friendly units within 9″ get +1 to Hit in melee on a round they charged.'), ('flat:6', 'Second Dawn', 'Once per battle, a unit within 12″ regains its shattered Dawnstone.')]),
        U('Prism Herald', 'c2_leader', role='Leader (Support)', MOV=8, MS=3, RS=2, ARM=4, MIGHT=4, CTRL=1, WARD=5, keywords=['[FLY]'],
          weapons=[W('heavy_pistol', 'Prism-light', range='18"', A='2', traits=['[PSYCHIC / ARCANE]']), 'power_weapon'],
          ab=[('AU_save1', 'Refracting Aegis', 'Friendly units within 6″ get +1 ARM (to 3+ cap) against ranged attacks.')]),
        U('Dawn Sorceress', 'c1_leader', role='Leader (Mystic)', MOV=7, MS=4, RS=3, ARM=5, MIGHT=3, CTRL=1, WARD=4, keywords=['[FLY]'],
          weapons=[W('heavy_pistol', 'Sunburst', range='18"', A='D6', traits=['[PSYCHIC / ARCANE]', '[IGNORES COVER]']), 'power_weapon'],
          ab=[('flat:6', 'Blinding Flare', 'Once per round, an enemy unit within 18″ suffers −1 to Hit until the End of Round.')]),
        U('Sun-Crested Lancers', 'c1_battle_brothers', bl=True, models=[5, 10], MOV=7, MS=3, RS=4, ARM=4, MIGHT=1, CTRL=2, keywords=['[FLY]'],
          weapons=[W('carbine', 'Throwing spears', range='8"'), W('glaive', 'Sun-lance', A='2', pen='-1', D='1')],
          ab=[('custom', 'Shining Phalanx', 'While every model is within 1″ of two others, attacks against this unit suffer −1 to Hit.', {'mods': {'incoming_hit_mod_ranged': -1, 'incoming_hit_mod_melee': -1}, 'scope': 'defense', 'uptime': 0.5})]),
        U('Dawnblade Swordmasters', 'c2_elite_guard', models=[3, 5], MOV=7, MS=2, RS=4, ARM=4, MIGHT=3, CTRL=1, WARD=5, keywords=['[FLY]'],
          weapons=[W('glaive', 'Greatblade', A='3', pen='-2', D='2')],
          ab=[('crit5_m', 'Perfect Strikes', 'Melee Hit rolls of 5+ auto-wound.'), ('parry', 'Deflecting Blades', 'Enemies get −1 to Hit them in melee.')]),
        U('Sun-Forged Wardens', 'c2_heavy_infantry', models=[3, 5], MOV=6, MS=3, RS=3, ARM=3, MIGHT=3, CTRL=1, WARD=5, keywords=['[FLY]'],
          weapons=[W('rotary_cannon', 'Sun-repeater', A='3', pen='-1'), 'great_weapon'],
          ab=[('save1_half', 'Prism Plate', '+1 ARM (to 3+ cap) against PEN 0 and −1.')]),
        U('Light-Weaver Battery', 'c3_weapon_platform', MOV=6, MS=5, RS=3, ARM=4, MIGHT=6, CTRL=1, keywords=['[FLY]'],
          weapons=[W('siege_howitzer', 'Light-weave array', range='48"', traits=['[IGNORES COVER]', '[SHRAPNEL 1]']), 'bayonet'],
          ab=[('flat:4', 'Dazzle', 'Units hit cannot claim Cover until the End of Round.')]),
        U('Zephyr Elemental', 'c3_monster', MOV=12, MS=3, RS=4, ARM=5, MIGHT=8, CTRL=2, WARD=5, keywords=['[FLY]'],
          weapons=[W('monster_talons', 'Cutting winds', A='5')],
          ab=[('flat:5', 'Tailwind', 'Once per round, a friendly unit within 9″ may glide an extra 3″.')]),
        U('Dawn-Wing Gunship', 'c4_battle_tank', MOV=16, MS=5, RS=3, ARM=4, MIGHT=12, CTRL=0, keywords=['[FLY]'],
          weapons=[W('las_lance', 'Sunfire lance', A='2'), W('heavy_stubber', 'Star-repeaters', A='4')],
          ab=[('flat:4', 'Strafing Run', 'May Shoot after a full Move.')]),
        U('Mountain-Spirit Colossus', 'c4_behemoth_beast', MOV=7, MS=3, RS=4, ARM=3, MIGHT=15, CTRL=3, WARD=5,
          weapons=[W('brute_fists', 'Avalanche fists', A='6'), W('siege_howitzer', 'Hurled boulders', range='24"', A='D6', traits=['[SHRAPNEL 1]'])],
          ab=[('flat:5', 'Stone Ward', 'Friendly Class 1–2 units within 3″ claim Cover.')]),
    ],
)

# =====================================================================================================
# 23 APEX — +10 and the Metabolic Overdrive gamble.
# =====================================================================================================
APEX = dict(
    num='23', name='The Apex Bio-Swarm', append_to='23_apex_bio_swarm.json', dna=Z,
    patch_units={'Chitter-Swarm': {'battleline': True}, 'Slasher-Brood': {'battleline': True}},
    gamble=R('Metabolic Overdrive', 'When a unit activates: +2″ MOV and +1 Attack in melee this activation. At the End of Round, roll '
             'a D6: on 1–2 it suffers D3 Fatal Wounds (models die of exhaustion).', 'durability (dice)'),
    army=[('custom', 'Adapt: Scythes', '+1 PEN in melee.', {'mods': {'pen_mod': 1}, 'scope': 'melee', 'uptime': 0.4}),
          ('custom', 'Adapt: Chitin', '+1 ARM.', {'mods': {'save_mod': 1}, 'scope': 'defense', 'uptime': 0.35}),
          ('custom', 'Adapt: Adrenal', '+2″ Move.', {'mods': {'move_mod': 2}, 'scope': 'defense', 'uptime': 0.25}),
          ('custom', 'Metabolic Overdrive', 'Occasional +1 Attack.', {'mods': {'attacks_mod': 1}, 'scope': 'melee', 'uptime': 0.1})],
    skin={},
    units=[
        U('Devourer Prime', 'c2_leader', role='Leader (Epic Champion)', MOV=8, MS=2, RS=4, ARM=4, MIGHT=6, CTRL=1, keywords=['[SYNAPSE]'],
          weapons=[W('relic_blade', 'Bone-scythes', A='6', pen='-2', D='2'), W('pistol', 'Flesh-hooks', range='6"', A='2')],
          ab=[('first', 'Lightning Predator', '[STRIKE FIRST].'), ('B_atk_m', 'Alpha Instinct', 'The attached unit gets +1 Attack in melee.')]),
        U('Winged Hive-Sovereign', 'c4_behemoth_beast', role='Leader (Warlord)', MOV=12, MS=2, RS=3, ARM=4, MIGHT=12, CTRL=3, WARD=5, keywords=['[FLY]', '[SYNAPSE]'],
          weapons=[W('heavy_pistol', 'Bio-cannon', range='24"', A='4', wound='3+', pen='-1', D='2'), W('monster_talons', 'Monstrous scythes', A='6')],
          ab=[('AU_wnd_m', 'Will of the Swarm', 'Friendly units within 9″ get +1 to Wound in melee on a round they charged.'), ('flat:6', 'Synaptic Overlord', 'Synapse range from this model is 12″.')]),
        U('Neuro-Node Lord', 'c1_leader', role='Leader (Synapse)', MOV=6, MS=3, RS=4, ARM=4, MIGHT=4, CTRL=1, keywords=['[SYNAPSE]'],
          weapons=[W('pistol', 'Spine-fist'), W('power_weapon', 'Bone-sword')],
          ab=[('B_uny6', 'Neural Shield', 'The attached unit has UNYIELDING 6+.'), ('flat:4', 'Relay Node', 'Counts as a [SYNAPSE] model for every friendly unit within 6″ of the attached unit.')]),
        U('Acid-Spitter Brood', 'c1_line', models=[5, 10], MOV=6, MS=4, RS=4, ARM=5, MIGHT=1, CTRL=2,
          weapons=[W('carbine', 'Acid-spitter', range='18"', A='2', pen='-1', traits=['[IGNORES COVER]']), W('claws', 'Chitin claws', A='1')],
          ab=[('flat:3', 'Corrosive', 'Units hit suffer −1 ARM until the End of Round on a 5+.')]),
        U('Ripper-Maw Swarm', 'c1_swarm', models=[10, 15], MOV=6, MS=5, RS=6, ARM=6, MIGHT=1, CTRL=1, keywords=['[EXPENDABLE]', '[FRAIL]'],
          weapons=[W('claws', 'Ripper-maws', A='2', pen='0')],
          ab=[('flat:2', 'Living Carpet', 'Enemy units within 1″ suffer −2″ MOV when they Fall Back.')]),
        U('Pyro-Spore Swarm', 'c1_swarm', models=[3, 6], MOV=6, MS=6, RS=6, ARM=7, MIGHT=1, CTRL=0, keywords=['[EXPENDABLE]', '[FRAIL]', '[FLY]', '[DETONATE D3]'],
          weapons=[W('claws', 'Drifting tendrils', A='1')],
          ab=[('flat:4', 'Floating Mines', 'When an enemy unit ends a move within 3″, one model detonates: D3 Fatal Wounds on a 3+ to that unit.')]),
        U('Venom-Lash Brood', 'c2_brutes', models=[3, 5], MOV=7, MS=3, RS=5, ARM=4, MIGHT=4, CTRL=1,
          weapons=[W('power_maul', 'Venom-lashes', A='4', pen='-1', D='2', traits=['[IMPALING HITS]'])],
          ab=[('flat:4', 'Entangle', 'Engaged enemy units cannot Fall Back on a 4+.')]),
        U('Neuro-Shrieker', 'c3_monster', MOV=6, MS=5, RS=3, ARM=4, MIGHT=7, CTRL=1, WARD=5, keywords=['[FLY]', '[SYNAPSE]'],
          weapons=[W('las_lance', 'Psychic shriek', range='24"', traits=['[PSYCHIC / ARCANE]']), 'claws'],
          ab=[('flat:4', 'Shriek', 'Units hit are Rattled on a 4+.')]),
        U('Bio-Artillery Beast', 'c4_artillery', MOV=7, MS=5, RS=4, ARM=4, MIGHT=13, CTRL=1,
          weapons=[W('siege_howitzer', 'Bio-plasma mortar', traits=['[INDIRECT FIRE]', '[SHRAPNEL 2]']), 'monster_talons'],
          ab=[('flat:3', 'Living Ammunition', 'Re-roll Hit rolls of 1 against units within 9″ of a [SYNAPSE] model.')]),
        U('Deep-Burrow Worm', 'c4_transport', MOV=9, MS=4, RS=6, ARM=4, MIGHT=12, CTRL=1, keywords=['[TRANSPORT 10]', '[VANGUARD STRIKE]'],
          weapons=[W('colossal_jaws', 'Grinding maw', A='4')],
          ab=[('flat:4', 'Erupt', 'Arrives by [VANGUARD STRIKE] carrying its passengers (a unit, not a portal).')]),
    ],
)

FACTIONS = [AURIC, GOLGOTHA, CINDER, STARFIRE, APEX]
