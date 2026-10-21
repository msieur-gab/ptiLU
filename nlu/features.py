"""Shared feature extraction. Mirrored 1:1 in web/runtime.js — keep both in sync."""
import math
import re

# letters of any alphabet, as web/runtime.js: "Kraków", "Tübingen" are one word each
TOKEN_RE = re.compile(r"\w(?:[\w.\-]*\w)?|[^\s\w]")
WORD_RE = re.compile(r"^\w")
QUOTES = set("'\"‘’“”`")
ALNUM = re.compile(r"[^\W_]")
EXT_RE = re.compile(r"[a-z0-9_]\.[a-z0-9]{1,5}$")


def tokenize(text):
    """Return list of (token, start, end)."""
    return [(m.group(0), m.start(), m.end()) for m in TOKEN_RE.finditer(text)]


def intent_features(text):
    toks = [t.lower() for t, _, _ in tokenize(text) if WORD_RE.match(t)]
    feats = []
    prev = "<s>"
    for t in toks:
        feats.append("w:" + t)
        feats.append("b:" + prev + "_" + t)
        padded = "<" + t + ">"
        for n in (3, 4):
            for i in range(len(padded) - n + 1):
                feats.append("c:" + padded[i:i + n])
        prev = t
    feats.append("b:" + prev + "_</s>")
    return feats


def shape(tok):
    out = []
    for ch in tok:
        if "A" <= ch <= "Z":
            c = "X"
        elif "a" <= ch <= "z":
            c = "x"
        elif "0" <= ch <= "9":
            c = "d"
        else:
            c = ch
        if not out or out[-1] != c:
            out.append(c)
    return "".join(out)


def quote_mask(text, toks):
    """True for tokens enclosed in real quotes (apostrophes inside words ignored)."""
    inside = False
    mask = []
    for tok, s, e in toks:
        if tok in QUOTES:
            before = text[s - 1] if s > 0 else " "
            after = text[e] if e < len(text) else " "
            if not (ALNUM.match(before) and ALNUM.match(after)):
                inside = not inside
                mask.append(False)
                continue
        mask.append(inside)
    return mask


def token_features(text, toks=None):
    if toks is None:
        toks = tokenize(text)
    low = [t.lower() for t, _, _ in toks]
    q = quote_mask(text, toks)
    n = len(low)

    def at(i):
        if i < 0:
            return "BOS"
        if i >= n:
            return "EOS"
        return low[i]

    seq = []
    for i, w in enumerate(low):
        f = [
            "bias",
            "w=" + w,
            "s3=" + w[-3:],
            "sh=" + shape(toks[i][0]),
            "w-1=" + at(i - 1),
            "w-2=" + at(i - 2),
            "w+1=" + at(i + 1),
            "w+2=" + at(i + 2),
            "w-1|w=" + at(i - 1) + "|" + w,
            "w|w+1=" + w + "|" + at(i + 1),
        ]
        if EXT_RE.search(w):
            f.append("ext")
        if q[i]:
            f.append("inq")
        seq.append(f)
    return seq


def softmax(xs):
    m = max(xs)
    ex = [math.exp(x - m) for x in xs]
    s = sum(ex)
    return [e / s for e in ex]
