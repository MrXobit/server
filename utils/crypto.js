const CryptoJS = require('crypto-js');

class CryptoService {
  encrypt(keyString, text) {
    const key = CryptoJS.enc.Utf8.parse(keyString);
    const iv = CryptoJS.enc.Utf8.parse(keyString.substring(0, 16));
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString(); 
  }

  decrypt = (keyString, text) => {
    const encryptedData = CryptoJS.enc.Base64.parse(text);  
    const key = CryptoJS.enc.Utf8.parse(keyString);
    const iv = CryptoJS.enc.Utf8.parse(keyString.substring(0, 16)); 
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedData }, key, { iv });
    return decrypted.toString(CryptoJS.enc.Utf8); 
};
}

module.exports = new CryptoService();
