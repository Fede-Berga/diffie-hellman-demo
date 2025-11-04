# Diffie-Hellman Key Exchange Demo

This project demonstrates the Diffie-Hellman key exchange protocol with two separate applications (Alice and Bob) that communicate over WebSockets.

## Setup

1. Install dependencies:
```bash
npm install
```

## Running the Demo

### With Eavesdropper (Recommended for Teaching)

Open 3 terminal windows and run in this order:

**Terminal 1 - Start Bob (Server):**
```bash
npm run bob
```
Wait for "Bob's server listening on port 8080"

**Terminal 2 - Start Eve (Eavesdropper):**
```bash
npm run eve
```
Wait for "Eve connected to Bob!" and "Waiting for Alice to connect..."

**Terminal 3 - Start Alice (Client):**
```bash
npm run alice
```

Now Alice and Bob can chat while Eve intercepts and decrypts everything!

### Without Eavesdropper (Direct Connection)

**Terminal 1 - Start Bob:**
```bash
npm run bob
```

**Terminal 2 - Start Alice:**
```bash
npm run alice
```
(Alice will connect directly to Bob when Eve is not running)

## What Happens

### With Eve (Eavesdropper):
1. Bob starts a WebSocket server on port 8080
2. Eve starts a proxy server on port 8081 and connects to Bob
3. Alice connects to Eve (thinking it's connecting to Bob)
4. Eve intercepts all messages between Alice and Bob
5. Eve sees both public keys (A and B)
6. Eve attempts to crack the shared secret using brute force
7. Alice and Bob successfully establish their shared secret
8. **Result**: Eve can see encrypted messages but cannot decrypt them (demonstrates security of DH)

### Without Eve:
1. Bob starts a WebSocket server and waits for Alice
2. Alice connects directly to Bob's server
3. Both generate their private keys
4. They agree on public parameters (prime p and generator g)
5. Each computes their public key
6. They exchange public keys over the network
7. Each computes the shared secret independently
8. They verify both have the same shared secret
9. They exchange encrypted messages using the shared secret

## How It Works

- **Prime (p)**: 23 (small for demonstration)
- **Generator (g)**: 5
- **Private Keys**: Randomly generated for each party
- **Public Keys**: Computed as g^private mod p
- **Shared Secret**: Computed as otherPublic^private mod p

## Educational Notes

This implementation uses small numbers for clarity. In production:
- Use primes of at least 2048 bits
- Use secure random number generation
- Implement proper key derivation functions
- Add authentication to prevent man-in-the-middle attacks

## Architecture

- `shared/crypto.js`: Common cryptographic functions
- `alice/alice.js`: Alice's client application
- `bob/bob.js`: Bob's server application
- `eve/eve.js`: Eve's eavesdropping proxy server

## Security Demonstration

Eve (the eavesdropper) demonstrates why Diffie-Hellman is secure:
- **What Eve can see**: Public parameters (p, g), Alice's public key (A), Bob's public key (B)
- **What Eve cannot see**: Alice's private key (a), Bob's private key (b)
- **What Eve tries**: Brute force attack to find private keys and compute shared secret
- **Result**: Even with small numbers, finding the shared secret is computationally difficult without knowing the private keys

This demonstrates the mathematical foundation of DH security: the discrete logarithm problem.