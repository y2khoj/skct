"""Extract individually bound SKCT text questions from the local source PDFs.

SKCT_PDF_PASSWORD must be set. Corrections belong in data/text-overrides.json.
Rebuilding fails on missing question boundaries or option labels.
"""
import collections
import html
import json
import re
from pathlib import Path

import pymupdf
from verify_mapping import open_source, answer_key

ROOT = Path(__file__).resolve().parent
CIRCLES = '①②③④⑤'


def clean(text):
    return re.sub(r'[ \t]+', ' ', text.replace('\x01', ' ').replace('\u00a0', ' ')).strip()


def lines(page):
    result = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            line['text'] = ''.join(s['text'] for s in line['spans'])
            if line['text'].strip():
                result.append(line)
    return result


def region_text(page, rect):
    return '\n'.join(clean(line) for line in page.get_text(clip=rect).splitlines() if clean(line))


def visual(page, rect):
    """Keep diagram geometry and actual Unicode text; no full-page PNG conversion."""
    rect = pymupdf.Rect(rect)
    paths = []
    def xy(point):
        return f'{point.x:.3f},{point.y:.3f}'
    def color(rgb):
        return 'none' if rgb is None else '#'+''.join(f'{round(c*255):02x}' for c in rgb[:3])
    for drawing in page.get_drawings():
        if not drawing['rect'].intersects(rect):
            continue
        parts = []
        last = None
        for item in drawing['items']:
            if item[0] == 'l':
                if last != item[1]: parts.append('M'+xy(item[1]))
                parts.append('L'+xy(item[2])); last = item[2]
            elif item[0] == 'c':
                if last != item[1]: parts.append('M'+xy(item[1]))
                parts.append('C'+' '.join(xy(p) for p in item[2:])); last = item[-1]
            elif item[0] == 're':
                r = item[1]; parts.append('M'+xy(r.tl)+'L'+xy(r.tr)+'L'+xy(r.br)+'L'+xy(r.bl)+'Z'); last = None
            elif item[0] == 'qu':
                q = item[1]; parts.append('M'+xy(q.ul)+'L'+xy(q.ur)+'L'+xy(q.lr)+'L'+xy(q.ll)+'Z'); last = None
        if drawing.get('closePath'): parts.append('Z')
        paths.append(f'<path d="{" ".join(parts)}" stroke="{color(drawing.get("color"))}" fill="{color(drawing.get("fill"))}" stroke-width="{drawing.get("width",1) or 0}" fill-rule="{"evenodd" if drawing.get("even_odd") else "nonzero"}"/>')
    texts = []
    for line in lines(page):
        for span in line['spans']:
            bbox = pymupdf.Rect(span['bbox'])
            if not bbox.intersects(rect) or not span['text'].strip(): continue
            x,y = span['origin']; weight = '700' if 'Bold' in span['font'] else '400'
            text = html.escape(span['text'].replace('\x01',' '))
            texts.append(f'<text x="{x:.3f}" y="{y:.3f}" font-family="Malgun Gothic,Arial,sans-serif" font-size="{span["size"]:.3f}" font-weight="{weight}" fill="#{span["color"]:06x}" textLength="{bbox.width:.3f}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">{text}</text>')
    # Source questions use vector diagrams. Raster illustrations, if present, are
    # explicitly preserved in SVG instead of silently omitted.
    import base64
    images = []
    for block in page.get_text('dict')['blocks']:
        if block['type'] != 1 or not pymupdf.Rect(block['bbox']).intersects(rect): continue
        r = pymupdf.Rect(block['bbox']); raw = base64.b64encode(block['image']).decode()
        images.append(f'<image x="{r.x0}" y="{r.y0}" width="{r.width}" height="{r.height}" href="data:image/{block["ext"]};base64,{raw}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{rect.x0} {rect.y0} {rect.width} {rect.height}" role="img">'+''.join(paths+images+texts)+'</svg>'


def headers(page, numbers):
    result = []
    for number in numbers:
        candidates = []
        for line in lines(page):
            if not re.match(rf'^\s*{number:02d}(?:\.|\s|$)', line['text']): continue
            if line['bbox'][1] > page.rect.height-70: continue
            if any('Headline' in s['font'] for s in line['spans']) or re.match(rf'^\s*{number:02d}\.',line['text']):
                candidates.append(line)
        assert len(candidates) == 1, ('question boundary', page.number+1, number, candidates)
        result.append(candidates[0])
    assert [l['bbox'][1] for l in result] == sorted(l['bbox'][1] for l in result)
    return result


def extract_question(page, header, bottom, sub, section, parent):
    top = header['bbox'][1]-1
    selected = [l for l in lines(page) if top <= l['bbox'][1] < bottom and l['bbox'][3] <= bottom+2]
    # Preserve PDF stream order: horizontally aligned fractions have different y
    # positions, so naive y sorting corrupts numerator/denominator association.
    raw = '\n'.join(clean(l['text']) for l in selected)
    raw = re.sub(rf'^\s*{sub["num"]:02d}[.\s]*', '', raw, count=1)
    source_notes = []
    if sub['id'] == 'data_30':
        raw += '\n① 2023년 갑시의 지역별 인구: A 287,824명, B 112,231명, C 122,100명, D 62,045명, E 60,976명.'
        raw += '\n② 2023년 갑시의 분야별 민원건수 비중(%): 교통 62.1, 도로 7.1, 행정 6.9, 환경 3.8, 주택·건축 3.1, 산업·통상 2.2, 경찰·검찰·법원 2.0, 보건 1.4, 교육 1.2, 과학기술 1.2, 수자원 1.1, 세무 1.1, 기타 6.8.'
        raw += '\n③ 2023년 갑시 민원의 상위 10대 키워드(순위순): 불법주정차, 어린이 보호구역, 장애인 전용구역, 친환경차 충전구역, 철도역 신설, 버스노선 신설, 소음, 고속도로 개발, 악취, 소각장 폐쇄.'
        raw += '\n④ 2023년 갑시 지역별 민원건수: A 60,433건, B 35,904건, C 26,852건, D 12,399건, E 10,357건.'
        raw += '\n⑤ 2022년 대비 2023년 갑시 민원건수 증가 분야: 교통·도로·행정. 감소 분야: 보건·세무·교육.'
        source_notes.append('누락되어 있던 원본 PDF 84페이지의 그림 보기를 확인하여 텍스트로 전사함.')
    if sub['id'] == 'data_15':
        assert '⑥' in raw and '⑤' not in raw
        raw = raw.replace('⑥', '⑤')
        source_notes.append('원본의 마지막 보기 표기가 ⑥이지만 다섯 번째 보기이므로 선택 번호 5로 정규화함.')
    markers = list(re.finditer('[①②③④⑤]', raw))
    assert ''.join(m.group() for m in markers) == CIRCLES, ('options', sub['id'], ''.join(m.group() for m in markers))
    body = raw[:markers[0].start()].strip()
    options = []
    for i, marker in enumerate(markers):
        text = raw[marker.end():markers[i+1].start() if i<4 else len(raw)].strip()
        if section == 'seq' and re.fullmatch(r'-?[0-9]+\n-?[0-9]+',text): text = text.replace('\n','/')
        options.append({'id':f'{sub["id"]}_opt_{i+1}', 'number':i+1, 'text':text})
    # Stem ends at the first PDF line break beyond normal wrapped line spacing.
    stem_lines = [header]
    following = sorted([l for l in selected if l['bbox'][1] > header['bbox'][1]+2], key=lambda l:(l['bbox'][1],l['bbox'][0]))
    for line in following:
        if line['bbox'][1]-stem_lines[-1]['bbox'][1] > 25 or re.search('[①②③④⑤]',line['text']): break
        if line['bbox'][0] > header['bbox'][0]+30: break
        stem_lines.append(line)
    stem = ' '.join(clean(l['text']) for l in stem_lines)
    stem = re.sub(rf'^\s*{sub["num"]:02d}[.\s]*','',stem).strip()
    # A bare reasoning question number is followed by premises, not a question stem.
    bare_header = not re.sub(rf'^\s*{sub["num"]:02d}[.\s]*','',clean(header['text']))
    if bare_header:
        stem = '제시된 전제와 결론을 확인하고 알맞은 보기를 고르시오.'
        stem_lines = [header]
    context = body
    if not bare_header:
        context = '\n'.join(body.splitlines()[len(stem_lines):]).strip()
    has_image = any(b['type']==1 and top < b['bbox'][1] < bottom for b in page.get_text('dict')['blocks'])
    complex_layout = section == 'data' or section == 'seq' or has_image or bool(re.search('아래 그림|다음 그림|토너먼트|그림과 같',body))
    entry = {
        'id':sub['id'], 'page_id':parent['id'], 'number':sub['num'], 'section_id':section,
        'section':parent['section'], 'part':parent['part'], 'title':f'{parent["section"]} · {sub["title"]}',
        'stem':stem, 'context':context, 'options':options,
        'answer_option_id':options[sub['answer']-1]['id'],
        'answer_source':'original_answer_key', 'source':{'question_page':page.number+1,
        'bbox':[round(v,3) for v in (0,top,page.rect.width,bottom)],
        'answer_key_page':sub['answer_key_page'],'solution_pages':sub['solution_pages']},
        'raw_text':raw, 'layout_mode':'structured',
        'source_notes':source_notes,
    }
    if complex_layout:
        # Only spatial context goes in SVG. Editable stems and options always
        # render from their canonical fields, never from stale PDF text copies.
        x0 = max(0,min(l['bbox'][0] for l in selected)-8)
        x1 = min(page.rect.width,max(l['bbox'][2] for l in selected)+8)
        option_lines = [l for l in selected if '①' in l['text']]
        option_top = option_lines[0]['bbox'][1]-8 if option_lines else bottom
        if sub['id'] in ['seq_31','seq_34','seq_36']: option_top -= 18
        context_top = max(l['bbox'][3] for l in stem_lines)+3
        rect = pymupdf.Rect(x0,context_top,x1,max(context_top+1,option_top))
        entry['context_svg'] = visual(page,rect)
        entry['layout_mode'] = 'spatial_text'
    if sub['id'] in ['seq_23','seq_24']:
        clock_options = [(10,1),(2,1),(11,3),(8,1),(11,6)] if sub['id']=='seq_23' else [(10,1),(2,1),(6,10),(7,11),(8,5)]
        for option,(black,hollow) in zip(options,clock_options):
            option['text']=f'검정 화살표 {black}시, 빈 화살표 {hollow}시 방향'
            option['diagram']={'type':'clock_arrows','black':black,'hollow':hollow}
    if sub['id'] == 'data_30': entry['source']['question_pages'] = [83,84]
    return entry


def analysis(entry):
    qid, text, n = entry['id'], entry['raw_text'], entry['number']
    if qid.startswith('math_'):
        kind = '농도·혼합' if n<=10 else '일의 양' if n<=19 else '거리·속력·시간' if n<=25 else '부등식·최적화' if n<=30 else '비율·응용'
        method = '미지수를 정의하고 단위와 보존 관계를 식으로 옮긴 뒤 보기와 대조한다.'
    elif qid.startswith('case_'):
        ranges=[(6,'경우의 수'),(11,'이웃·자리 고정'),(15,'정수의 개수'),(17,'중복순열'),(20,'같은 것이 있는 순열'),(23,'원순열·대칭'),(31,'조합'),(35,'중복조합'),(39,'팀 구성'),(45,'조건부 확률')]
        kind=next(label for end,label in ranges if n<=end)
        method='대상의 구별 여부, 순서, 중복, 대칭을 먼저 정하고 경우를 빠짐없이 분할한다.'
    elif qid.startswith('reason_prop_'):
        kind='명제·대우·양화사';method='전제와 결론을 기호화하고 대우·포함 관계·존재 조건으로 각 보기를 검증한다.'
    elif qid.startswith('reason_'):
        kind='참·거짓 조건' if '거짓' in text else '조건 배치·순서';method='등장인물과 조건을 표로 정리하고 가능한 배치를 열거해 보기를 검증한다.'
    elif qid.startswith('seq_'):
        kind='도형 회전' if n in (23,24) else '도형 숫자 규칙' if 5<=n<=22 else '분수 수열' if n in (31,34,36) else '수열 규칙'
        method='차이·비율·교대항·묶음·도형 위치를 비교하고 제안한 규칙이 제시된 모든 항에 맞는지 검증한다.'
    elif qid.startswith('data_'):
        kind='자료 비교·계산';method='표의 단위·분모·기준 시점을 확인한 뒤 보기별로 필요한 계산만 수행한다.'
    else:
        kind='언어 이해·추론';method='지문 근거와 보기 표현을 대조하고 범위·조건·인과·시제의 차이를 확인한다.'
    polarity='부정 선택' if re.search('옳지|일치하지|알 수 없|사용되지|틀린',entry['stem']) else '긍정/조건 선택'
    return {'type':kind,'selection_polarity':polarity,'approach':method,
            'tags':[word for word in ['비율','평균','증가','감소','최대','최소','모든','어떤','거짓','확률','순서','빈칸'] if word in text],
            'shared_passage':bool(entry.get('passage_id')),
            'visual_dependency':entry['layout_mode']=='spatial_text',
            'answer_validation':'원본 정답표와 ID 대조 완료; 독립 재풀이 검증 아님',
            'generation_ready':False,
            'next_validation':'원문 조건을 보존한 풀이 검증과 다섯 보기의 유일 정답 검증 후 출제 템플릿으로 승격'}


def explanation(entry, doc):
    number=entry['number']; pieces=[]
    if entry['id'].startswith(('math_','case_','lang_psat_')):
        return {'format':'source_reference','text':'','note':'손글씨 또는 주석 해설은 원본 해설에서 확인한다. 정답 문장은 연결된 보기 텍스트에서 가져온다.'}
    for page_number in entry['source']['solution_pages']:
        text=doc[page_number-1].get_text().replace('\x01',' ')
        if entry['id'].startswith('seq_'):
            pattern=r'(?m)^[ \t]*([0-9]{2})\.[ \t]*'
        else:
            pattern=r'(?m)^[ \t]*([0-9]{1,2})\.[ \t]*(?=정답|[①②③④⑤])'
        matches=list(re.finditer(pattern,text))
        for i,m in enumerate(matches):
            if int(m.group(1))==number:
                part=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)]
                pieces.append('\n'.join(clean(l) for l in part.splitlines() if clean(l)))
    return {'format':'source_text' if pieces else 'source_reference','text':'\n\n'.join(pieces),
            'note':'원본에서 해당 번호의 해설만 분리함. 해설 안의 도형은 원본 해설을 참고.' if pieces else '원본에 별도 번호의 해설이 없는 문항은 관련 유형 해설 페이지를 참고.'}


def main():
    source = json.loads((ROOT/'data/skct_data.json').read_text(encoding='utf-8'))
    qdoc, adoc = open_source('문제'), open_source('해설')
    bank = {'schema_version':1, 'version':'20260919_text1', 'questions':{}, 'passages':{}}
    for section in source['sections']:
        for parent in section['questions']:
            page = qdoc[parent['page']-1]
            if parent['is_passage']:
                ls = [l for l in lines(page) if 90 < l['bbox'][1] < 770]
                text = '\n'.join(clean(l['text']) for l in ls)
                bank['passages'][parent['id']]={'id':parent['id'], 'text':text, 'source_page':parent['page']}
                continue
            hs = headers(page,[s['num'] for s in parent['subQuestions']])
            for i,sub in enumerate(parent['subQuestions']):
                bottom = hs[i+1]['bbox'][1]-5 if i+1<len(hs) else page.rect.height-70
                entry = extract_question(page,hs[i],bottom,sub,section['id'],parent)
                if parent['page'] in (32,36): entry['passage_id']=f'lang_psat_p{parent["page"]-1}'
                assert answer_key(adoc[sub['answer_key_page']-1],sub['answer_key_page']==111)[sub['num']] == sub['answer']
                bank['questions'][entry['id']]=entry
    overrides = ROOT/'data/text-overrides.json'
    if overrides.exists():
        for qid,values in json.loads(overrides.read_text(encoding='utf-8')).items():
            assert qid in bank['questions'],qid
            bank['questions'][qid].update(values)
    for entry in bank['questions'].values():
        entry['analysis']=analysis(entry)
        entry['explanation']=explanation(entry,adoc)
        entry['answer_text']=next(o['text'] for o in entry['options'] if o['id']==entry['answer_option_id'])
    (ROOT/'data/question-bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'data/question-bank.js').write_text('const SKCT_QUESTION_BANK = '+json.dumps(bank,ensure_ascii=False,indent=2)+';\nif (typeof module !== "undefined") module.exports = SKCT_QUESTION_BANK;\n',encoding='utf-8')
    readable=['# SKCT 텍스트 문제·정답 목록','', '보기·정답의 편집 기준은 question-bank.json이다. 이 파일은 읽기용 출력이다.','']
    for entry in bank['questions'].values():
        readable += [f'## {entry["title"]} [{entry["id"]}]','',entry['stem'],'']
        if entry.get('passage_id'): readable += [bank['passages'][entry['passage_id']]['text'],'']
        readable += [entry['context'],'']
        for t in entry.get('tables',[]):
            readable += [t['caption'], ' | '.join(map(str,t['headers']))]
            readable += [' | '.join(map(str,row)) for row in t['rows']]
            readable += [t.get('notes',''),'']
        if entry.get('figure_description'): readable += [entry['figure_description'],'']
        for option in entry['options']: readable += [f'{CIRCLES[option["number"]-1]} {option["text"]}']
        correct=next(o for o in entry['options'] if o['id']==entry['answer_option_id'])
        readable += ['',f'정답: {correct["number"]}번 — {correct["text"]}',f'유형: {entry["analysis"]["type"]}',f'원본 문제 PDF: {entry["source"].get("question_pages",[entry["source"]["question_page"]])}', '']
    (ROOT/'data/question-bank.md').write_text('\n'.join(readable),encoding='utf-8')
    print(json.dumps({'questions':len(bank['questions']),'passages':len(bank['passages']),'layouts':dict(collections.Counter(q['layout_mode'] for q in bank['questions'].values()))},ensure_ascii=False))


if __name__ == '__main__':
    main()
