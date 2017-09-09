System.register(['other'], function(exports_1) {
    var other_1;
    var loop;
    return {
        setters:[
            function (other_1_1) {
                other_1 = other_1_1;
            }],
        execute: function() {
            exports_1("loop", loop = function () {
                console.log('loop()');
                other_1.default();
            });
        }
    }
});
