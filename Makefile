all: clear zip

flow-check:
	cd src; flow check

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

dist: pre-browserify 
	NODE_ENV=dist `npm bin`/browserify src/index.js -t babelify -t flow-typestrip -t envify | `npm bin`/uglifyjs -c > extension/index.js

debug: pre-browserify
	NODE_ENV=debug `npm bin`/browserify src/index.js -t babelify -t flow-typestrip -t envify -d -o extension/index.js

pre-browserify: src/config_proto_compiled.js flow-check management_make manifest

src/config_proto_compiled.js:
	./compile_protobuf.sh

management_make:
	$(MAKE) -C management

manifest:
	python3 build_manifest.py	

npm-install:
	npm install

