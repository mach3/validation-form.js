
module.exports = function(grunt){

	require("load-grunt-tasks")(grunt);

	var banner = grunt.template.process(
		grunt.file.read("src/banner.js"),
		{data: grunt.file.readJSON("package.json")}
	);

	grunt.initConfig({
		uglify: {
			build: {
				options: {banner: banner},
				files: {
					"dist/validation-form.min.js": ["src/validation-form.js"]
				}
			}
		},
		concat: {
			build: {
				options: {banner: banner},
				files: {
					"dist/validation-form.js": ["src/validation-form.js"]
				}
			}
		}
	});

	grunt.registerTask("default", []);
	grunt.registerTask("build", ["uglify:build", "concat:build"]);

};