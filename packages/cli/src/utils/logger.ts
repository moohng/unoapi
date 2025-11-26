import * as con from 'consola';

export function createLogger() {
  return con.create({
    defaults: {
      message: '[UNOAPI]',
    },
  });
}
