// slow.io.js - A little client-side control panel for slow.io
//
// Hi! If you're using this, you need to make sure that:
// 1.  socket.io and jQuery are both loaded before this script.
// 2.  This script runs before socket.io is used.
//
(function () {
  var first_socket = undefined;
  var real_io = window.io;
  window.io = function io() {
    setup();
    var socket = real_io.apply(undefined, arguments);
    if (first_socket === undefined)
      first_socket = socket;
    return socket;
  };

  var installed = false;
  function setup() {
    if (!installed && document.cookie) {
      if (sha1(document.cookie) === "bb4fb503549e3c32bd32cc81cf4d776fcbacd601") {
        var controls = document.createElement("form");
        controls.className = "slow-io-controls";
        controls.innerHTML =
          '<label>Latency ' +
          '<input class="slow-io-latency-slider" type="range" min="0" max="2000" step="1" value="0"> ' +
          '<span class="slow-io-latency-value">0</span></label>';
        document.body.appendChild(controls);

        var $controls = $(controls);
        $controls.change(function (e) {
          var v = Number($controls.find(".slow-io-latency-slider")[0].value);
          $controls.find("span.slow-io-latency-value").text(v === 0 ? "0" : v + " msec");
          first_socket.emit("slow-io-set-latency", v, document.cookie);
        });

        installed = true;
      }
    }
  }

  // We use SHA-1 as a (not actually secure) password hashing algorithm because
  // the implementation is short.  :-|

  // SHA-1 implementation in JavaScript (c) Chris Veness 2002-2014 / MIT Licence
  // http://www.movable-type.co.uk/scripts/sha1.html
  function sha1(msg) { function f(s, x, y, z) { switch (s) { case 0: return (x & y) ^ (~x & z);
    case 1: return x ^ y ^ z; case 2: return (x & y) ^ (x & z) ^ (y & z); case 3: return x ^ y ^ z;
    } } function ROTL (x, n) { return (x<<n) | (x>>>(32-n)); } var K = [ 0x5a827999, 0x6ed9eba1,
    0x8f1bbcdc, 0xca62c1d6 ]; msg += String.fromCharCode(0x80); var l = msg.length/4 + 2; var N =
    Math.ceil(l/16); var M = new Array(N); for (var i=0; i<N; i++) { M[i] = new Array(16); for (var
    j=0; j<16; j++) { M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) |
    (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3)); } } M[N-1][14] =
    ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]); M[N-1][15] =
    ((msg.length-1)*8) & 0xffffffff; var H0 = 0x67452301; var H1 = 0xefcdab89; var H2 = 0x98badcfe;
    var H3 = 0x10325476; var H4 = 0xc3d2e1f0; var W = new Array(80); var a, b, c, d, e; for (var
    i=0; i<N; i++) { for (var t=0; t<16; t++) W[t] = M[i][t]; for (var t=16; t<80; t++) W[t] =
    ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1); a = H0; b = H1; c = H2; d = H3; e = H4; for (var
    t=0; t<80; t++) { var s = Math.floor(t/20); var T = (ROTL(a,5) + f(s,b,c,d) + e + K[s] + W[t])
    & 0xffffffff; e = d; d = c; c = ROTL(b, 30); b = a; a = T; } H0 = (H0+a) & 0xffffffff; H1 =
    (H1+b) & 0xffffffff; H2 = (H2+c) & 0xffffffff; H3 = (H3+d) & 0xffffffff; H4 = (H4+e) &
    0xffffffff; } function toHexStr(n) { var s="", v; for (var i=7; i>=0; i--) { v = (n>>>(i*4)) &
    0xf; s += v.toString(16); } return s; } return toHexStr(H0) + toHexStr(H1) + toHexStr(H2) +
    toHexStr(H3) + toHexStr(H4); }
})();

