"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var other_1 = require("other");
var sub_1 = require("folder__subFolder__sub");
exports.loop = function () {
    console.log('loop()');
    other_1.default();
    sub_1.default();
    console.log('abc');
};
