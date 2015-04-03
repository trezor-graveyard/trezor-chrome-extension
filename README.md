TREZOR Chrome extension
===

Chrome extension for TREZOR - an alternative to [trezord](https://github.com/trezor/trezord) and TREZOR NPAPI plug-in.

It works at a very low level, only resending messages from and to TREZOR device; it contains no logic about device state etc.

Extension is not yet available for public use, since it's not widely tested so far.


Checking out sources
--------------------

```
git clone https://github.com/trezor/chrome-extension.git
cd chrome-extension
git submodule update --init
```



Building
--------

```
npm install
npm run prepare
npm run build
```


Caveats
-------

On Mac OS X, Windows and Chrome OS, extension should work without any root priviledges. Unfortunately, on Linux, you have to put this file

https://raw.githubusercontent.com/trezor/trezor-common/master/udev/51-trezor-udev.rules

into  `/lib/udev/rules.d`, as a root.


License
---

GPLv3

(C) 2015 SatoshiLabs, with some code from [sowbug/trhid](https://github.com/sowbug/trhid) and [throughnothing/chrome-trezor](throughnothing/chrome-trezor)
