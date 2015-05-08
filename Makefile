all: clear zip

clear: 
	rm -f extension.zip
	rm -f extension/index.js
	rm -f src/config_proto_compiled.js

zip: dist
	zip -r extension extension

dist: src/config_proto_compiled.js
	`npm bin`/browserify src/index.js -o extension/index.js

debug: src/config_proto_compiled.js
	`npm bin`/browserify src/index.js -d -o extension/index.js

src/config_proto_compiled.js:
	./compile_protobuf.sh

npm-install:
	npm install

