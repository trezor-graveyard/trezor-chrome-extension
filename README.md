TREZOR Chrome extension
===

Chrome extension for [Bitcoin TREZOR](https://www.bitcointrezor.com/) by [SatoshiLabs](http://satoshilabs.com/) - an alternative to [trezord](https://github.com/trezor/trezord) and TREZOR NPAPI plug-in.

It works at a very low level, only resending messages from and to TREZOR device; it contains no logic about device state etc.

Extension is not yet available for public use, since it's not widely tested so far.


Checking out sources
--------------------

```
git clone https://github.com/trezor/chrome-extension.git
cd chrome-extension
git submodule update --init
```

The source codde is using [flow](http://flowtype.org) type annotations and some features of ECMAScript 6.

Building
--------

You need to have [flow](http://flowtype.org) installed for the type checking; if you don't want to or can't install Flow, you will need to remove the `flow-check` goal from the Makefile. 

```
make npm-install
make zip
```


Caveats
-------

On Mac OS X, Windows and Chrome OS, installing the extension should work without any root privileges. Unfortunately, on Linux, you have install so-called udev rules as a root.

If you are using MyTrezor.com, we are trying to detect the errors and offer you an easy package for the two most popular packaging systems (DEB and RPM).

If you don't want to or can't install that, please refer to our documentation

http://doc.satoshilabs.com/trezor-user/settingupchromeonlinux.html


License
---

GPLv3

(C) 2015 SatoshiLabs, with some code from [sowbug/trhid](https://github.com/sowbug/trhid) and [throughnothing/chrome-trezor](https://github.com/throughnothing/chrome-trezor)
