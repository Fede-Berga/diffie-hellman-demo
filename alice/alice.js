import WebSocket from 'ws';
import readline from 'readline';
import {
  DH_PARAMS,
  generatePrivateKey,
  computePublicKey,
  computeSharedSecret,
  encrypt,
  decrypt,
  displayParams
} from '../shared/crypto.js';

const BOB_URL = 'ws://localhost:8080';

class Alice {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.sharedSecret = null;
    this.bobPublicKey = null;
    this.ws = null;
    this.rl = null;
  }

  start() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           ALICE (Client)               ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log(`🔗 Connecting to Bob at ${BOB_URL}...`);
    
    this.ws = new WebSocket(BOB_URL);

    this.ws.on('open', () => {
      console.log('✅ Connected to Bob!\n');
      this.initializeDH();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });

    this.ws.on('error', (error) => {
      console.error('❌ Connection error:', error.message);
      console.log('\n💡 Make sure Bob is running first (npm run bob)');
      process.exit(1);
    });

    this.ws.on('close', () => {
      console.log('\n❌ Disconnected from Bob');
      if (this.rl) this.rl.close();
      process.exit(0);
    });
  }

  initializeDH() {
    displayParams();
    
    // Generate Alice's private key
    this.privateKey = generatePrivateKey();
    console.log(`🔐 Alice's private key (a): ${this.privateKey} [SECRET - Never shared]`);
    
    // Compute Alice's public key
    this.publicKey = computePublicKey(
      DH_PARAMS.generator,
      this.privateKey,
      DH_PARAMS.prime
    );
    console.log(`🔓 Alice's public key (A): ${this.publicKey}`);
    console.log(`   Calculated as: ${DH_PARAMS.generator}^${this.privateKey} mod ${DH_PARAMS.prime} = ${this.publicKey}\n`);
    
    // Send public key to Bob
    this.send({
      type: 'public_key',
      publicKey: this.publicKey
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'public_key':
        this.handlePublicKey(message.publicKey);
        break;
      case 'encrypted_message':
        this.handleEncryptedMessage(message.data);
        break;
    }
  }

  handlePublicKey(bobPublicKey) {
    this.bobPublicKey = bobPublicKey;
    console.log(`📨 Received Bob's public key (B): ${bobPublicKey}\n`);
    
    // Compute shared secret
    this.sharedSecret = computeSharedSecret(
      bobPublicKey,
      this.privateKey,
      DH_PARAMS.prime
    );
    
    console.log('🔑 Computing shared secret...');
    console.log(`   s = B^a mod p = ${bobPublicKey}^${this.privateKey} mod ${DH_PARAMS.prime} = ${this.sharedSecret}`);
    console.log(`\n✨ Shared secret established: ${this.sharedSecret}\n`);
    console.log('🔒 Secure channel ready! You can now send encrypted messages.\n');
    
    this.startChat();
  }

  handleEncryptedMessage(encryptedData) {
    const decrypted = decrypt(encryptedData, this.sharedSecret);
    console.log(`\n📩 Bob: ${decrypted}`);
    this.rl.prompt();
  }

  startChat() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Alice> '
    });

    console.log('Type your message and press Enter to send (Ctrl+C to exit):\n');
    this.rl.prompt();

    this.rl.on('line', (line) => {
      const message = line.trim();
      if (message) {
        const encrypted = encrypt(message, this.sharedSecret);
        this.send({
          type: 'encrypted_message',
          data: encrypted
        });
        console.log(`📤 Sent (encrypted): ${message}`);
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// Start Alice
const alice = new Alice();
alice.start();