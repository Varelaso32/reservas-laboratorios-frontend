// Configuracion de Karma (plantilla estandar de Angular + reporte lcov)
// Angular usa este archivo como configuracion completa de Karma cuando
// angular.json apunta a el via la opcion "karmaConfig".
// El reporter 'lcov' genera:
//   - coverage/reservas-laboratorios-frontend/lcov.info (lo consume SonarQube en CI)
//   - coverage/reservas-laboratorios-frontend/lcov-report/ (reporte HTML navegable)
module.exports = function (config) {
  console.log('>>> KARMA.CONF.CARGADO desde', __dirname);
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: 'coverage/reservas-laboratorios-frontend',
      subdir: '.',
      reporters: [{ type: 'lcov' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
