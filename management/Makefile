all: clear-dist node_modules app/bower_components dist copy-dist copy-data

beta-all: clear-dist node_modules app/bower_components beta-dist copy-dist copy-data

clear: clear-dist
	rm -rf node_modules app/bower_components

clear-dist:
	rm -rf dist .tmp
	rm -f app/scripts/config.js

node_modules:
	npm install


app/bower_components:
	`npm bin`/bower install

dist: copy-config build

beta-dist: beta-config build

copy-config:
	cp app/scripts/config.original.js app/scripts/config.js

beta-config:
	cat app/scripts/config.original.js | sed 's/jcjjhjgimijdkoamemaghajlhegmoclj/pciijihalmablemehncipbfpodhnbmkj/' > app/scripts/config.js


build:
	rm -rf app/bower_components/trezor.js
	`npm bin`/bower install
	`npm bin`/grunt build
	rm -rf .tmp

copy-dist:
	rm -rf ../extension/management
	cp -r dist ../extension/management

copy-data:
	rm -rf ../extension/data
	python3 firmware_copy.py
