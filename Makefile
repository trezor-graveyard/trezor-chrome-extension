all: clear zip

flow-check:
	cd src; flow check

clear: 
	rm -f extension.zip
	rm -f extension/index.js
	rm -f src/config_proto_compiled.js

zip: dist
	zip -r extension extension

dist: src/config_proto_compiled.js flow-check
	NODE_ENV=dist `npm bin`/browserify src/index.js -t babelify -t flow-typestrip -t envify | `npm bin`/uglifyjs -c > extension/index.js

debug: src/config_proto_compiled.js flow-check
	NODE_ENV=debug `npm bin`/browserify src/index.js -t babelify -t flow-typestrip -t envify -d -o extension/index.js

src/config_proto_compiled.js:
	./compile_protobuf.sh

npm-install:
	npm install

