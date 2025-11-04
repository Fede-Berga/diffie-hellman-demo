import { WebSocketServer } from 'ws';
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

const PORT = 8080;

class Bob {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.sharedSecret = null;
    this.alicePublicKey = null;
    this.ws = null;
    this.rl = null;
  }

  start() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           BOB (Server)                 ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Create WebSocket server
    const wss = new WebSocketServer({ port: PORT });
    console.log(`🟢 Bob's server listening on port ${PORT}`);
    console.log('⏳ Waiting for Alice to connect...\n');

    wss.on('connection', (ws) => {
      this.ws = ws;
      console.log('✅ Alice connected!\n');
      
      // Don't initialize DH immediately, wait for Alice's public key first
      
      ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });

      ws.on('close', () => {
        console.log('\n❌ Client disconnected');
        if (this.rl) {
          this.rl.close();
        }
      });
    });
  }

  initializeDH() {
    displayParams();
    
    // Generate Bob's private key
    this.privateKey = generatePrivateKey();
    console.log(`🔐 Bob's private key (b): ${this.privateKey} [SECRET - Never shared]`);
    
    // Compute Bob's public key
    this.publicKey = computePublicKey(
      DH_PARAMS.generator,
      this.privateKey,
      DH_PARAMS.prime
    );
    console.log(`🔓 Bob's public key (B): ${this.publicKey}`);
    console.log(`   Calculated as: ${DH_PARAMS.generator}^${this.privateKey} mod ${DH_PARAMS.prime} = ${this.publicKey}\n`);
    
    // Send public key to Alice
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

  handlePublicKey(alicePublicKey) {
    this.alicePublicKey = alicePublicKey;
    console.log(`📨 Received Alice's public key (A): ${alicePublicKey}\n`);
    
    // Initialize Bob's keys if not done yet
    if (!this.publicKey) {
      this.initializeDH();
    }
    
    // Compute shared secret
    this.sharedSecret = computeSharedSecret(
      alicePublicKey,
      this.privateKey,
      DH_PARAMS.prime
    );
    
    console.log('🔑 Computing shared secret...');
    console.log(`   s = A^b mod p = ${alicePublicKey}^${this.privateKey} mod ${DH_PARAMS.prime} = ${this.sharedSecret}`);
    console.log(`\n✨ Shared secret established: ${this.sharedSecret}\n`);
    console.log('🔒 Secure channel ready! You can now send encrypted messages.\n');
    
    this.startChat();
  }

  handleEncryptedMessage(encryptedData) {
    if (!this.sharedSecret) {
      console.log('\n⚠️  Received encrypted message before shared secret established');
      return;
    }
    try {
      const decrypted = decrypt(encryptedData, this.sharedSecret);
      console.log(`\n📩 Alice: ${decrypted}`);
      this.rl.prompt();
    } catch (error) {
      console.log(`\n❌ Failed to decrypt message: ${error.message}`);
      this.rl.prompt();
    }
  }

  startChat() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Bob> '
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
      if (this.ws) this.ws.close();
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// Start Bob
const bob = new Bob();
bob.start();