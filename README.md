# Diffie-Hellman Key Exchange Demo

This project demonstrates the Diffie-Hellman key exchange protocol with two separate applications (Alice and Bob) that communicate over WebSockets.

## Setup

1. Install dependencies:
```bash
npm install
```

## Running the Demo

### Option 1: Two Terminal Windows

**Terminal 1 - Start Bob (Server):**
```bash
npm run bob
```

**Terminal 2 - Start Alice (Client):**
```bash
npm run alice
```

### Option 2: Run in Background
```bash
npm run bob &
npm run alice
```

## What Happens

1. Bob starts a WebSocket server and waits for Alice
2. Alice connects to Bob's server
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