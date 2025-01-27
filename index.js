const { initializeFirebase } = require('./config/firebaseConfig');
initializeFirebase();
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const CoreController = require('./core/coreController');

exports.provideAccess = onRequest((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте POST' });
  }

  logger.info('Providing access...', { structuredData: true });
  return CoreController.provideAccess(req, res);
});
exports.getUsers = onRequest((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте GET' });
  }

  

  logger.info('Getting users...', { structuredData: true });
  return CoreController.getUsers(req, res);
});

exports.getGoals = onRequest((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте GET' });
  }

  logger.info('Getting goals...', { structuredData: true });
  return CoreController.getGoals(req, res);
});

exports.getDiaries = onRequest((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте GET' });
  }

  logger.info('Getting diaries...', { structuredData: true });
  return CoreController.getDiaries(req, res);
});

exports.removeAccess = onRequest((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте POST' });
  }

  logger.info('Removing access...', { structuredData: true });
  return CoreController.removeAccess(req, res);
});


exports.addDiaries = onRequest((req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте POST' });
  }

  logger.info('Add diaries ....', { structuredData: true });
  return CoreController.addDiaries(req, res);
});


exports.editDiaries = onRequest((req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте POST' });
  }

  logger.info('Add diaries ....', { structuredData: true });
  return CoreController.editDiaries(req, res);
});

exports.editTitleDiaries = onRequest((req, res) => {
  if(req.method !== 'PUT') {
    return res.status(405).json({ error: 'Метод не дозволений, використовуйте POST' });
  }
  logger.info('Editing diary titles...', { structuredData: true });
  return CoreController.editTitleDiaries(req, res);
})