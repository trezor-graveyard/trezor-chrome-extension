TREZOR Chrome Extension
===

Chrome extension for [Bitcoin TREZOR](https://www.bitcointrezor.com/) by [SatoshiLabs](http://satoshilabs.com/).

About
---

TREZOR Chrome Extension has two different purposes.

First, it has a built-in device management functionality, for wiping/recovery/initialization/.... It doesn't connect to any outside sources, all the data (including TREZOR firmware) is bundled with the app, so it works completely offline (if you somehow manage to install Chrome without an internet connection).

Second, it's a transport layer - alternative to [trezord](https://github.com/trezor/trezord) and TREZOR NPAPI plug-in. As such, it works at a very low level, only resending messages from and to TREZOR device; it contains no logic about device state etc. It's possible to send messages to the extension, and the extension resends it to TREZOR hardware and back; for example, our official wallet [myTREZOR.com](https://www.mytrezor.com) is sending messages (see [chrome messages API documentation](https://developer.chrome.com/extensions/messaging)) to the extension; and then, the messages are encoded through [protobuf.js](https://github.com/dcodeIO/ProtoBuf.js/) library and sent to the actual hardware via [Chrome USB HID API](https://developer.chrome.com/apps/hid).


Install via Web store
---
Extension is available for download [at Google Web store](https://chrome.google.com/webstore/detail/jcjjhjgimijdkoamemaghajlhegmoclj) (and is automatically offered on [myTREZOR webwallet](https://www.mytrezor.com)).

Install via ZIP
---
If you don't trust Google Web store (or want to use an offline machine), you can download the ZIP file extension.zip, unzip it, go to [chrome://extensions/](chrome://extensions/) in Chrome, enable "Developer mode", click "Load upacked extension" and find the directory.

The ZIP file in the repo will be updated simultaneously with the updates in Google Web Store; it might not be up-to-date with the master branch.


Install from source
----

###Checking out sources

```
git clone --recursive https://github.com/trezor/chrome-extension.git
```

###Building

Building was done and tested only on GNU/Linux; it *should* work on OS X.

You need to have [flow](http://flowtype.org) installed for type checking. You also need python3 and npm. (You need to be online for the build.)

```
make npm-install
make zip
```

Source
---

The source code of the transport layer is using [flow](http://flowtype.org) type annotations and some features of ECMAScript 6.

The source code of the device management is an angular app. If it seems a little "over-blown", it's because it was created as a clone of the whole myTREZOR app, which handles more than device management, and then functionality was stripped off. 


Caveats
-------

On Mac OS X, Windows and Chrome OS, installing the extension should work without any root privileges. Unfortunately, on GNU/Linux, you have install so-called udev rules as a root.

If you are using MyTrezor.com, we are trying to detect the errors and offer you an easy package for the two most popular packaging systems (DEB and RPM).

If you don't want to or can't install that, please refer to our documentation

http://doc.satoshilabs.com/trezor-user/settingupchromeonlinux.html


License
---

GPLv3

* (C) 2015 SatoshiLabs
* (C) 2014 Mike Tsao <mike@sowbug.com>
* (C) 2014 Liz Fong-Jones <lizf@google.com>
* (C) 2015 William Wolf <throughnothing@gmail.com>

some code from [sowbug/trhid](https://github.com/sowbug/trhid) and [throughnothing/chrome-trezor](https://github.com/throughnothing/chrome-trezor)
