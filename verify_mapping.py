"""Audit source PDFs against the app data; --repair rebuilds stale page images.

Requires PyMuPDF and Pillow. Set SKCT_PDF_PASSWORD for encrypted source PDFs.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent


def open_source(name):
    doc = pymupdf.open(ROOT / '온라인 SKCT 유형별 문제집' / f'온라인 SKCT {name}.pdf')
    if doc.needs_pass and not doc.authenticate(os.environ.get('SKCT_PDF_PASSWORD', '')):
        raise ValueError('Set SKCT_PDF_PASSWORD to open the source PDF')
    return doc


def answer_key(page, sequence=False):
    text = page.get_text()
    if sequence:
        pattern = r'(?:[0-9]+번\s*){5}(?:[1-5]\s*){5}'
        result = {}
        for block in re.findall(pattern, text):
            numbers = list(map(int, re.findall(r'[0-9]+', block)))
            result.update(zip(numbers[:5], numbers[5:]))
        return result
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    result, i = {}, 0
    while i < len(lines) - 1:
        number, value = lines[i:i + 2]
        if re.fullmatch(r'[0-9]+', number) and value in list('①②③④⑤12345'):
            result[int(number)] = '①②③④⑤'.index(value) + 1 if value in '①②③④⑤' else int(value)
            i += 2
        else:
            i += 1
    return result


def render(doc, pages):
    images = []
    for number in pages:
        pix = doc[number - 1].get_pixmap(dpi=150, colorspace=pymupdf.csRGB, alpha=False)
        images.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
    if len(images) == 1:
        return images[0]
    output = Image.new('RGB', (max(im.width for im in images), sum(im.height for im in images)), 'white')
    y = 0
    for im in images:
        output.paste(im, (0, y))
        y += im.height
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repair', action='store_true')
    args = parser.parse_args()
    data = json.loads((ROOT / 'data/skct_data.json').read_text(encoding='utf-8'))
    js = (ROOT / 'data/skct_data.js').read_text(encoding='utf-8')
    assert json.loads(js.split(' = ', 1)[1].split(';\n', 1)[0]) == data, 'JS/JSON differ'
    question_doc, solution_doc = open_source('문제'), open_source('해설')
    keys, changes, checked = {}, [], 0
    for section in data['sections']:
        for item in section['questions']:
            text = question_doc[item['page'] - 1].get_text()
            for sub in item['subQuestions']:
                number = sub['num']
                # Match printed two-digit question labels, including isolated labels.
                assert re.search(rf'(?m)^[ \t]*{number:02d}(?:\.|[ \t]|$)', text), (item['id'], number)
                key_page = sub['answer_key_page']
                if key_page not in keys:
                    keys[key_page] = answer_key(solution_doc[key_page - 1], key_page == 111)
                assert keys[key_page][number] == sub['answer'], sub['id']
                assert set(sub['solution_pages']) <= set(item['solution_pages']), sub['id']
                checked += 1
            for field, doc, pages in [('image', question_doc, [item['page']]),
                                      ('solution_image', solution_doc, item['solution_pages'])]:
                path = ROOT / item[field].split('?')[0]
                expected = render(doc, pages)
                with Image.open(path) as existing:
                    same = existing.size == expected.size and hashlib.sha256(existing.convert('RGB').tobytes()).digest() == hashlib.sha256(expected.tobytes()).digest()
                if not same:
                    changes.append({'id': item['id'], 'field': field, 'source_pages': pages})
                    if args.repair:
                        expected.save(path)
    print(json.dumps({'checked_answers': checked, 'image_mismatches': len(changes), 'repaired': args.repair, 'changes': changes}, ensure_ascii=False))
    if changes and not args.repair:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
