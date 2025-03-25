# Solana Counter dApp Template

A beginner-friendly template for building applications (dApps) on Solana using Anchor and Next.js. This template implements a counter program that demonstrates essential Solana development concepts including PDAs (Program Derived Addresses), CPIs (Cross-Program Invocations), and state management.

This template is for educational purposes and set up for devnet use only.

## 🎓 Educational Purpose

This template is designed for developers who want to learn:

- How to build Solana programs using the Anchor framework
- How to work with PDAs for state management and program signing
- How to perform Cross-Program Invocations (CPIs)
- How to create frontends that interact with Solana programs
- How to handle wallet connections and transactions on a frontend

## 📝 Program Overview

The Solana program in this template demonstrates several core concepts through a simple counter application:

### Program Derived Addresses (PDAs)

1. **Counter PDA**

   - Stores the counter's current value
   - Derived using the seed "counter"
   - Global state accessible to all users
   - Automatically initialized on first increment

2. **Vault PDA**
   - Holds SOL tokens from user transactions
   - Derived using:
     - Seed "vault"
     - User's public key
   - Each user gets their own vault
   - Demonstrates using PDAs for CPI signing

### Instructions

1. **Increment**

   - Increases counter value by 1
   - Performs CPI to transfer 0.001 SOL from user to vault
   - Creates counter PDA if it doesn't exist
   - Demonstrates:
     - PDA initialization
     - System program CPI for SOL transfer
     - State management

2. **Decrement**
   - Decreases counter value by 1
   - Performs CPI to transfer 0.001 SOL from vault back to user
   - Demonstrates:
     - PDA signing (vault)
     - System program CPI with PDA as signer

### Cross-Program Invocations (CPIs)

The program demonstrates CPIs through SOL transfers:

- User → Vault (increment): Basic CPI to system program
- Vault → User (decrement): CPI with PDA signing

## 🏗 Project Structure

```
├── program/             # Solana program (smart contract)
│   ├── programs/        # Program source code
│   ├── tests/           # Program tests
│   └── Anchor.toml      # Anchor configuration
│
└── frontend/           # Next.js frontend
    ├── app/            # app router page and layout
    ├── components/     # React components
    └── anchor-idl/     # Program IDL
```

## 🔧 Core Features

1. **Solana Program**

   - Counter state management using PDA
   - Vault system using user-specific PDAs
   - SOL transfer demonstration using CPIs
   - PDA initialization and signing

2. **Frontend Application**
   - Wallet adapter integration
   - Real-time counter updates
   - Transaction toast notifications
   - UI with Tailwind CSS and shadcn/ui

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Solana CLI tools
- Anchor Framework

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install program dependencies:

```bash
cd program
pnpm install
anchor build
anchor keys sync
```

3. Install frontend dependencies:

```bash
cd frontend
pnpm install
```

### Development

1. Test the program:

```bash
cd program
anchor test
```

2. Run the frontend:

```bash
cd frontend
pnpm dev
```

## 💡 Learning Resources

### Program (Smart Contract)

- `program/programs/counter/src/lib.rs`: Core program logic
  - Instruction handling
  - PDA creation and management
  - CPI implementation

### Frontend Components

- `frontend/components/counter/`: Main dApp components
  - `CounterDisplay.tsx`: Real-time data updates
  - `IncrementButton.tsx` & `DecrementButton.tsx`: Transaction handling
  - `WalletButton.tsx`: Wallet adapter button

### Custom Hooks

- `frontend/components/counter/hooks/`:
  - `useProgram.tsx`: Program initialization and wallet management
  - `useTransactionToast.tsx`: Transaction notification

## 🔍 Key Concepts Demonstrated

1. **Program Development**

   - PDA creation and management
     - Counter state PDA
     - User-specific vault PDAs
   - Cross-Program Invocations (CPIs)
     - Basic transfers (user to vault)
     - PDA signing (vault to user)
   - State management
     - Initialize-if-needed pattern
     - Program state updates

2. **Frontend Development**
   - Wallet integration and connection
   - Transaction building and signing
   - Account subscription for real-time updates
   - Toast notifications for transaction feedback
