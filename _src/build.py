#!/usr/bin/env python3
"""Gera o site estático de igormarques.art a partir de _src/.

Uso:  python3 _src/build.py          (gera as páginas na raiz do repositório)
      python3 _src/build.py --images (também converte _src/img-src/* para WebP)

Estrutura:
  _src/templates/   layouts e componentes (Jinja2)
  _src/data/        textos PT/EN, projetos e configurações (YAML)
  _src/icons/       SVGs exportados do Figma
  _src/img-src/     imagens originais exportadas do Figma (JPG/PNG)
  assets/           CSS, JS e imagens otimizadas publicados no site
"""
import os, re, sys, json, shutil
from pathlib import Path
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
IMG_SRC = SRC / 'img-src'
IMG_OUT = ROOT / 'assets' / 'img'
WIDTHS = [480, 960, 1440, 2160]

def load(name):
    with open(SRC / 'data' / name, encoding='utf-8') as f:
        return yaml.safe_load(f)

# ---------- logo (vetor redesenhado a partir do quadro final da loadscreen) ----------
def logo_path():
    """Mesmo desenho da animação, coordenadas com origem no canto do ponto."""
    ox, oy = 594, 867
    bx, by, bw, bh, r = 801 - ox, 867 - oy, 693, 328, 18
    A = lambda rad, x, y: f'A{rad},{rad} 0 0 1 {x:g},{y:g}'
    p = f'M{bx + r},{by}'
    aw, ah, ra = 162, 95, 10
    xr = bx + bw + aw
    p += f'H{xr - ra}{A(ra, xr, by + ra)}V{by + ah - ra}{A(ra, xr - ra, by + ah)}H{bx + bw}'
    p += f'V{by + bh - r}{A(r, bx + bw - r, by + bh)}'
    yb, sL, sR, fL = by + bh, bx + 282, bx + 423, bx + 178
    bot, ft, rb, rf = yb + 188, yb + 94, 40, 8
    p += f'H{sR}V{bot - rb}{A(rb, sR - rb, bot)}H{fL + rf}{A(rf, fL, bot - rf)}V{ft + rf}{A(rf, fL + rf, ft)}H{sL}V{yb}'
    p += f'H{bx + r}{A(r, bx, by + bh - r)}V{by + r}{A(r, bx + r, by)}Z'
    def rr(x, y, w, h, rad):
        return (f'M{x + rad},{y}H{x + w - rad}{A(rad, x + w, y + rad)}V{y + h - rad}{A(rad, x + w - rad, y + h)}'
                f'H{x + rad}{A(rad, x, y + h - rad)}V{y + rad}{A(rad, x + rad, y)}Z')
    p += rr(bx + 141, by + 95, 141, 140, 10) + rr(bx + 423, by + 95, 132, 140, 10)
    dot = rr(0, 0, 141, 141, 22)
    return p, dot

LOGO_BODY, LOGO_DOT = logo_path()
LOGO_W, LOGO_H = 1062, 516

def logo_svg(cls='logo', label='Igor Marques Art'):
    return Markup(
        f'<svg class="{cls}" viewBox="0 0 {LOGO_W} {LOGO_H}" role="img" aria-label="{label}">'
        f'<path fill="currentColor" fill-rule="evenodd" d="{LOGO_BODY}"/><path fill="currentColor" d="{LOGO_DOT}"/></svg>')

# ---------- ícones ----------
ICONS = {}
for f in (SRC / 'icons').glob('*.svg'):
    s = f.read_text(encoding='utf-8')
    s = re.sub(r'fill="(black|white|#[0-9A-Fa-f]{6})"', 'fill="currentColor"', s)
    s = s.replace('fill="none" xmlns="http://www.w3.org/2000/svg"', 'aria-hidden="true" focusable="false"')
    ICONS[f.stem] = s

def icon(name, cls=''):
    s = ICONS[name]
    return Markup(s.replace('<svg ', f'<svg class="icon icon-{name} {cls}" ', 1))

# ---------- imagens ----------
def image_meta():
    meta_file = IMG_OUT / 'meta.json'
    return json.loads(meta_file.read_text()) if meta_file.exists() else {}

def build_images():
    from PIL import Image
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    meta = image_meta()
    for src in sorted(IMG_SRC.glob('*')):
        if src.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        name = src.stem
        im = Image.open(src)
        has_alpha = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
        im = im.convert('RGBA' if has_alpha else 'RGB')
        w, h = im.size
        sizes = []
        for target in WIDTHS:
            if target > w and sizes:
                break
            tw = min(target, w)
            th = round(h * tw / w)
            out = IMG_OUT / f'{name}-{tw}.webp'
            im.resize((tw, th), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
            sizes.append(tw)
        meta[name] = {'w': w, 'h': h, 'sizes': sizes, 'alpha': has_alpha}
        print(f'img  {name}: {w}x{h} -> {sizes}')
    (IMG_OUT / 'meta.json').write_text(json.dumps(meta, indent=1))

def picture(name, alt='', sizes='100vw', cls='', eager=False):
    meta = image_meta().get(name)
    attrs = f'class="img {cls}" alt="{alt}" decoding="async" ' + ('fetchpriority="high"' if eager else 'loading="lazy"')
    if not meta:
        # imagem ainda não exportada: bloco neutro no lugar
        return Markup(f'<span class="img img--pending {cls}" role="img" aria-label="{alt}" data-name="{name}"></span>')
    srcset = ', '.join(f'/assets/img/{name}-{w}.webp {w}w' for w in meta['sizes'])
    default = f'/assets/img/{name}-{meta["sizes"][min(1, len(meta["sizes"]) - 1)]}.webp'
    return Markup(f'<img {attrs} src="{default}" srcset="{srcset}" sizes="{sizes}" width="{meta["w"]}" height="{meta["h"]}">')

# ---------- páginas ----------
PAGES = [
    # (template, caminho PT, caminho EN)
    ('home.html', '', 'en/'),
]

def main():
    if '--images' in sys.argv:
        build_images()
    site = load('site.yml')
    projects = load('projects.yml')
    strings = {'pt': load('pt.yml'), 'en': load('en.yml')}
    env = Environment(loader=FileSystemLoader(SRC / 'templates'), autoescape=select_autoescape(['html']),
                      trim_blocks=True, lstrip_blocks=True)
    env.globals.update(icon=icon, logo_svg=logo_svg, picture=picture, site=site, projects=projects)
    for tpl, pt_path, en_path in PAGES:
        for lang, path in (('pt', pt_path), ('en', en_path)):
            t = strings[lang]
            prefix = '/' if lang == 'pt' else '/en/'
            ctx = dict(lang=lang, t=t, prefix=prefix, path=path,
                       alt_pt='/' + pt_path, alt_en='/' + en_path, page=tpl.replace('.html', ''))
            html = env.get_template(tpl).render(**ctx)
            out = ROOT / path / 'index.html'
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding='utf-8')
            print('page', out.relative_to(ROOT))
    (ROOT / '.nojekyll').write_text('')

if __name__ == '__main__':
    main()
