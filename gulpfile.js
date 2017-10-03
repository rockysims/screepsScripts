var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var sequence = require('run-sequence');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var del = require('del');

gulp.task('clean:temp', function() {
	return del('yith/temp1');
});

gulp.task('clean:dist', function() {
	return del('yith/dist');
});

gulp.task('clean:sim', function() {
	return del('screeps.com/sim/**/*');
});

gulp.task('clean:world', function() {
	return del('screeps.com/world/**/*');
});

gulp.task("tsify", function () {
	return gulp.src('yith/src/**/*.ts')
		.pipe(tsProject())
		.js.pipe(gulp.dest("yith/temp1"));
});

gulp.task("flat", function () {
	return gulp.src("yith/temp1/**/*.js")
		.pipe(rename(function(path) {
			var dir = path.dirname;
			if (dir != '.') {
				dir = dir.replace('/', '__');
				path.basename = dir + '__' + path.basename;
			}
			path.dirname = '.';
		}))
		.pipe(replace(/require\(['"]([^)]+)['"]\)/g, function(match, p1) {
			return 'require("' + p1.replace(/\//g, '__') + '")';
		}))
		.pipe(gulp.dest("yith/dist"));
});

gulp.task('clean', ['clean:temp', 'clean:dist']);

gulp.task('default', function (done) {
	sequence('clean', 'tsify', 'flat', 'clean:temp', done);
});

//////////

gulp.task('deploy:sim', function() {
	return gulp.src("yith/dist/*.js")
		.pipe(gulp.dest("screeps.com/sim"));
});
gulp.task('sim', function(done) {
	sequence('default', 'clean:sim', 'deploy:sim', done);
});

gulp.task('deploy:world', function() {
	return gulp.src("yith/dist/*.js")
		.pipe(gulp.dest("screeps.com/world"));
});
gulp.task('world', function(done) {
	sequence('default', 'clean:world', 'deploy:world', done);
});
