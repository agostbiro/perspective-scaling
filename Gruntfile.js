module.exports = function (grunt) 
{
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: grunt.util.linefeed + grunt.util.linefeed
      },
      noLib: {
        options: {
          banner: [
            '(function block()',
            '{',
            '',
            '\'use strict\';',
            '',
            'window.demo = {};',
            '\n'
          ].join('\n'),
          footer: '\n\n})();'
        },
        src: ['src/*.js'],
        dest: 'dist/tmp/app-nolib.js'
      },
      build: {
        src: [
          'lib/threejs/three-custom.js',
          'lib/underscore/underscore.js',
          'dist/tmp/app-nolib.js'
        ],
        dest: 'dist/app.js'
      },
      finalBuild: {
        options: {
          banner: [
            '// Copyright (c) 2015 Agost Biro. MIT License.',
            '// https://github.com/abiro/perspective-scaling/' + 
              'blob/master/LICENSE',
            '\n'
          ].join('\n')
        },
        src: [
          'lib/threejs/three-custom-min.js',
          'lib/underscore/underscore-min.js',
          'dist/tmp/app-nolib.min.js'
        ],
        dest: 'dist/app.min.js'
      }
    },

    jshint: {
      options: {
        camelcase: true,
        curly: false,
        immed: true,
        indent: 2,
        newcap: true,
        quotmark: 'single',
        maxlen: 80,
        globals: {
          _: true,
          demo: true,
          THREE: true
        },
        '-W030': true
      },
      all: [
        'Gruntfile.js',
        'src/*.js'
      ]
    },

    shell: {
      exportShaders: {
        options: {
          stdout: true,
          stderr: true
        },
        command: 'python3 shaders/export/export.py'
      }
    },

    uglify: {
      minify: {
        files: {
          'dist/tmp/app-nolib.min.js': ['dist/tmp/app-nolib.js']
        }
      }
    },

    watch: {
      src: {
        files: ['src/*.js'],
        tasks: ['default'],
      },
      shaders: {
        files: ['shaders/*.glsl'],
        tasks: ['shaders'],
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('shaders', ['shell:exportShaders']);
  grunt.registerTask('hint', ['jshint:all:verbose']);
  grunt.registerTask('default', ['concat:noLib', 'concat:build']);
  grunt.registerTask('minify', ['uglify:minify']);
  grunt.registerTask(
    'finalBuild', 
    [
      'shell:exportShaders',
      'jshint:all:verbose',
      'concat:noLib', 
      'concat:build',
      'uglify:minify',
      'concat:finalBuild'
    ]
  );
};