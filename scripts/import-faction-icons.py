"""Regenerates client/public/factions/<faction>.webp from the AsyncTI4 bot's faction emoji images.

    python scripts/import-faction-icons.py TI4_map_generator_bot/src/main/resources/emojis/factions
"""
import sys
from pathlib import Path

from PIL import Image

SIZE = 64  # Shown at up to 32px; 2x for high-DPI screens.

# Faction alias (as in shared/src/data/cards.json) -> image under emojis/factions.
ICONS = {
    'arborec': 'base/Arborec.png', 'ghost': 'base/Ghost.png', 'hacan': 'base/Hacan.png',
    'jolnar': 'base/Jolnar.png', 'l1z1x': 'base/L1Z1X.png', 'letnev': 'base/Letnev.png',
    'mentak': 'base/Mentak.png', 'muaat': 'base/Muaat.png', 'naalu': 'base/Naalu.png',
    'nekro': 'base/Nekro.png', 'saar': 'base/Saar.png', 'sardakk': 'base/Sardakk.png',
    'sol': 'base/Sol.png', 'winnu': 'base/Winnu.png', 'xxcha': 'base/Xxcha.png',
    'yin': 'base/Yin.png', 'yssaril': 'base/Yssaril.png',
    'argent': 'pok/Argent.png', 'cabal': 'pok/Cabal.png', 'empyrean': 'pok/Empyrean.png',
    'keleres': 'pok/Keleres.png', 'mahact': 'pok/Mahact.png', 'naaz': 'pok/Naaz.png',
    'nomad': 'pok/Nomad.png', 'titans': 'pok/Titans.png',
    'bastion': 'thundersedge/Bastion.png', 'crimson': 'thundersedge/Crimson.png',
    'deepwrought': 'thundersedge/Deepwrought.png', 'firmament': 'thundersedge/Firmament.png',
    'ralnel': 'thundersedge/Ralnel.png',
}

source = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'client' / 'public' / 'factions'
out.mkdir(parents=True, exist_ok=True)
for alias, file in ICONS.items():
    image = Image.open(source / file).convert('RGBA')
    image.thumbnail((SIZE, SIZE), Image.LANCZOS)
    image.save(out / f'{alias}.webp', 'WEBP', quality=90)
print(f'Wrote {len(ICONS)} icons to {out}')
