# slow.io - It's socket.io, but artificially horrible

Don't use this! It's one of these weekend hack modules.
Just barely works. Totally unsupported. Sorry!

I made this in order to test a socket.io application
under awful network latency.
You use it just like socket.io,
and it in fact uses socket.io as the implementation.
But **every message sent by the server is delayed**
by some arbitrary period of time.

Usage:

    // Load slow.io and configure the level of awfulness:
    var io = require("slow.io");
    io.typicalLatency = 1000;  // milliseconds
    // Then use io as you would normally use socket.io.


## Bugs

Many socket.io features are not supported.

Rooms, for example.
(You can't just add a dummy `.to()` method, either.
The way rooms are implemented is stateful, so
you would need to extend the hack that causes `.broadcast` to work.)
