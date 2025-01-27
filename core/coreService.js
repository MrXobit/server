const admin = require('firebase-admin');
const CryptoJS = require("crypto-js");
const { v1: uuidv1 } = require('uuid');
const CryptoService = require('../utils/crypto');



class CoreService {
  async provideAccess(email, uid) {
    const accessholderRef = admin.firestore().collection('accessholder').where('email', '==', email);
    const accessholderSnap = await accessholderRef.get();

    let accessholderDoc;
    let accessholderData;

    if (accessholderSnap.empty) {
      const newAccessholderRef = admin.firestore().collection('accessholder').doc();
      accessholderData = {
        email: email,
        allowedUsers: [uid],
      };
      await newAccessholderRef.set(accessholderData);
      accessholderDoc = newAccessholderRef;
    } else {
      accessholderDoc = accessholderSnap.docs[0];
      accessholderData = accessholderDoc.data();
      const allowedUsers = accessholderData?.allowedUsers || [];

      if (allowedUsers.includes(uid)) {
        throw new Error('User already has access');
      }

      allowedUsers.push(uid);
      await accessholderDoc.ref.update({ allowedUsers });
    }

    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        allowedUsers: [email],
      });
    } else {
      const userData = userDoc.data();
      const userAllowedUsers = userData?.allowedUsers || [];
      if (!userAllowedUsers.includes(email)) {
        userAllowedUsers.push(email);
        await userRef.update({ allowedUsers: userAllowedUsers });
      }
    }

    return {
      message: 'Access granted',
      accessholder: {
        email: accessholderData.email,
        allowedUsers: accessholderData.allowedUsers,
      },
    };
  }

  async removeAccess(email, uid) {
    const accessholderRef = admin.firestore().collection('accessholder').where('email', '==', email);
    const accessholderSnap = await accessholderRef.get();
  
    if (accessholderSnap.empty) {
      throw new Error('Accessholder not found');
    }
  
    const accessholderDoc = accessholderSnap.docs[0];
    const accessholderData = accessholderDoc.data();
    let allowedUsers = accessholderData?.allowedUsers || [];
  
    if (!allowedUsers.includes(uid)) {
      throw new Error('User does not have access');
    }
  
    allowedUsers = allowedUsers.filter(user => user !== uid);
    await accessholderDoc.ref.update({ allowedUsers });
  
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();
  
    if (userDoc.exists) {
      const userData = userDoc.data();
      let userAllowedUsers = userData?.allowedUsers || [];
      userAllowedUsers = userAllowedUsers.filter(userEmail => userEmail !== email);
  
      await userRef.update({ allowedUsers: userAllowedUsers });
    }
  
    return {
      message: 'Access removed',
      accessholder: {
        email: accessholderData.email,
        allowedUsers,
      },
    };
  }
  

  async getUsers(email) {
    const accessholderRef = admin.firestore().collection('accessholder');
    const snapshot = await accessholderRef.where('email', '==', email).get();

    if (snapshot.empty) {
      throw new Error('Accessholder with the provided email not found');
    }

    const accessholderDoc = snapshot.docs[0];
    const accessholderData = accessholderDoc.data();
    const allowedUsers = accessholderData?.allowedUsers || [];

    if (!allowedUsers.length) {
      throw new Error('No users found for the provided UIDs');
    }

    const usersRef = admin.firestore().collection('users');
    const userSnapshots = await Promise.all(
      allowedUsers.map((uid) => usersRef.doc(uid).get())
    );

    const usersData = userSnapshots
      .filter((doc) => doc.exists)
      .map((doc) => {
        const userData = doc.data();
        return { uid: doc.id, ...userData };
      });

    if (!usersData.length) {
      throw new Error('No users found for the provided UIDs');
    }

    return usersData;
  }

  async getGoals(email, uid) {
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const allowedUsers = userData?.allowedUsers || [];
    if (!allowedUsers.includes(email)) {
      throw new Error('Access denied: email not found in allowedUsers');
    }

    const goalsRef = userRef.collection('goals');
    const goalsSnapshot = await goalsRef.get();

    if (goalsSnapshot.empty) {
      throw new Error('No goals found for the user');
    }

    const goals = [];
    goalsSnapshot.forEach((goalDoc) => {
      const goalData = goalDoc.data();
      const decryptionKey = goalDoc.id.substring(0, 16);
      const goalFields = Object.entries(goalData).map(([key, value]) => {
        if (value && typeof value === 'string' && value.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            const decryptedValue = CryptoService.decrypt(decryptionKey, value);
            return { [key]: decryptedValue };
          } catch (err) {
            return { [key]: value };
          }
        }
        return { [key]: value };
      });
      goals.push({ id: goalDoc.id, ...goalFields.reduce((acc, field) => ({ ...acc, ...field }), {}) });
    });

    return { message: 'Goals retrieved successfully', goals };
  }


  async getDiaries(email, uid) {
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const allowedUsers = userData?.allowedUsers || [];
    if (!allowedUsers.includes(email)) {
      throw new Error('Access denied: email not found in allowedUsers');
    }

    const diariesRef = userRef.collection('diaries');
    const diariesSnapshot = await diariesRef.get();

    if (diariesSnapshot.empty) {
      throw new Error('No diaries found for the user');
    }

    const diaries = [];
    diariesSnapshot.forEach((diaryDoc) => {
      const diaryData = diaryDoc.data();
      const decryptionKey = diaryDoc.id.substring(0, 16);
      const decryptAndParse = (key, value) => {
        if (typeof value === 'string' && value.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            return CryptoService.decrypt(key, value);
          } catch (err) {
            return value; 
          }
        } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed.map((item) => decryptAndParse(key, item));
            }
          } catch (err) {
            return value; 
          }
        } else if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
  
          try {
            const parsed = JSON.parse(value);
            return decryptAndParse(key, parsed); 
          } catch (err) {
            return value;
          }
        }
        return value;
      };

      
      const diaryFields = Object.entries(diaryData).map(([key, value]) => {
        const decryptedValue = decryptAndParse(decryptionKey, value);
        return { [key]: decryptedValue };
      });

      diaries.push({ id: diaryDoc.id, ...diaryFields.reduce((acc, field) => ({ ...acc, ...field }), {}) });
    });

    return { message: 'Diaries retrieved successfully', diaries };
}


  async addDiaries(uid, title) {
    try {
      const userRef = admin.firestore().collection('users').doc(uid);
      const userSnapshot = await userRef.get();
  
      if (!userSnapshot.exists) {
        return { success: false, message: `User with UID ${uid} does not exist.` };
      }
  
      const id = uuidv1();  
      const key = id.substring(0, 16);
      const cryptTitle = CryptoService.encrypt(key, title);
  
      const dateTime = new Date();
      const date = `${String(dateTime.getDate()).padStart(2, '0')}/${String(dateTime.getMonth() + 1).padStart(2, '0')}/${dateTime.getFullYear()},${dateTime.toISOString().substring(11, 19)}`;
  
      const diaryData = {
        id: id,
        lastUpdate: date,
        title: JSON.stringify([cryptTitle]),
        initTitle: JSON.stringify([]),
        objection: JSON.stringify([]),
        initOb: JSON.stringify([]),
        date: date,
        tags: JSON.stringify(['API']),
        pathToAudio: JSON.stringify([]),
        pathInit: JSON.stringify([]),
        pathObjection: JSON.stringify([]),
        pathOb: JSON.stringify([]),
        isArchive: JSON.stringify(['0']),
        isObArchive: JSON.stringify(['0']),
        progressCore: JSON.stringify([]),
        progressWork: JSON.stringify([]),
        progressObCore: JSON.stringify([]),
        progressObWork: JSON.stringify([]),
        progressDiagnostic: JSON.stringify([]),
        progressObDiagnostic: JSON.stringify([]),
        pQuestions: JSON.stringify([]),
        pQuestionsOb: JSON.stringify([]),
        grade: JSON.stringify(['0']),
        gradeOb: JSON.stringify([]),
        diagnostic: JSON.stringify(['0']),
        diagnosticOb: JSON.stringify([]),
        secPCore: JSON.stringify([]),
        secPWork: JSON.stringify([]),
        secPOCore: JSON.stringify([]),
        secPOBWork: JSON.stringify([]),
        typeOb: JSON.stringify([]),
        dCt: null,
        doCt: null,
        dLu: null,
        doLu: null,
        dSd: null,
        doSd: null,
        dLd: null,
        doLd: null,
        dObLd: null,
        doObLd: null,
      };
      
  
      await userRef.collection('diaries').doc(id).set(diaryData, { merge: true });
  
      return { success: true, message: 'Diary added successfully.', diaryId: id };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  

  async editDiaries(uid, title, diariesId) {
    try {
        const userRef = admin.firestore().collection('users').doc(uid);
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            return { success: false, message: `User with UID ${uid} does not exist.` };
        }

        const diaryRef = userRef.collection('diaries').doc(diariesId);
        const diarySnapshot = await diaryRef.get();

        if (!diarySnapshot.exists) {
            return { success: false, message: `Diary with ID ${diariesId} does not exist.` };
        }

        const dateTime = new Date();
        const date = `${String(dateTime.getDate()).padStart(2, '0')}/${String(dateTime.getMonth() + 1).padStart(2, '0')}/${dateTime.getFullYear()},${dateTime.toISOString().substring(11, 19)}`;

    
        const diaryData = diarySnapshot.data();
        const key = diariesId.substring(0, 16);
        const cryptTitle = CryptoService.encrypt(key, title);

     
        const safeParse = (data) => {
            try {
                return data ? JSON.parse(data) : [];
            } catch (error) {
                return [];
            }
        };

   
        const titleList = safeParse(diaryData.title);
        titleList.push(cryptTitle);

        const initTitleList = safeParse(diaryData.initTitle);
        initTitleList.push('');

        const pathToAudioTList = safeParse(diaryData.pathToAudioT);
        pathToAudioTList.push('');

        const pathInitTList = safeParse(diaryData.pathInitT);
        pathInitTList.push('');

        const isArchiveList = safeParse(diaryData.isArchive);
        isArchiveList.push('0');

        const progressCoreList = safeParse(diaryData.progressCore);
        progressCoreList.push('[]');

        const progressWorkList = safeParse(diaryData.progressWork);
        progressWorkList.push('[]');

        const progressDiagnosticList = safeParse(diaryData.progressDiagnostic);
        progressDiagnosticList.push('[]');

        const pQuestionsList = safeParse(diaryData.pQuestions);
        pQuestionsList.push('[]');

        const gradeList = safeParse(diaryData.grade);
        gradeList.push('0');

        const diagnosticList = safeParse(diaryData.diagnostic);
        diagnosticList.push('0');

        const secPCoreList = safeParse(diaryData.secPCore);
        secPCoreList.push('_');

        const secPWorkList = safeParse(diaryData.secPWork);
        secPWorkList.push('_');

        const typeList = safeParse(diaryData.type);
        typeList.push('0');

   
        const updatedDiaryData = {
            ...diaryData,
            title: JSON.stringify(titleList),
            initTitle: JSON.stringify(initTitleList),
            pathToAudioT: JSON.stringify(pathToAudioTList),
            pathInitT: JSON.stringify(pathInitTList),
            isArchive: JSON.stringify(isArchiveList),
            progressCore: JSON.stringify(progressCoreList),
            progressWork: JSON.stringify(progressWorkList),
            progressDiagnostic: JSON.stringify(progressDiagnosticList),
            pQuestions: JSON.stringify(pQuestionsList),
            grade: JSON.stringify(gradeList),
            diagnostic: JSON.stringify(diagnosticList),
            secPCore: JSON.stringify(secPCoreList),
            secPWork: JSON.stringify(secPWorkList),
            type: JSON.stringify(typeList),
            lastUpdate: date,
        };

        await diaryRef.set(updatedDiaryData, { merge: true });

        return { success: true, message: 'Diary updated successfully.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}


async editTitleDiaries(uid, title, diariesId, index) {
  const userRef = admin.firestore().collection('users').doc(uid);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) {
    return { success: false, message: `User with UID ${uid} does not exist.` };
  }

  const diaryRef = userRef.collection('diaries').doc(diariesId);
  const diarySnapshot = await diaryRef.get();

  if (!diarySnapshot.exists) {
    return { success: false, message: `Diary with ID ${diariesId} does not exist.` };
  }

  // Отримуємо дані документа
  const diaryData = diarySnapshot.data();

  // Отримуємо поле `title`, яке є рядком JSON, і парсимо його
  const titleArray = diaryData.title ? JSON.parse(diaryData.title) : [];

  if (index < 0 || index >= titleArray.length) {
    return { success: false, message: `Invalid index ${index}.` };
  }

  // Шифруємо новий заголовок
  const key = diariesId.substring(0, 16);
  const cryptTitle = CryptoService.encrypt(key, title);

  // Оновлюємо значення за індексом
  titleArray[index] = cryptTitle;

  // Записуємо оновлені дані назад у Firestore
  await diaryRef.update({
    title: JSON.stringify(titleArray), // Конвертуємо масив у JSON-рядок
  });

  return { success: true, message: `Title updated successfully at index ${index}.` };
}

  
}

module.exports = new CoreService();
