# TREZOR Chrome Extension

[![Build Status](https://travis-ci.org/trezor/trezor-chrome-extension.svg?branch=master)](https://travis-ci.org/trezor/trezor-chrome-extension) [![gitter](https://badges.gitter.im/trezor/community.svg)](https://gitter.im/trezor/community)

Chrome extension for [Bitcoin TREZOR](https://www.bitcointrezor.com/) by [SatoshiLabs](http://satoshilabs.com/).

## About

TREZOR Chrome Extension has two different purposes.

First, it has a built-in device management functionality, for wiping/recovery/initialization/.... It doesn't connect to any outside sources, all the data (including TREZOR firmware) is bundled with the app, so it works completely offline (if you somehow manage to install Chrome without an internet connection).

Second, it's a transport layer between websites (such as our own webwallet [myTREZOR](https://mytrezor.com)) and TREZOR devices. It's possible to send Chrome messages (see [chrome messages API documentation](https://developer.chrome.com/extensions/messaging)) to the extension, and the extension resends it to TREZOR hardware and back.

The messages are encoded through [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) library and sent to the actual hardware via [Chrome USB HID API](https://developer.chrome.com/apps/hid).

The API of the extensions is described below. **For development of web apps for TREZOR, it is recommended to use [trezor.js](https://github.com/trezor/trezor.js) javascript API, which has separate javascript calls for most common usecases; or [TREZOR Connect](https://github.com/trezor/connect), which is even more high level.** However, the *end user* still needs to install either the extension or [trezord](https://github.com/trezor/trezord).

## Install via Web store

Extension is available for download [at Google Web store](https://chrome.google.com/webstore/detail/jcjjhjgimijdkoamemaghajlhegmoclj) (and is automatically offered on [myTREZOR webwallet](https://www.mytrezor.com)).

## Install via ZIP

If you don't trust Google Web store (or want to use an offline machine), you can download the ZIP file extension.zip, unzip it, go to [chrome://extensions/](chrome://extensions/) in Chrome, enable "Developer mode", click "Load upacked extension" and find the directory.

The ZIP file in the repo will be updated simultaneously with the updates in Google Web Store; it might not be up-to-date with the master branch.


## Install from source

### Checking out sources

```
git clone --recursive https://github.com/trezor/chrome-extension.git
```

Or, if you already cloned the repository but not the submodules

```
git submodule update --init --recursive
```

### Building

Building works on OS X and Linux and uses `make`.

You need to have [flow](http://flowtype.org) installed for type checking. If you don't want to install it, edit the `flow-check` in Makefile to something like `true`.

You also need python3 and npm and have them in `$PATH`.

(You need to be online for the build because of `npm install` and `git update` that happen in the build.)

```
make npm-install # needed only the first time
make clear # if you built before
make zip
```

## Source

The source code of the transport layer is using [flow](http://flowtype.org) type annotations and some features of ECMAScript 6.

Most of the logic is now in trezor-link npm package, the extension just do data validation and so on.

The source code of the device management is an angular app. If it seems a little "over-blown", it's because it was created as a clone of the whole myTREZOR app, which handles more than device management, and then functionality was stripped off. 


## Caveats

On Mac OS X, Windows and Chrome OS, installing the extension should work without any root privileges. Unfortunately, on GNU/Linux, you have install so-called udev rules as a root.

If you are using MyTrezor.com, we are trying to detect the errors and offer you an easy package for the two most popular packaging systems (DEB and RPM).

If you don't want to or can't install that, please refer to our documentation

http://doc.satoshilabs.com/trezor-user/settingupchromeonlinux.html

## UDP connection

Connect to UDP TREZOR emulator (will be released soon-ish) by opening extension background page in chrome://extensions and typing into console

`window.setUdp([21324, ...])`

with the list of ports of the virtual devices. The devices are immediately added and are registered as connected; if an app (like myTREZOR) is running, it will see them and try to communicate with them. To simulate disconnect, just type

`window.setUdp([])`

and the device are marked as disconnected.

Allowed ports are 21324, 21325 and 21326.

## API

If installed using some of the described methods, the extension has an id `jcjjhjgimijdkoamemaghajlhegmoclj`. 

You send the messages to the extension using [chrome messages API](https://developer.chrome.com/extensions/messaging) (read the note about whitelisting below).

The messages are javacript Objects with `type` property and `body` property; `type` is always string, `body` varies depending on the type. 

The response is a javascript Object with `type` property, which is either `"response"` or `"error"`; in the `response` case, the object has `body` with type depending on message; in the `error` case, the object has `message` with error message.

So, the code, communicating with the extension, might look like this:

````
chrome.runtime.sendMessage('jcjjhjgimijdkoamemaghajlhegmoclj', {type: "info"},
  function(response) {
    if (response.type === "error") {
      handleError(response.type);
    } else {
      handleInfo(response.body);
    }
  }
);
````

The possible messages are:

| type | body | response type | description |
|------|------|---------------|-------------|
| `info` | | {`version`:&nbsp;string,<br> `configured`:&nbsp;boolean} | Returns current version of bridge and info about configuration.<br>See `configure` for more info. |
| `configure` | config, as hex string | `"Success"` | Before any advanced call, configuration file needs to be loaded to extension.<br> Configuration file is signed by SatoshiLabs and the validity of the signature is limited.<br>Current config should be [in this repo](https://github.com/trezor/webwallet-data/blob/master/config_signed.bin), or [on AWS here](http://mytrezor.s3.amazonaws.com/config_signed.bin). |
| `enumerate` | | Array&lt;{`path`:&nbsp;number, <br>`session`:&nbsp;number&nbsp;&#124;&nbsp;null}&gt; | Lists devices.<br>`path` uniquely defines device between more connected devices. It usually increases on reconnect until restart of browser, but there is no guarantee.<br>If `session` is null, nobody else is using the device; if it's number, it identifies who is using it. |
| `listen` | previous, as JSON | like `enumerate` | Listen to changes and returns either on change or after 30 second timeout. Compares change from `previous` that is sent as a parameter. "Change" is both connecting/disconnecting and session change. <br><br>`previous` must be exactly the output from the previous `enumerate`, even if the devices have additional properties that are not described above |
| `acquire` | {`path`: path of device,<br>`previous`: previous session (or `null`) | {`session`:&nbsp;number} | Acquires the device at `path`. By "acquiring" the device, you are claiming the device for yourself.<br>Before acquiring, checks that the current session is `previous`.<br>If two applications call `acquire` on a newly connected device at the same time, only one of them succeed. |
| `release` | {`session`: session to release} | `"Success"` | Releases the device with the given session.<br>By "releasing" the device, you claim that you don't want to use the device anymore. |
| `call` | {`id`: session to call,<br> `type`: string,<br> `message`: object}  | {`type`: string, `body`: object} | Calls the message and returns the response from TREZOR.<br>Messages are defined in [this protobuf file](https://github.com/trezor/trezor-common/blob/master/protob/messages.proto).<br>`type` in request is, for example, `GetFeatures`; `type` in response is, for example, `Features` |

### Whitelisting

You cannot connect to the extension from anywhere on the internet. Your URL needs to be specifically whitelisted; whitelist is baked-in in the extension manifest.

`localhost` is specifically whitelisted, so you can experiment on `http://localhost`. If you want to add your url in order to make a TREZOR web app, [make a pull request to this file](https://github.com/trezor/trezor-common/blob/master/signer/config.json).

## License

GPLv3

* (C) 2015 SatoshiLabs
* (C) 2014 Mike Tsao <mike@sowbug.com>
* (C) 2014 Liz Fong-Jones <lizf@google.com>
* (C) 2015 William Wolf <throughnothing@gmail.com>

some code from [sowbug/trhid](https://github.com/sowbug/trhid) and [throughnothing/chrome-trezor](https://github.com/throughnothing/chrome-trezor)
