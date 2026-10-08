// Configuracion de Karma - Reporte de cobertura para SonarQube Cloud
// Angular busca karma.conf.js en la raiz por defecto (opcion karmaConfig).
// El reporter 'lcov' genera:
//   - coverage/reservas-laboratorios-frontend/lcov.info (lo consume SonarQube en CI)
//   - coverage/reservas-laboratorios-frontend/lcov-report/ (reporte HTML navegable)
module.exports = function (config) {
  console.log('>>> KARMA.CONF.CARGADO desde', __dirname);
  config.set({
    coverageReporter: {
      dir: 'coverage/reservas-laboratorios-frontend',
      subdir: '.',
      reporters: [{ type: 'lcov' }, { type: 'text-summary' }],
    },
  });
};
