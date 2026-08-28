#!/usr/bin/env python3
"""
gen-vocab-relations.py — relations-authoring scaffold for the vocab review
"match a similar / opposite word" exercises.

Author antonyms and near-synonyms compactly below (ANTO / NSYN_SENSE / NSYN_TEXT).
The generator (self-contained — reads the seed-vocab-*.sql files in this dir):
  * builds the sense inventory + folds in relations already seeded in the courses,
  * validates every slug exists in the corpus,
  * rejects self-links,
  * auto-symmetrises antonyms and in-corpus near-synonyms (adds the reverse row),
  * de-duplicates,
  * emits an idempotent seed (scoped DELETE of antonym/near_synonym/synonym rows
    for the authored from-senses, then INSERT). Confusable/hypernym/hyponym rows
    seeded elsewhere are left untouched.

Run:  python3 gen-vocab-relations.py        (from supabase/)
Out:  ./seed-vocab-relations.sql
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# ── read the corpus straight from the course seeds (no external data files) ──
_SENSE_RE = re.compile(
    r"\(\(SELECT id FROM vocab_words WHERE normalized='([^']+)'\)\s*,\s*"
    r"'([^']+)'\s*,\s*\d+\s*,\s*(?:TRUE|FALSE)\s*,\s*'([^']+)'\s*,\s*'((?:[^']|'')*)'")
_REL_RE = re.compile(
    r"\(\(SELECT id FROM vocab_senses WHERE slug='([^']+)'\)\s*,\s*"
    r"(?:NULL|\(SELECT id FROM vocab_senses WHERE slug='([^']+)'\))\s*,\s*"
    r"(NULL|'(?:[^']|'')*')\s*,\s*'([a-z_]+)'")

SEN, _seen = [], set()
EXISTING = []
for f in sorted(glob.glob(os.path.join(HERE, 'seed-vocab-10[123]-*.sql'))):
    if 'pilot' in os.path.basename(f):
        continue  # pilot seed is not part of the applied corpus
    txt = open(f, encoding='utf-8', errors='ignore').read()
    for line in txt.splitlines():
        m = _SENSE_RE.search(line)
        if m and m.group(2) not in _seen:
            _seen.add(m.group(2))
            SEN.append({'slug': m.group(2), 'word': m.group(1),
                        'pos': m.group(3), 'gloss': m.group(4).replace("''", "'")})
    for blk in re.split(r'INSERT INTO ', txt):
        if not blk.startswith('vocab_relations'):
            continue
        for m in _REL_RE.finditer(blk.split(';')[0]):
            fs, ts, tt, rt = m.groups()
            EXISTING.append({'from': fs, 'to_slug': ts,
                             'to_text': None if tt == 'NULL' else tt[1:-1].replace("''", "'"),
                             'type': rt})

SLUGS = {s['slug'] for s in SEN}

# ── AUTHORED RELATIONS ──────────────────────────────────────────────────────
# Antonyms (symmetric — reverse auto-added when both sides are in-corpus).
# Tuple: (slug_a, slug_b) both in corpus, OR (slug, "plain text") for out-of-corpus.
ANTO = [
    # 101 in-corpus opposites
    ('tall.adj.height', 'short.adj.height'),
    ('heavy.adj.weight', 'light.adj.weight'),
    ('tight.adj.fit', 'loose.adj.fit'),
    ('expensive.adj.price', 'cheap.adj.price'),
    ('strong.adj.power', 'weak.adj.power'),
    ('same.adj.identical', 'different.adj.unlike'),
    ('remember.v.recall', 'forget.v.lose'),
    ('laugh.v.joy', 'cry.v.tears'),
    ('win.v.beat', 'lose.v.fail'),
    ('open.v.start', 'close.v.shut'),
    ('always.adv.freq', 'never.adv.freq'),
    ('morning.n.time', 'evening.n.time'),
    ('summer.n.season', 'winter.n.season'),
    ('spring.n.season', 'autumn.n.season'),
    # 101 out-of-corpus opposites
    ('young.adj.age', 'old'),
    ('real.adj.genuine', 'fake'),
    ('true.adj.correct', 'false'),
    ('wrong.adj.incorrect', 'right'),
    ('worse.adj.bad', 'better'),
    ('careful.adj.cautious', 'careless'),
    ('famous.adj.known', 'unknown'),
    ('foreign.adj.abroad', 'domestic'),
    ('fresh.adj.new', 'stale'),
    ('cloudy.adj.sky', 'sunny'),
    ('add.v.put', 'remove'),
    ('arrive.v.reach', 'leave'),
    ('board.v.geton', 'get off'),
    # 102 in-corpus opposites
    ('confident.adj.sure', 'shy.adj.timid'),
    ('expert.n.specialist', 'beginner.n.novice'),
    ('borrow.v.take', 'lend.v.give'),
    ('spend.v.pay', 'save-up.phrv.store'),
    ('approve.v.accept', 'reject.v.refuse'),
    ('agree.v.concur', 'disagree.v.differ'),
    ('upload.v.send', 'download.v.get'),
    ('log-in.phrv.access', 'log-out.phrv.exit'),
    ('switch-on.phrv.start', 'switch-off.phrv.stop'),
    ('get-along.phrv.relate', 'fall-out.phrv.quarrel'),
    ('make-up.phrv.reconcile', 'fall-out.phrv.quarrel'),
    ('fall-behind.phrv.lag', 'keep-up.phrv.maintain'),
    ('catch-up.phrv.reach', 'fall-behind.phrv.lag'),
    ('anxious.adj.worried', 'relieved.adj.eased'),
    ('proud.adj.pleased', 'embarrassed.adj.ashamed'),
    ('generous.adj.giving', 'selfish.adj.egotist'),
    ('turn-down.phrv.refuse', 'take-on.phrv.accept'),
    ('elderly.adj.old', 'young.adj.age'),
    # 102 out-of-corpus opposites
    ('honest.adj.truthful', 'dishonest'),
    ('lazy.adj.idle', 'hardworking'),
    ('patient.adj.calm', 'impatient'),
    ('reliable.adj.dependable', 'unreliable'),
    ('spacious.adj.roomy', 'cramped'),
    ('healthy.adj.well', 'unhealthy'),
    ('crowded.adj.busy', 'empty'),
    ('freezing.adj.cold', 'boiling'),
    ('humid.adj.damp', 'dry'),
    ('spicy.adj.hot', 'mild'),
    ('starving.adj.hungry', 'full'),
    ('nervous.adj.tense', 'calm'),
    ('grateful.adj.thankful', 'ungrateful'),
    ('secondhand.adj.used', 'brand-new'),
    ('faulty.adj.broken', 'working'),
    ('take-off.phrv.depart', 'land'),
    # 103 in-corpus opposites
    ('look-down-on.phrv.despise', 'look-up-to.phrv.admire'),
    ('over-the-moon.idiom.thrilled', 'down-in-dumps.idiom.sad'),
    ('on-cloud-nine.idiom.euphoric', 'down-in-dumps.idiom.sad'),
    ('at-ease.idiom.relaxed', 'on-edge.idiom.tense'),
    ('open-up.phrv.confide', 'bottle-up.phrv.suppress'),
    ('self-conscious.adj.shy', 'confident.adj.sure'),
    ('see-eye-to-eye.idiom.agree', 'beg-to-differ.idiom.disagree'),
    ('press-on.phrv.persist', 'throw-in-towel.idiom.quit'),
    ('cut-corners.idiom.skimp', 'go-extra-mile.idiom.exceed'),
    ('tighten-your-belt.idiom.economize', 'splurge.v.spend'),
    ('fall-through.phrv.fail', 'pull-off.phrv.achieve'),
    # 103 out-of-corpus opposites
    ('strong-willed.adj.determined', 'weak-willed'),
    ('lose-your-cool.idiom.angry', 'keep your cool'),
    ('in-the-red.idiom.debt', 'in the black'),
    ('in-the-loop.idiom.informed', 'out of the loop'),
    ('stand-out.phrv.notable', 'blend in'),
    ('drift-apart.phrv.distance', 'grow closer'),
]

# Near-synonyms, IN-CORPUS (both sides taught). Symmetric — reverse auto-added.
NSYN_SENSE = [
    # 101
    ('kind.adj.nice', 'friendly.adj.warm'),
    ('tour.n.trip', 'ride.n.trip'),
    # 102
    ('skill.n.ability', 'ability.n.capacity'),
    ('skill.n.ability', 'talent.n.gift'),
    ('cut-down.phrv.reduce', 'cut-back.phrv.reduce'),
    ('cut-down.phrv.reduce', 'ease-off.phrv.reduce'),
    ('chill-out.phrv.relax', 'calm-down.phrv.settle'),
    ('fed-up.phr.annoyed', 'frustrated.adj.annoyed'),
    ('faulty.adj.broken', 'defective.adj.flawed'),
    ('gig.n.concert', 'concert.n.music'),
    ('manager.n.boss', 'boss.n.work'),
    ('litter.n.trash', 'trash.n.waste'),
    ('fix.v.repair', 'repair.v.fix'),
    ('journey.n.trip', 'tour.n.trip'),
    ('hand-in.phrv.submit', 'submit.v.hand'),
    # 103 (many map onto 102/103 synonyms)
    ('warm-to.phrv.like', 'take-to.phrv.like2'),
    ('easygoing.adj.relaxed', 'laid-back.adj.relaxed2'),
    ('level-headed.adj.calm', 'down-to-earth.adj.practical'),
    ('perk-up.phrv.cheer', 'cheer-up.phrv.gladden'),
    ('simmer-down.phrv.calm', 'calm-down.phrv.settle'),
    ('butt-in.phrv.interrupt', 'talk-over.phrv.interrupt2'),
    ('on-cloud-nine.idiom.euphoric', 'over-the-moon.idiom.thrilled'),
    ('forge-ahead.phrv.advance', 'press-on.phrv.persist'),
    ('hang-in-there.idiom.persevere', 'press-on.phrv.persist'),
    ('throw-in-towel.idiom.quit', 'give-up.phrv.quit'),
    ('bounce-back.phrv.recover', 'get-over.phrv.recover'),
    ('fork-out.phrv.pay', 'shell-out.phrv.pay2'),
    ('splurge.v.spend', 'splash-out.phrv.spend'),
    ('scrape-by.phrv.survive', 'get-by.phrv.manage'),
    ('scrape-by.phrv.survive', 'make-ends-meet.idiom.manage'),
    ('clear-up.phrv.resolve', 'iron-out.phrv.resolve'),
    ('iron-out.phrv.resolve', 'sort-out.phrv.resolve'),
    ('head-off.phrv.prevent', 'stave-off.phrv.delay'),
    ('touch-base.idiom.contact', 'keep-in-touch.idiom.contact'),
    ('on-the-same-page.idiom.aligned', 'see-eye-to-eye.idiom.agree'),
    ('get-through-to.phrv.reach', 'put-across.phrv.convey'),
    ('self-conscious.adj.shy', 'shy.adj.timid'),
    ('patch-up.phrv.mend', 'make-up.phrv.reconcile'),
    ('step-up.phrv.rise', 'take-the-lead.idiom.lead'),
]

# Near-synonyms, OUT-OF-CORPUS (target is a plain word). One direction only.
NSYN_TEXT = [
    ('shop.n.store', 'store'),
    ('film.n.movie', 'movie'),
    ('trash.n.waste', 'garbage'),
    ('speak.v.talk', 'talk'),
    ('funny.adj.humor', 'amusing'),
    ('quiet.adj.calm', 'calm'),
    ('important.adj.key', 'significant'),
    ('useful.adj.help', 'helpful'),
    ('reserve.v.book', 'book'),
    ('reservation.n.booking', 'booking'),
    ('luggage.n.bags', 'baggage'),
    ('queue.n.line', 'line'),
    ('pavement.n.walkway', 'sidewalk'),
    ('reckon.v.think', 'suppose'),
    ('viral.adj.spreading', 'trending'),
    ('dodgy.adj.suspect', 'suspicious'),
    ('freak-out.phrv.panic', 'panic'),
    ('tasty.adj.delicious', 'delicious'),
    ('cozy.adj.snug', 'comfortable'),
    ('sum-up.phrv.summarize', 'summarize'),
    ('rip-off.phrv.overcharge', 'overcharge'),
    ('nest-egg.idiom.savings', 'savings'),
    ('small-talk.idiom.chat', 'chitchat'),
    ('pull-your-weight.idiom.contribute', 'do your share'),
]

# ── BUILD ───────────────────────────────────────────────────────────────────
errs = []
rels = []   # dicts: from, to_slug, to_text, type

def check(slug, ctx):
    if slug not in SLUGS:
        errs.append(f"unknown slug '{slug}' in {ctx}")
        return False
    return True

def add(frm, to_slug, to_text, rtype):
    if to_slug is not None and frm == to_slug:
        errs.append(f"self-link {frm} ({rtype})")
        return
    if to_slug is None and to_text is None:
        return  # nothing to point at (e.g. existing in-corpus target now missing)
    rels.append({'from': frm, 'to_slug': to_slug, 'to_text': to_text, 'type': rtype})

# antonyms
for pair in ANTO:
    a, b = pair[0], pair[1]
    if not check(a, 'ANTO'):
        continue
    if b in SLUGS:                      # in-corpus → symmetric
        add(a, b, None, 'antonym')
        add(b, a, None, 'antonym')
    else:                               # out-of-corpus text
        add(a, None, b, 'antonym')

# in-corpus near-synonyms (symmetric)
for a, b in NSYN_SENSE:
    if not (check(a, 'NSYN_SENSE') and check(b, 'NSYN_SENSE')):
        continue
    add(a, b, None, 'near_synonym')
    add(b, a, None, 'near_synonym')

# out-of-corpus near-synonyms (one direction)
for a, b in NSYN_TEXT:
    if not check(a, 'NSYN_TEXT'):
        continue
    add(a, None, b, 'near_synonym')

# fold in existing course-seeded relations of the owned types (lossless)
OWNED = {'antonym', 'near_synonym', 'synonym'}
for r in EXISTING:
    if r['type'] not in OWNED:
        continue
    frm = r['from']
    if frm not in SLUGS:
        continue
    to_slug = r.get('to_slug')
    to_text = r.get('to_text')
    if to_slug and to_slug not in SLUGS:
        to_slug = None
    add(frm, to_slug, to_text, r['type'])

if errs:
    print("VALIDATION ERRORS:")
    for e in errs:
        print("  -", e)
    sys.exit(1)

WORD = {s['slug']: s['word'].lower() for s in SEN}

# symmetrise every in-corpus antonym / near_synonym (add the reverse if missing),
# including rows folded in from the course seeds.
have = {(r['from'], r['to_slug'], r['type']) for r in rels if r['to_slug']}
for r in list(rels):
    if r['to_slug'] and r['type'] in ('antonym', 'near_synonym'):
        key = (r['to_slug'], r['from'], r['type'])
        if key not in have:
            rels.append({'from': r['to_slug'], 'to_slug': r['from'],
                         'to_text': None, 'type': r['type']})
            have.add(key)

# prune a to_text row when the same from-sense already links, with the same type,
# to an in-corpus sense whose headword equals that text (avoid duplicate targets).
incorpus_targets = {}
for r in rels:
    if r['to_slug']:
        incorpus_targets.setdefault((r['from'], r['type']), set()).add(WORD.get(r['to_slug'], ''))
rels = [r for r in rels
        if r['to_slug'] or r['to_text'].lower() not in incorpus_targets.get((r['from'], r['type']), set())]

# dedupe on (from, to_slug, to_text, type)
seen = set()
uniq = []
for r in rels:
    k = (r['from'], r['to_slug'], r['to_text'], r['type'])
    if k in seen:
        continue
    seen.add(k)
    uniq.append(r)

from_slugs = sorted({r['from'] for r in uniq})

# ── EMIT SQL ────────────────────────────────────────────────────────────────
def sq(x):
    return "'" + x.replace("'", "''") + "'"

lines = []
lines.append("-- ============================================================================")
lines.append("-- seed-vocab-relations.sql — antonym / near-synonym links powering the")
lines.append("-- \"match a similar word\" and \"match an opposite word\" review exercises.")
lines.append("--")
lines.append("-- Generated by gen-vocab-relations.py. Do not hand-edit; edit the generator.")
lines.append("-- Idempotent: clears only antonym/near_synonym/synonym rows for the authored")
lines.append("-- from-senses, then re-inserts. Confusable/hypernym/hyponym rows are untouched.")
lines.append("-- Resilient: pairs are joined against vocab_senses, so any sense not present")
lines.append("-- in this DB is skipped rather than inserted as NULL. Run AFTER the course seeds.")
lines.append(f"-- {len(uniq)} rows across {len(from_slugs)} senses.")
lines.append("-- ============================================================================")
lines.append("")
lines.append("BEGIN;")
lines.append("")
lines.append("-- Clear owned relation types for the authored senses (idempotent re-run).")
lines.append("DELETE FROM vocab_relations")
lines.append("WHERE relation_type IN ('antonym','near_synonym','synonym')")
lines.append("  AND from_sense_id IN (SELECT id FROM vocab_senses WHERE slug IN (")
for i in range(0, len(from_slugs), 4):
    chunk = from_slugs[i:i+4]
    lines.append("    " + ", ".join(sq(s) for s in chunk) + ("," if i+4 < len(from_slugs) else ""))
lines.append("  ));")
lines.append("")
lines.append("-- Insert via a join so unresolved slugs are skipped (never NULL from_sense_id).")
lines.append("INSERT INTO vocab_relations (from_sense_id, to_sense_id, to_text, relation_type)")
lines.append("SELECT fs.id, ts.id, v.to_text, v.relation_type")
lines.append("FROM (VALUES")
rowsql = []
for r in uniq:
    frm = sq(r['from'])
    to = sq(r['to_slug']) if r['to_slug'] else "NULL::text"
    tx = sq(r['to_text']) if r['to_text'] else "NULL::text"
    rowsql.append(f"  ({frm}, {to}, {tx}, {sq(r['type'])})")
lines.append(",\n".join(rowsql))
lines.append(") AS v(from_slug, to_slug, to_text, relation_type)")
lines.append("JOIN vocab_senses fs ON fs.slug = v.from_slug")
lines.append("LEFT JOIN vocab_senses ts ON ts.slug = v.to_slug")
lines.append("WHERE v.to_slug IS NULL OR ts.id IS NOT NULL;")
lines.append("")
lines.append("COMMIT;")
lines.append("")

out = os.path.join(HERE, 'seed-vocab-relations.sql')
open(out, 'w', encoding='utf-8').write("\n".join(lines))

# ── REPORT ──────────────────────────────────────────────────────────────────
by_type = {}
for r in uniq:
    by_type[r['type']] = by_type.get(r['type'], 0) + 1
print(f"OK  wrote {out}")
print(f"    rows: {len(uniq)}  by type: {by_type}")
print(f"    distinct from-senses (have a match target): {len(from_slugs)} / {len(SLUGS)}"
      f"  ({100*len(from_slugs)//len(SLUGS)}%)")
# antonym vs synonym coverage
anto_from = len({r['from'] for r in uniq if r['type'] == 'antonym'})
syn_from  = len({r['from'] for r in uniq if r['type'] in ('near_synonym', 'synonym')})
print(f"    senses with an antonym: {anto_from}   with a synonym: {syn_from}")
