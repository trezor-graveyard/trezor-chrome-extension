import json
import os

with open('trezor-common/signer/config.json') as data_file:
    data = json.load(data_file)

whitelist = data["whitelist_urls"]

def fix(url):
   fixed = url.replace("https?", "*").replace("[\w\.-]+","*").replace('\.', ".").replace("(:\d+)?","").replace("(/.*)?","/*")
   return fixed

with open('manifest_no_matches.json') as data_file:
    manifest = json.load(data_file)

trezor_guard_ids = ["imloifkgjagghnncjkhggdhalmcnfklk", "niebkpllfhmpfbffbfifagfgoamhpflf"]

matches = list(filter(lambda x: x != "null", map(fix, whitelist)))

manifest["externally_connectable"] = {"matches": matches, "ids": trezor_guard_ids}

if (os.environ.get("STORE_BETA") == "1"):
    manifest["name"] = "BETA - TREZOR Chrome Extension"
    manifest.pop("key", None)

with open('extension/manifest.json', 'w') as outfile:
    json.dump(manifest, outfile, indent=4)
