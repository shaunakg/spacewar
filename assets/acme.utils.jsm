'use strict';
acme.namespace('acme.utils');

acme.utils.RandInt = function(min, max) {
    return Math.floor(Math.random() * (Math.round(max) - Math.round(min) + 1)) + Math.round(min);
};

acme.utils.RandReal = function(min, max) {
    return Math.random() * (max - min) + min;
};

acme.utils.ZeroPad = function(s, n) {
    return acme.utils.Pad(s, n, '0');
};

acme.utils.Mod = function(a, b) {
    return (a + b) % b;
};

acme.utils.DegToRad = function(a) {
    return a * Math.PI / 180;
};

acme.utils.RadToDeg = function(a) {
    return a * 180 / Math.PI;
};

acme.utils.Pad = function(s, n, p) {
    s = s + '';
    var pp = '';
    for (var i = 0; i < n - s.length; ++i)
        pp += p;
    return pp + s;
};
