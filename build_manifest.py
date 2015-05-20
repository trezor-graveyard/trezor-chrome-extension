import json


with open('trezor-common/signer/config.json') as data_file:    
    data = json.load(data_file)

whitelist = data["whitelist_urls"]

def fix(url):
   fixed = url.replace("https?", "*").replace("[\w\.-]+","*").replace('\.', ".").replace("(:\d+)?","").replace("(/.*)?","/*")
   return fixed

with open('manifest_no_matches.json') as data_file:
    manifest = json.load(data_file)

manifest["externally_connectable"] = {"matches": list(map(fix, whitelist))}

with open('extension/manifest.json', 'w') as outfile:
    json.dump(manifest, outfile, indent=4)
     
