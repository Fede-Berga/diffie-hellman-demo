import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import {
  DH_PARAMS,
  computePublicKey,
  computeSharedSecret,
  decrypt
} from '../shared/crypto.js';

const EVE_PORT = 8081; // Eve's proxy port (Alice connects here)
const BOB_PORT = 8080; // Bob's actual port

class Eve {
  constructor() {
    this.aliceWs = null;
    this.bobWs = null;
    this.alicePublicKey = null;
    this.bobPublicKey = null;
    this.crackedSecret = null;
    this.interceptedMessages = [];
    this.messageBuffer = [];
  }

  start() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      EVE (Eavesdropper/Proxy)          ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Connect to Bob first
    this.connectToBob();

    // Start proxy server for Alice
    const wss = new WebSocketServer({ port: EVE_PORT });
    console.log(`🕵️  Eve's proxy listening on port ${EVE_PORT}`);
    console.log('⏳ Waiting for Alice to connect...\n');

    wss.on('connection', (ws) => {
      this.aliceWs = ws;
      console.log('✅ Alice connected to Eve\'s proxy!\n');
      console.log('🎯 Eve is now in the middle - intercepting all traffic\n');
      console.log('─'.repeat(50));

      // Send any buffered messages from Bob
      if (this.messageBuffer && this.messageBuffer.length > 0) {
        console.log(`📦 Sending ${this.messageBuffer.length} buffered message(s) to Alice...`);
        this.messageBuffer.forEach(data => {
          ws.send(data);
        });
        this.messageBuffer = [];
      }

      ws.on('message', (data) => {
        this.interceptFromAlice(data);
      });

      ws.on('close', () => {
        console.log('\n❌ Alice disconnected');
        console.log('🛑 Eve shutting down...');
        if (this.bobWs) this.bobWs.close();
      });
    });
  }

  connectToBob() {
    console.log(`🔗 Eve connecting to Bob at ws://localhost:${BOB_PORT}...`);
    
    this.bobWs = new WebSocket(`ws://localhost:${BOB_PORT}`);

    this.bobWs.on('open', () => {
      console.log('✅ Eve connected to Bob!\n');
    });

    this.bobWs.on('message', (data) => {
      this.interceptFromBob(data);
    });

    this.bobWs.on('error', (error) => {
      console.error('❌ Could not connect to Bob:', error.message);
      console.log('💡 Make sure Bob is running first (npm run bob)');
    });

    this.bobWs.on('close', () => {
      console.log('\n❌ Bob disconnected');
      console.log('🛑 Eve shutting down...');
      if (this.aliceWs) this.aliceWs.close();
    });
  }

  interceptFromAlice(data) {
    const message = JSON.parse(data.toString());
    
    console.log('\n📨 INTERCEPTED from Alice → Bob:');
    console.log(`   Type: ${message.type}`);
    
    if (message.type === 'public_key') {
      this.alicePublicKey = message.publicKey;
      console.log(`   🔓 Alice's public key (A): ${message.publicKey}`);
      console.log(`\n🕵️  Eve now knows: p=${DH_PARAMS.prime}, g=${DH_PARAMS.generator}, A=${this.alicePublicKey}`);
      
      if (this.bobPublicKey) {
        this.attemptCrack();
      }
    } else if (message.type === 'encrypted_message') {
      console.log(`   🔒 Encrypted data: ${message.data.substring(0, 20)}...`);
      this.interceptedMessages.push({
        from: 'Alice',
        data: message.data
      });
      this.tryDecrypt(message.data);
    }
    
    console.log('─'.repeat(50));
    console.log('🔄 Forwarding message to Bob...');
    
    // Forward to Bob
    if (this.bobWs && this.bobWs.readyState === 1) {
      this.bobWs.send(data);
    }
  }

  interceptFromBob(data) {
    const message = JSON.parse(data.toString());
    
    console.log('\n📨 INTERCEPTED from Bob → Alice:');
    console.log(`   Type: ${message.type}`);
    
    if (message.type === 'public_key') {
      this.bobPublicKey = message.publicKey;
      console.log(`   🔓 Bob's public key (B): ${message.publicKey}`);
      console.log(`\n🕵️  Eve now knows: p=${DH_PARAMS.prime}, g=${DH_PARAMS.generator}, B=${this.bobPublicKey}`);
      
      if (this.alicePublicKey) {
        this.attemptCrack();
      }
    } else if (message.type === 'encrypted_message') {
      console.log(`   🔒 Encrypted data: ${message.data.substring(0, 20)}...`);
      this.interceptedMessages.push({
        from: 'Bob',
        data: message.data
      });
      this.tryDecrypt(message.data);
    }
    
    console.log('─'.repeat(50));
    console.log('🔄 Forwarding message to Alice...');
    
    // Forward to Alice only if Alice is connected
    if (this.aliceWs && this.aliceWs.readyState === 1) {
      this.aliceWs.send(data);
    } else {
      console.log('⚠️  Alice not connected yet, buffering message...');
      // Store message to send later
      if (!this.messageBuffer) this.messageBuffer = [];
      this.messageBuffer.push(data);
    }
  }

  attemptCrack() {
    console.log('\n🔨 EVE ATTEMPTING TO CRACK THE SHARED SECRET...\n');
    console.log('Strategy: Brute force attack on private keys');
    console.log(`Known values: p=${DH_PARAMS.prime}, g=${DH_PARAMS.generator}, A=${this.alicePublicKey}, B=${this.bobPublicKey}\n`);
    
    console.log('Trying to find Alice\'s private key (a):');
    const startTime = Date.now();
    let attempts = 0;
    
    // Try to crack Alice's private key
    for (let a = 1; a < DH_PARAMS.prime; a++) {
      attempts++;
      const testPublic = computePublicKey(DH_PARAMS.generator, a, DH_PARAMS.prime);
      
      if (testPublic === this.alicePublicKey) {
        const elapsed = Date.now() - startTime;
        console.log(`✓ Found Alice's private key: a = ${a} (after ${attempts} attempts in ${elapsed}ms)`);
        
        // Compute shared secret
        this.crackedSecret = computeSharedSecret(this.bobPublicKey, a, DH_PARAMS.prime);
        console.log(`\n🎯 EVE CRACKED THE SHARED SECRET: ${this.crackedSecret}`);
        console.log(`   Calculated as: B^a mod p = ${this.bobPublicKey}^${a} mod ${DH_PARAMS.prime} = ${this.crackedSecret}\n`);
        
        console.log('⚠️  SECURITY NOTE:');
        console.log('   With small numbers (p=23), brute force is feasible.');
        console.log('   With real-world parameters (2048+ bit primes),');
        console.log('   this would take billions of years!\n');
        
        // Try to decrypt any stored messages
        if (this.interceptedMessages.length > 0) {
          this.decryptStoredMessages();
        }
        
        return;
      }
    }
    
    console.log('❌ Failed to crack (this should not happen with our small numbers)');
  }

  tryDecrypt(encryptedData) {
    if (this.crackedSecret) {
      try {
        const decrypted = decrypt(encryptedData, this.crackedSecret);
        console.log(`   🔓 EVE SUCCESSFULLY DECRYPTED: "${decrypted}"`);
        console.log(`   ⚠️  Alice and Bob think their conversation is private!`);
      } catch (e) {
        console.log(`   ❌ Decryption failed: ${e.message}`);
      }
    } else {
      console.log('   ⏳ Cannot decrypt yet - shared secret not cracked');
    }
  }

  decryptStoredMessages() {
    console.log('📋 Decrypting previously intercepted messages:\n');
    
    for (const msg of this.interceptedMessages) {
      try {
        const decrypted = decrypt(msg.data, this.crackedSecret);
        console.log(`   ${msg.from}: "${decrypted}"`);
      } catch (e) {
        console.log(`   ${msg.from}: [Decryption failed]`);
      }
    }
    console.log('');
  }
}

// Start Eve
const eve = new Eve();
eve.start();