all: clear-dist node_modules app/bower_components dist copy-dist copy-data

clear: clear-dist
	rm -rf node_modules app/bower_components

clear-dist:
	rm -rf dist .tmp

node_modules:
	npm install


app/bower_components:
	`npm bin`/bower install

dist:
	rm -r app/bower_components/trezor.js
	`npm bin`/bower install
	`npm bin`/grunt build
	rm -rf .tmp
	
copy-dist:
	rm -rf ../extension/management
	cp -r dist ../extension/management

copy-data:
	rm -rf ../extension/data
	python3 firmware_copy.py
