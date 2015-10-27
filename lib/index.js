// Proxies for socket.io sockets that add artificial latency.

"use strict";

var socketio = require("socket.io");

function SlowSocket(socket) {
  this._socket = socket;
  this._queue = [];
  this._tempoRubato = 0;
  handleControlsOnSocket(socket);
}

SlowSocket.prototype = {
  constructor: SlowSocket,

  // Schedule a function to be called later.
  _delay: function (f) {
    this._queue.push(f);
    setTimeout(() => this._deliver(), Math.random() * slowio.typicalLatency);
  },

  // Second half of the implementation of _delay(): deliver some messages.
  _deliver: function () {
    // Heuristic hacks. There's no one right answer we're shooting for; the
    // goal is just to make the network behavior unbearably bad, in a way that
    // has the awful ring of truth, something that hits you in the gut. So:
    // allow traffic to queue up, and deliver it in random bursts.
    this._tempoRubato++;
    if (this._tempoRubato == this._queue.length ||
        Math.random() > Math.pow(1/2, 1 / slowio.burstiness)) {
      while (this._tempoRubato > 0) {
        // Schedule each event handler separately, to allow for errors.
        setTimeout(() => this._queue.shift()(), 0);
        this._tempoRubato--;
      }
    }
  },

  // socket.on(): just like the socket.io method, but slower
  on: function (name, handler) {
    // Using the horrible `self` hack because Node.js doesn't support
    // rest arguments in arrow functions yet.
    var self = this;
    this._socket.on(name, function (s) {
      if (name === "connection") {
        // A new connection! Slow it down, too.
        self._delay(() => handler(slowio.addLatency(s)));
      } else {
        // A message was received. Deliver it later.
        self._delay(() => handler.apply(undefined, arguments));
      }
    });
  },

  // socket.emit(): just like the socket.io method, but slower
  emit: function () {
    var args = arguments;

    // Since we won't be calling socket.io's emit method immediately, save the
    // flags. The way flags are implemented in socket.io, they'll be clobbered
    // otherwise.
    var flags = {broadcast: Boolean(this._socket.flags && this._socket.flags.broadcast)};

    this._delay(() => {
      // Time to send the message! Restore the flags first.
      this._socket.flags = flags;
      this._socket.emit.apply(this._socket, args)
    });
  },

  // socket.broadcast: just like the socket.io property, but slower
  get broadcast() {
    // do not look directly at this hack
    this._socket.broadcast;  // ----> over here is an ok place to look
    return this;
  }
};

// Add a listener to the given socket.io Socket to handle
// "slow-io-set-latency" messages. This is how the slider in the web page
// sends commands to the server. It's not really secure, as the secret is
// hardcoded and SHA-1 is easily breakable these days!
function handleControlsOnSocket(socket) {
  socket.on('slow-io-set-latency', (awfulness, pw) => {
    if (typeof awfulness !== "number" || awfulness < 0 || awfulness > 2000)
      return;
    if (typeof pw !== "string" || pw.length > 100000)
      return;

    var sha1 = function sha1(msg) { function f(s, x, y, z) { switch (s) { case 0: return (x & y)
      ^ (~x & z); case 1: return x ^ y ^ z; case 2: return (x & y) ^ (x & z) ^ (y & z); case 3:
      return x ^ y ^ z; } } function ROTL (x, n) { return (x<<n) | (x>>>(32-n)); } var K = [
      0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6 ]; msg += String.fromCharCode(0x80); var l =
      msg.length/4 + 2; var N = Math.ceil(l/16); var M = new Array(N); for (var i=0; i<N; i++) {
      M[i] = new Array(16); for (var j=0; j<16; j++) { M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) |
      (msg.charCodeAt(i*64+j*4+1)<<16) | (msg.charCodeAt(i*64+j*4+2)<<8) |
      (msg.charCodeAt(i*64+j*4+3)); } } M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32);
      M[N-1][14] = Math.floor(M[N-1][14]); M[N-1][15] = ((msg.length-1)*8) & 0xffffffff; var H0 =
      0x67452301; var H1 = 0xefcdab89; var H2 = 0x98badcfe; var H3 = 0x10325476; var H4 =
      0xc3d2e1f0; var W = new Array(80); var a, b, c, d, e; for (var i=0; i<N; i++) { for (var
      t=0; t<16; t++) W[t] = M[i][t]; for (var t=16; t<80; t++) W[t] = ROTL(W[t-3] ^ W[t-8] ^
      W[t-14] ^ W[t-16], 1); a = H0; b = H1; c = H2; d = H3; e = H4; for (var t=0; t<80; t++) {
      var s = Math.floor(t/20); var T = (ROTL(a,5) + f(s,b,c,d) + e + K[s] + W[t]) & 0xffffffff;
      e = d; d = c; c = ROTL(b, 30); b = a; a = T; } H0 = (H0+a) & 0xffffffff; H1 = (H1+b) &
      0xffffffff; H2 = (H2+c) & 0xffffffff; H3 = (H3+d) & 0xffffffff; H4 = (H4+e) & 0xffffffff; }
      function toHexStr(n) { var s="", v; for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s +=
      v.toString(16); } return s; } return toHexStr(H0) + toHexStr(H1) + toHexStr(H2) +
      toHexStr(H3) + toHexStr(H4); };

    if (sha1(pw) === "bb4fb503549e3c32bd32cc81cf4d776fcbacd601") {
      console.log("slow.io: Set the awfulness to " + awfulness);
      slowio.typicalLatency = awfulness;
    }
  });
}

var slowio = function io(server) {
  console.log("slow.io: we have been called");
  if (typeof server == "object") {
    console.log("express! I know this!");
    // Well, ideally we would just use engine.io to sort of hack everything
    // into place, like socket.io does, but I don't know how to do that.
    addToServer(server);
  }
  var socket = socketio(server);
  return new SlowSocket(socket);
};

slowio.burstiness = 12;    // median number of messages per burst, in sufficiently heavy traffic
slowio.typicalLatency = 0;     // milliseconds

var read = require("fs").readFileSync;
var clientJS = read(require.resolve("slow.io/assets/slow.io.js"), "utf-8");
var clientCSS = read(require.resolve("slow.io/assets/slow.io.css"), "utf-8");

function sendFile(type, text, res) {
  res.setHeader('Content-Type', type);
  res.writeHead(200);
  res.end(text);
}

// Modify the given Express server app to serve
// slow.io JS and CSS to web clients.
// (Yes, you're right, this doesn't really belong as a part of the same package as the
// rest of slow.io.)
function addToServer(server) {
  // Attach to server. I don't know what I'm doing here. Just copying what
  // socket.io does.
  var evs = server.listeners("request").slice(0);
  var self = this;
  server.removeAllListeners("request");
  server.on("request", function(req, res) {
    if (req.url == "/slow.io/slow.io.js") {
      sendFile("application/javascript", clientJS, res);
    } else if (req.url == "/slow.io/slow.io.css") {
      sendFile("text/css", clientCSS, res);
    } else {
      for (var i = 0; i < evs.length; i++) {
        evs[i].call(server, req, res);
      }
    }
  });
}

module.exports = slowio;
