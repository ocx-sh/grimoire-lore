#!/usr/bin/env python3
"""Bake a wave receipt into cmake-harvest.template.mjs.

usage: mkharvest.py <wave-journal.jsonl> <wave> <date> <commission|converge> <out.mjs>

Reads every {"type":"result"} line of the dive-wave's journal, keeps the
receipt fields the harvester needs, lists the consolidations on disk, and
writes a runnable harvest script.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.abspath(os.path.join(HERE, '..', '..'))


def main():
    journal, wave, date, mode, out = sys.argv[1:6]
    dives, cons, vers = [], [], []
    events = [json.loads(line) for line in open(journal) if line.strip()]
    labels = {e.get('agentId'): e.get('label', '') for e in events if e.get('type') == 'started'}
    for e in events:
        if e.get('type') != 'result' or not isinstance(e.get('result'), dict):
            continue
        r, label = e['result'], e.get('label') or labels.get(e.get('agentId'), '')
        if 'rule_ids' in r:
            cons.append({'label': label, **r})
        elif 'ledger_path' in r:
            vers.append({'label': label, **r})
        elif 'top_rules' in r:
            dives.append({'label': label, 'path': r.get('path'), 'surprises': r.get('surprises', [])})
    consolidations = sorted(
        os.path.basename(p)[len('cmake-'):-3]
        for p in glob.glob(f'{RESEARCH}/cmake-*.md')
        if os.path.basename(p) not in ('cmake-frame.md', 'cmake-topic-map.md')
    )
    h = {
        'wave': int(wave), 'date': date, 'mode': mode,
        'consolidations': consolidations,
        'receipt': {'dives': dives, 'consolidations': cons, 'verifications': vers},
    }
    tpl = open(os.path.join(HERE, 'cmake-harvest.template.mjs')).read()
    assert '__HARVEST__' in tpl
    open(out, 'w').write(tpl.replace('__HARVEST__', json.dumps(h, indent=1, ensure_ascii=False), 1))
    print(f'{out}: wave {wave} {mode}; {len(dives)} dives, {len(cons)} consolidations, {len(vers)} verifications; on disk {consolidations}')


if __name__ == '__main__':
    main()
