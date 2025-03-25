# Solana Counter dApp Template

A beginner-friendly template for building applications (dApps) on Solana using Anchor and Next.js. This template implements a simple counter program with increment and decrement instructions to demonstrate core concepts of Solana development.

This template is for educational purposes and set up for devnet use.

## 🎓 Educational Purpose

This template is designed to demonstrate the basics basics of:

- How to build Solana programs using the Anchor framework
- How to create frontends that interact with Solana programs

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

   - Simple counter with increment/decrement instructions
   - PDA (Program Derived Address) for counter state management and CPI signing
   - CPI (Cross Program Invocation) for SOL transfers on increment/decrement

2. **Frontend Application**
   - Wallet adapter integration
   - Integrated to invoke the counter program
   - Real-time counter updates
   - UI with Tailwind CSS and shadcn/ui

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Solana CLI tools
- Anchor Framework

### Installation

1. Install program dependencies:

```bash
cd program
pnpm install
anchor build
anchor keys sync
```

2. Install frontend dependencies:

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
  - Learn about Anchor program structure
  - Understand account management
  - See how to handle program instructions

### Frontend Components

- `frontend/components/counter/`: Main dApp components
  - `CounterDisplay.tsx`: Real-time data updates
  - `IncrementButton.tsx` & `DecrementButton.tsx`: Transaction handling
  - `WalletButton.tsx`: Wallet connection management

### Custom Hooks

- `frontend/components/counter/hooks/`:
  - `useProgram.tsx`: Program initialization and wallet management
  - `useTransactionToast.tsx`: Transaction notification handling

## 🔍 Key Concepts Demonstrated

1. **Program Development**

   - PDA (Program Derived Address) creation and management
   - State management in Solana programs
   - Cross-Program Invocation (CPI) for SOL transfers and PDA signing

2. **Frontend Development**

   - Wallet integration and connection management
   - Transaction building and signing
   - Account subscription for real-time updates
