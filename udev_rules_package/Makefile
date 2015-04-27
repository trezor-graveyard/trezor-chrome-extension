VOL_MOUNT = -v $(shell pwd):/release
IMAGETAG  = trezor-udev-build-env

all: .package

.package: .docker-image
	$(info Packaging ...)
	docker run -t $(VOL_MOUNT) $(IMAGETAG) /release/release.sh

.docker-image:
	$(info Preparing docker image ...)
	docker build -t $(IMAGETAG) .

shell: .docker-image
	docker run -i -t $(VOL_MOUNT) $(IMAGETAG) /bin/bash
