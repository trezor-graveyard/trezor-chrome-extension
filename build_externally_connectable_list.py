import json


with open('trezor-common/signer/config.json') as data_file:    
    data = json.load(data_file)

whitelist = data["whitelist_urls"]

def fix(url):
   fixed = url.replace("https?", "*").replace("[\w\.-]+","*").replace('\.', ".").replace("(:\d+)?","").replace("(/.*)?","/*")
   return fixed

print json.dumps(map(fix, whitelist), indent=4)

