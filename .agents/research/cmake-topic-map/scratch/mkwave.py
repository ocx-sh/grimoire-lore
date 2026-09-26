#!/usr/bin/env python3
"""Bake a wave's selection into cmake-dive-wave.template.mjs.

usage: mkwave.py <receipt.json> <wave> <date> <key> <out.mjs>

<receipt.json> is a Workflow task output or journal result holding the map
(or a harvest receipt); <key> is the selection list inside it (wave2,
wave3_staged, wave3, wave4...). already_covered / existing_groups are
derived from the cmake-<group>.md files on disk, so a re-run after a partial
wave stays honest. Workflow args have a size cap, hence the baking.
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, '..', '..'))
SKIP = {'frame', 'topic-map'}


def load(path):
    raw = open(path).read()
    j = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
    r = j.get('result', j)
    if isinstance(r, str):
        r = json.loads(r)
    return r.get('map', r)


def main():
    src, wave, date, key, out = sys.argv[1:6]
    selection = load(src)[key]
    existing, covered = [], []
    for path in sorted(glob.glob(f'{RESEARCH}/cmake-*.md')):
        name = os.path.basename(path)[len('cmake-'):-3]
        if name in SKIP:
            continue
        existing.append(name)
        text = open(path).read()
        fam = re.search(r'^id_family:\s*(.+)$', text, re.M)
        title = re.search(r'^title:\s*(.+)$', text, re.M)
        covered.append(
            f"cmake-{name}.md — {title.group(1).strip() if title else name}"
            f"{' (family ' + fam.group(1).strip() + ')' if fam else ''}"
        )
    args = {
        'wave': int(wave),
        'date': date,
        'selection': selection,
        'already_covered': covered,
        'existing_groups': existing,
    }
    tpl = open(os.path.join(HERE, 'cmake-dive-wave.template.mjs')).read()
    assert '__ARGS__' in tpl
    open(out, 'w').write(tpl.replace('__ARGS__', json.dumps(args, indent=1, ensure_ascii=False), 1))
    groups = sorted({s['group'] for s in selection})
    print(f'{out}: wave {wave}, {len(selection)} dives, groups {groups}, existing {existing}')


if __name__ == '__main__':
    main()
