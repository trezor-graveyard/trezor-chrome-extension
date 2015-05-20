import json
import shutil
import os

if not os.path.exists('../extension/data'):
    os.makedirs('../extension/data')

with open('data/firmware/releases.json') as data_file:    
    data = json.load(data_file)
    
top = data[0]


url = top["url"]
filename = url[url.rfind("/")+1 : ]

shutil.copy('data/firmware/' + filename, '../extension/data/firmware.bin.hex')

shutil.copy('data/config_signed.bin', '../extension/data/config_signed.bin');

top["url"] = '/data/firmware.bin.hex';

with open('../extension/data/releases.json', 'w') as outfile:
    json.dump([ top ], outfile, indent=4)


