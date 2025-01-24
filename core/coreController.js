const coreService = require('./coreService');
const { getUidFromToken } = require('../utils/auth-utils');

class BrandController {
  async provideAccess(req, res) {
    const uid = await getUidFromToken(req);
    const { email } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: 'Некоректний email або uid' });
    }

    try {
      const data = await coreService.provideAccess(email, uid);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async removeAccess (req, res) {
    const uid = await getUidFromToken(req);
    const { email } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: 'Некоректний email або uid' });
    }

    try {
      const data = await coreService.removeAccess(email, uid);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getUsers(req, res) {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Некоректний email' });
    }

    try {
      const users = await coreService.getUsers(email);
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getGoals(req, res) {
    const { email } = req.query;  
    const { uid } = req.query; 

    if (!email || !uid) {
      return res.status(400).json({ error: 'Некоректний email або uid' });
    }

    try {
      const userGoals = await coreService.getGoals(email, uid);
      return res.status(200).json(userGoals);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDiaries(req, res) {
    const { email } = req.query;
    const { uid } = req.query; 

    if (!email || !uid) {
      return res.status(400).json({ error: 'Некоректний email або uid' });
    }

    try {
      const userDiaries = await coreService.getDiaries(email, uid);
      return res.status(200).json(userDiaries);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async addDiaries(req, res) {
    // const uid = await getUidFromToken(req);
    const uid = '2GbpNpEZPpaDSiHfCpRsq1QZdWx2'
    const title = req.body.title
    console.log('title' + title)
    if (!uid || !title) {
      return res.status(400).json({ error: 'Некоректний uid або title' });
    }
    try {
      const userDiaries = await coreService.addDiaries(uid, title);
      return res.status(200).json(userDiaries);
    } catch(error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async editDiaries (req, res) {
        // const uid = await getUidFromToken(req);
        const uid = '2GbpNpEZPpaDSiHfCpRsq1QZdWx2'
        const title = req.body.title
        const diariesId = req.body.diariesId
        console.log('title' + title)
        if (!uid || !title) {
          return res.status(400).json({ error: 'Некоректний uid або title' });
        }
        try {
          const userDiaries = await coreService.editDiaries(uid, title, diariesId);
          return res.status(200).json(userDiaries);
        } catch(error) {
          return res.status(500).json({ error: error.message });
        }
  }
}

module.exports = new BrandController();
