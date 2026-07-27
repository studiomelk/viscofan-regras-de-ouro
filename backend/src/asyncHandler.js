// Express 4 não encaminha rejeições de handlers async para o middleware
// de erro automaticamente — sem isso, uma falha de banco (ex: Postgres
// fora do ar) derruba o processo inteiro (unhandled rejection).
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
