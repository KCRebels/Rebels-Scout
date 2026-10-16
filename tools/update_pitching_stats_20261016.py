from pathlib import Path
import re

DATA={
 'aniesa-rohleder':{'IP':'5.0','ERA':'7.00','WHIP':'2.00','K/BB':'1.33','OBA':'.292','STRIKE %':'58%'},
 'brooklyn-gering':{'IP':'3','ERA':'9.33','WHIP':'2.67','K/BB':'0.17','OBA':'.200','STRIKE %':'49%'},
 'lakyn-farley':{'IP':'6.1','ERA':'1.10','WHIP':'0.63','K/BB':'1.50','OBA':'.095','STRIKE %':'59%'},
 'makenna-whitaker':{'IP':'2','ERA':'7.00','WHIP':'2.50','K/BB':'0.00','OBA':'.286','STRIKE %':'44%'},
 'megan-ryan':{'IP':'4','ERA':'5.25','WHIP':'1.75','K/BB':'3.00','OBA':'.353','STRIKE %':'62%'},
}

def replace_stat(text,label,value):
    # Works on both older plain <strong> tiles and newer data-pitch tiles.
    pat=rf'(<span[^>]*>{re.escape(label)}</span><strong(?: data-pitch="{re.escape(label)}")?>)[^<]*(</strong>)'
    out,n=re.subn(pat,rf'\g<1>{value}\g<2>',text,count=1)
    if n!=1:
        raise RuntimeError(f'{label}: expected one pitching tile, found {n}')
    return out

for folder,stats in DATA.items():
    path=Path(folder)/'index.html'
    text=path.read_text(encoding='utf-8')
    for label,value in stats.items():
        text=replace_stat(text,label,value)
    path.write_text(text,encoding='utf-8')
    print('updated',path)
