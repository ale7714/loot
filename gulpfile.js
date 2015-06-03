(function() {
	"use strict";

	var gulp = require("gulp"),
			concat = require("gulp-concat"),
			del = require("del"),
			size = require("gulp-size"),
			less = require("gulp-less"),
			minifyCss = require("gulp-minify-css"),
			path = require("path"),
			rev = require("gulp-rev"),
			sourceMaps = require("gulp-sourcemaps"),
			uglify = require("gulp-uglify"),
			livereload = require("gulp-livereload"),
			util = require("gulp-util"),

			appJsSource = "src/**/*.js",
			vendorJsSource = [
				"node_modules/jquery/dist/jquery.min.js",
				"node_modules/bootstrap/dist/js/bootstrap.min.js",
				"node_modules/angular/angular.min.js",
				"node_modules/angular-ui-router/release/angular-ui-router.min.js",
				"node_modules/angular-bootstrap-npm/dist/angular-bootstrap.min.js",
				"node_modules/moment/min/moment.min.js"
			],

			appTemplatesSource = ["src/**/*.html", "!src/*.html"],

			appCssSource = "src/**/*.less",
			vendorCssSource = "node_modules/bootstrap/dist/css/bootstrap.min.css",

			appAssetsSource = ["src/*.html", "!src/index.html", "src/favicon.ico", "src/robots.txt"],
			vendorAssetsSource = "node_modules/bootstrap/fonts/**";

	/**
	 * Watch
	 */

	// Watch
	gulp.task("watch", function() {
		livereload.listen();
		gulp.watch(appJsSource, ["watch:app:js"]);
		gulp.watch(vendorJsSource, ["watch:vendor:js"]);
		gulp.watch(appTemplatesSource, ["watch:app:templates"]);
		gulp.watch(appCssSource, ["watch:app:css"]);
		gulp.watch(vendorCssSource, ["watch:vendor:css"]);
		gulp.watch(appAssetsSource, ["copy:app:assets"]);
		gulp.watch(vendorAssetsSource, ["copy:vendor:assets"]);
	});

	// Watch application Javascript
	gulp.task("watch:app:js", ["jshint", "build:app:js"], cleanAndBuildIndex);

	// Watch vendor Javascript
	gulp.task("watch:vendor:js", ["build:vendor:js"], cleanAndBuildIndex);

	// Watch application templates
	gulp.task("watch:app:templates", ["build:app:templates"], cleanAndBuildIndex);

	// Watch application CSS
	gulp.task("watch:app:css", ["build:app:css"], cleanAndBuildIndex);

	// Watch vendor CSS
	gulp.task("watch:vendor:css", ["build:vendor:css"], cleanAndBuildIndex);

	function cleanAndBuildIndex() {
		cleanIndex(buildIndex());
	}

	/**
	 * Build
	 */

	// Build
	gulp.task("build", ["clean", "build:js", "build:templates", "build:css", "copy:assets"], buildIndex);

	function buildIndex() {
		var inject = require("gulp-inject"),
				appAssets = gulp.src(["public/app*.js", "public/app*.css"], {read: false}),
				templates = gulp.src(["public/templates*.js"], {read: false}),
				vendorAssets = gulp.src(["public/vendor*.js", "public/vendor*.css"], {read: false});

		return gulp.src("src/index.html")
			.pipe(inject(appAssets, {ignorePath: "public", name: "app"}))
			.pipe(inject(templates, {ignorePath: "public", name: "templates"}))
			.pipe(inject(vendorAssets, {ignorePath: "public", name: "vendor"}))
			.pipe(gulp.dest("public"))
			.pipe(livereload())
			.on("error", util.log);
	}

	// Clean
	gulp.task("clean", ["clean:js", "clean:templates", "clean:css", "clean:assets"], cleanIndex);

	function cleanIndex(cb) {
		del("public/index.html", cb);
	}

	// Build Javascript
	gulp.task("build:js", ["build:app:js", "build:vendor:js"]);

	// Clean Javascript
	gulp.task("clean:js", ["clean:app:js", "clean:vendor:js"]);

	// Build application Javascript
	gulp.task("build:app:js", ["clean:app:js"], function() {
		return gulp.src(appJsSource)
			.pipe(sourceMaps.init())
				.pipe(size({title: "app js (original)"}))
				.pipe(concat("app.js"))
				.pipe(uglify())
				.pipe(rev())
				.pipe(size({title: "app js (minified)"}))
				.pipe(size({title: "app js (gzipped)", gzip: true}))
			.pipe(sourceMaps.write("."))
			.pipe(gulp.dest("public"))
			.on("error", util.log);
	});

	// Clean application Javascript
	gulp.task("clean:app:js", function(cb) {
		del(["public/app*.js", "public/app*.js.map"], cb);
	});

	// Build templates
	gulp.task("build:templates", ["build:app:templates"]);

	// Clean templates
	gulp.task("clean:templates", ["clean:app:templates"]);

	// Build app templates
	gulp.task("build:app:templates", ["clean:app:templates"], function() {
		var templateCache = require("gulp-angular-templatecache");

		return gulp.src(appTemplatesSource)
			.pipe(size({title: "app templates (original)"}))
			.pipe(templateCache({module: "lootApp"}))
			.pipe(rev())
			.pipe(size({title: "app templates (concatenated)"}))
			.pipe(size({title: "app templates (gzipped)", gzip: true}))
			.pipe(gulp.dest("public"))
			.on("error", util.log);
	});

	// Clean app templates
	gulp.task("clean:app:templates", function(cb) {
		del("public/templates*.js", cb);
	});

	// Build vendor Javascript
	gulp.task("build:vendor:js", ["clean:vendor:js"], function() {
		return gulp.src(vendorJsSource)
			.pipe(sourceMaps.init({loadMaps: true}))
				.pipe(concat("vendor.js"))
				.pipe(rev())
			.pipe(sourceMaps.write("."))
			.pipe(gulp.dest("public"))
			.on("error", util.log);
	});

	// Clean vendor Javascript
	gulp.task("clean:vendor:js", function(cb) {
		del(["public/vendor*.js", "public/vendor*.js.map"], cb);
	});

	// Build CSS
	gulp.task("build:css", ["build:app:css", "build:vendor:css"]);

	// Clean CSS
	gulp.task("clean:css", ["clean:app:css", "clean:vendor:css"]);

	// Build application CSS
	gulp.task("build:app:css", ["clean:app:css"], function() {
		return gulp.src(appCssSource)
			.pipe(sourceMaps.init())
				.pipe(less({paths: ["node_modules"]}))
				.pipe(size({title: "app css (original)"}))
				.pipe(concat("app.css"))
				.pipe(minifyCss())
				.pipe(rev())
				.pipe(size({title: "app css (minified)"}))
				.pipe(size({title: "app css (gzipped)", gzip: true}))
			.pipe(sourceMaps.write("."))
			.pipe(gulp.dest("public"))
			.on("error", util.log);
	});

	// Clean application CSS
	gulp.task("clean:app:css", function(cb) {
		del(["public/app*.css", "public/app*.css.map"], cb);
	});

	// Build vendor CSS
	gulp.task("build:vendor:css", ["clean:vendor:css"], function() {
		return gulp.src(vendorCssSource)
			.pipe(sourceMaps.init())
				.pipe(concat("vendor.css"))
				.pipe(rev())
			.pipe(sourceMaps.write("."))
			.pipe(gulp.dest("public"))
			.on("error", util.log);
	});

	// Clean vendor CSS
	gulp.task("clean:vendor:css", function(cb) {
		del(["public/vendor*.css", "public/vendor*.css.map"], cb);
	});

	// Copy static assets (HTML, icons, fonts etc.)
	gulp.task("copy:assets", ["copy:app:assets", "copy:vendor:assets"]);

	// Clean static assets
	gulp.task("clean:assets", ["clean:app:assets", "clean:vendor:assets"]);

	// Copy application static assets
	gulp.task("copy:app:assets", ["clean:app:assets"], function() {
		return gulp.src(appAssetsSource)
			.pipe(gulp.dest("public"));
	});

	// Clean application static assets
	gulp.task("clean:app:assets", function(cb) {
		del(["public/*.html", "!public/index.html", "public/favicon.ico", "public/robots.txt"], cb);
	});

	// Copy vendor static assets
	gulp.task("copy:vendor:assets", ["clean:vendor:assets"], function() {
		return gulp.src(vendorAssetsSource)
			.pipe(gulp.dest("public/fonts"));
	});

	// Clean vendor static assets
	gulp.task("clean:vendor:assets", function(cb) {
		del("public/fonts", cb);
	});

	/**
	 * Test
	 */

	// Run JSHint
	gulp.task("jshint", function() {
		var jshint = require("gulp-jshint");

		return gulp.src([appJsSource, "spec/public/**/*.js"])
			.pipe(jshint())
			.pipe(jshint.reporter("default", {verbose: true}));
	});

	// Run client-side unit tests
	gulp.task("test:bdd", function() {
		var karma = require("karma").server;

		karma.start({configFile: path.resolve("./karma-bdd.conf.js")}, function(exitCode) {
			process.exit(exitCode);
		});
	});

	// Run client-side unit tests & code coverage analysis on original source files
	gulp.task("test:src", function() {
		var karma = require("karma").server;

		karma.start({configFile: path.resolve("./karma-src.conf.js")}, function(exitCode) {
			process.exit(exitCode);
		});
	});

	// Run client-side unit tests & code coverage analysis on built files
	gulp.task("test:build", function() {
		var karma = require("karma").server;

		karma.start({configFile: path.resolve("./karma.conf.js")}, function(exitCode) {
			process.exit(exitCode);
		});
	});

	// Default task
	gulp.task("default", ["watch"]);
})();
