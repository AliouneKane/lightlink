"""Collects the ECG load-shedding group of every Greater Accra and Tema locality from 3news.

robots.txt of 3news allows /tools/. 4 parallel workers, small pause between requests.
Usage: python3 -I docs/donnees/scripts/scrape_3news.py docs/donnees/brut/3news_groupes_2026.csv
"""
import re, csv, time, html, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
UA = {"User-Agent": "Mozilla/5.0 (LightLink student project; contact: claude.ise2026@gmail.com)"}

def get(u):
    for _ in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode("utf-8", "replace")
        except Exception:
            time.sleep(2)
    return ""

def one(slug):
    time.sleep(0.5)
    p = get(f"https://3news.com/tools/dumsor/{slug}")
    t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", "", p, flags=re.S)))
    t = re.sub(r"\s+", " ", t)
    m = re.search(r"^(.*?) Dumsor Schedule — Group ([A-D]) \(([^)]+)\)", t)
    e = re.search(r"effective (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})", t)
    if not m:
        return None
    return [m.group(1), slug, m.group(2), m.group(3), e.group(1) if e else "", e.group(2) if e else "",
            f"https://3news.com/tools/dumsor/{slug}", time.strftime("%Y-%m-%d")]

slugs, seen = [], set()
for region in ("accra", "tema"):
    s = get(f"https://3news.com/tools/dumsor/region/{region}")
    for slug, _ in re.findall(r'<a[^>]*href="/tools/dumsor/([a-z0-9-]+)"[^>]*>(.*?)</a>', s, flags=re.S):
        if slug not in seen:
            seen.add(slug); slugs.append(slug)
print(len(slugs), "pages", flush=True)
rows = []
with ThreadPoolExecutor(4) as ex:
    for i, r in enumerate(ex.map(one, slugs), 1):
        if r: rows.append(r)
        if i % 50 == 0: print(i, flush=True)
with open(sys.argv[1], "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["localite","slug_3news","groupe","region","valide_du","valide_au","url","date_recolte"]); w.writerows(rows)
print("done", len(rows))
