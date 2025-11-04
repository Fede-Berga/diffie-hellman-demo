/**
 * Shared cryptographic functions for Diffie-Hellman key exchange
 */

/**
 * Modular exponentiation: (base^exp) mod modulus
 * Uses square-and-multiply algorithm for efficiency
 */
export function modPow(base, exp, modulus) {
  if (modulus === 1) return 0;
  
  let result = 1;
  base = base % modulus;
  
  while (exp > 0) {
    if (exp % 2 === 1) {
      result = (result * base) % modulus;
    }
    exp = Math.floor(exp / 2);
    base = (base * base) % modulus;
  }
  
  return result;
}

/**
 * Generate a random private key between min and max
 */
export function generatePrivateKey(min = 2, max = 20) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Compute public key: g^privateKey mod p
 */
export function computePublicKey(g, privateKey, p) {
  return modPow(g, privateKey, p);
}

/**
 * Compute shared secret: otherPublicKey^privateKey mod p
 */
export function computeSharedSecret(otherPublicKey, privateKey, p) {
  return modPow(otherPublicKey, privateKey, p);
}

/**
 * Simple XOR cipher for demonstration (NOT secure for real use!)
 */
export function encrypt(message, key) {
  const keyStr = key.toString();
  let encrypted = '';
  
  for (let i = 0; i < message.length; i++) {
    const charCode = message.charCodeAt(i);
    const keyChar = keyStr.charCodeAt(i % keyStr.length);
    encrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  return Buffer.from(encrypted).toString('base64');
}

/**
 * Decrypt XOR cipher
 */
export function decrypt(encryptedBase64, key) {
  const encrypted = Buffer.from(encryptedBase64, 'base64').toString();
  const keyStr = key.toString();
  let decrypted = '';
  
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i);
    const keyChar = keyStr.charCodeAt(i % keyStr.length);
    decrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  return decrypted;
}

/**
 * Public Diffie-Hellman parameters
 */
export const DH_PARAMS = {
  prime: 23,        // Small prime for demonstration
  generator: 5      // Primitive root modulo prime
};

/**
 * Display the DH parameters
 */
export function displayParams() {
  console.log('\n=== Diffie-Hellman Parameters ===');
  console.log(`Prime (p): ${DH_PARAMS.prime}`);
  console.log(`Generator (g): ${DH_PARAMS.generator}`);
  console.log('================================\n');
}