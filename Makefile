all: clear zip

flow: src/config_proto_compiled.js
	cd src; flow check

eslint:
	cd src; eslint .

clear: 
	rm -f extension.zip
	rm -f extension/index.js
	rm -f extension/manifest.json
	rm -rf extension/data
	rm -rf extension/management
	rm -f src/config_proto_compiled.js
	$(MAKE) -C management clear-dist #not clearing dependencies, it would take forever

zip: dist
	zip -r extension extension

dist: pre-browserify dist-build

dist-build:
	NODE_ENV=dist `npm bin`/browserify src/index.js | `npm bin`/uglifyjs -c > extension/index.js

debug: pre-browserify-debug
	NODE_ENV=debug `npm bin`/browserify src/index.js -d -o extension/index.js

pre-browserify: check-modules src/config_proto_compiled.js management_make manifest
pre-browserify-debug: check-modules src/config_proto_compiled.js manifest

src/config_proto_compiled.js:
	./compile_protobuf.sh

management_make:
	$(MAKE) -C management

manifest:
	python3 build_manifest.py

npm-install:
	npm install

check-modules:
	git submodule foreach git pull origin master
