from pathlib import Path

PLAYERS = [
    'aniesa-rohleder','brooklyn-gering','brynna-peter','claire-jack','hailey-marsh',
    'lakyn-farley','lydia-copeland','maia-waddell','makenna-whitaker','maleah-pena',
    'matti-hardy','megan-ryan','tayte-stepps'
]
TAG = '<script src="/hotb-stats-live.js?v=20261018"></script>'

for slug in PLAYERS:
    path = Path(slug) / 'index.html'
    text = path.read_text(encoding='utf-8')
    # Replace any older injected HotB stats loader, or add it once before </body>.
    import re
    text = re.sub(r'<script src="/hotb-stats-live\.js\?v=[^"]+"></script>', TAG, text)
    if TAG not in text:
        if '</body>' not in text:
            raise RuntimeError(f'Missing </body> in {path}')
        text = text.replace('</body>', TAG + '</body>', 1)
    path.write_text(text, encoding='utf-8')
