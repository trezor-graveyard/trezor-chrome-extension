all: clear zip

clear: 
	rm -f extension.zip
	rm -f extension/index.js
	rm -f config_proto_compiled.js

zip: dist
	zip -r extension extension

dist: config_proto_compiled.js
	`npm bin`/browserify lib/index.js -o extension/index.js

debug: config_proto_compiled.js
	`npm bin`/browserify lib/index.js -d -o extension/index.js

config_proto_compiled.js:
	./compile_protobuf.sh

npm-install:
	npm install

