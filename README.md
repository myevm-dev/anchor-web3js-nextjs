# Solana dApp Template

A beginner-friendly template for building applications (dApps) on Solana using Anchor and Next.js. This template implements a counter program that demonstrates essential Solana development concepts including PDAs (Program Derived Addresses), CPIs (Cross-Program Invocations), and state management.

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
