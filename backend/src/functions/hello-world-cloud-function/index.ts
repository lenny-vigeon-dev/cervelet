import type { HttpFunction } from '@google-cloud/functions-framework';

export const helloWorld: HttpFunction = (_req, res) => {
  res.send('Hello World!');
};
