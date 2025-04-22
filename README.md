<a id="readme-top"></a>
<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="https://github.com/user-attachments/assets/6e375089-c4c4-435f-aee2-86d48463c7e1" alt="Logo" width="300" height="300">
  </a>




<h3 align="center">LendKawKaw</h3>

  <p align="center">
    Blockchain Powered Microloan Webapp

  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project



-   **Blockchain-Powered Platform:** Utilizes blockchain technology to ensure security, transparency, and efficiency in lending.
    
-   **Minimal Documentation:** Requires just a selfie and basic financial proof (e.g., bank statements, grocery receipts, or education expenses) to streamline the process.
    
-   **Competitive Interest Rates:** Offers low-interest rates, making microloans more affordable.
    
-   **Accelerated Lending Process:** Reduces paperwork and processing time, speeding up loan approvals.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## Tech Stack
- **Smart Contracts**: Solidity + Hardhat
- **Frontend**: React + Tailwind CSS
- **Blockchain**: Ethereum 

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites
- Node.js v16+
- MetaMask wallet
- [Alchemy API Key](https://www.alchemy.com/)

### Installation
```bash
# Clone repository
git clone https://github.com/seechee6/LendKawKaw.git
cd LendKawKaw

# Install frontend dependencies
cd client && npm install

# Install smart contract dependencies 
cd ../smart_contract && npm install
```

### Running Locally
```bash
# Start frontend
cd client && npm run dev

# Deploy contracts
cd ../smart_contract && npx hardhat run scripts/deploy.js --network localhost
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage
### 🆔 Onboarding
- **Secure Verification**: Start with a quick selfie + flexible documentation (payslips, grocery receipts, or education bills)
- **Inclusive Access**: No traditional income proof? Validate through essential spending patterns
- **Instant Access**: Approved within hours after verification

### 📊 Dashboard
- **Financial Snapshot**: Track active loans, repayments, and balances at a glance
- **Payment Alerts**: Never miss deadlines with smart notifications

### 💰 Loan Page
- **Smart Scoring**: Personalized rates via AI credit evaluation
- **Guarantor Boost**: Increase limits by inviting trusted co-signers
- **Lender Protection Fee**: Safeguards lenders against defaults

### 🤝 Lend Page
- **Testnet Transactions**: Fund via MetaMask (Sepolia ETH)
- **Stable Future**: Post-launch transition to USDT
- **Transparent Deals**: Review borrower risk before funding

### 🔍 Premium Features
- **Pro Insights**: Monthly subscription for risk analysis & portfolio reports
- **Predictive Tools**: AI-driven default risk assessments
<br><br>
<div align="center">
  <table>
    <tr>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/62a77740-11fa-4815-b056-1b7258611a77" alt="User Onboarding" width="100%">
        <br><br>
        <b>User Onboarding</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/8ad281df-2c2d-4249-9a56-86c988354383" alt="Dashboard" width="100%">
        <br><br>
        <b>Dashboard</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/2e1611b1-5960-42c9-b73e-699a73f8b404" alt="Loan Page" width="100%">
        <br><br>
        <b>Loan Page</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/0be7255c-82b4-46d0-99bd-7c0419394d3f" alt="Lending Page" width="100%">
        <br><br>
        <b>Lending Page</b>
        <br><br>
      </td>
    </tr>
    <tr>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/fd2db3d5-dec1-4a5e-a512-dbc1bf5ee7a3" alt="Transfer Funds" width="100%">
        <br><br>
        <b>Transfer Funds</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/ad394cac-77c4-4513-a841-655bca6594ca" alt="Transactions History" width="100%">
        <br><br>
        <b>Transactions History</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/c93c54e1-19e7-4f5c-8865-3fc2a539f0cf" alt="Profile" width="100%">
        <br><br>
        <b>Profile</b>
        <br><br>
      </td>
      <td align="center" width="25%">
        <img src="https://github.com/user-attachments/assets/25359646-1bd8-4bd9-9a5e-d11520f37aa2" alt="Premium Reports" width="100%">
        <br><br>
        <b>Premium Reports</b>
        <br><br>
      </td>
    </tr>
  </table>
</div>
<p align="right">(<a href="#readme-top">back to top</a>)</p>

# MicroLoanChain

A blockchain-powered microloan platform that facilitates trust, minimizes operational costs, and ensures fair access to financial services for underserved populations.

## Features

- Apply for microloans with customizable terms
- Store loan terms on Solana blockchain for transparency and security
- Browse and fund available loans
- Manage loan repayments
- Credit score system for borrowers

## Blockchain Integration

The platform uses Solana blockchain to store and retrieve loan terms, ensuring transparency and immutability of loan agreements. The blockchain integration includes:

1. **Storing Loan Terms**: When a borrower applies for a loan, the terms are stored on the Solana blockchain, including:
   - Loan amount
   - Interest rate
   - Repayment period
   - Purpose of the loan

2. **Retrieving Loan Terms**: On the lending page, available loans are fetched from the blockchain, allowing lenders to see the exact terms they'll be funding.

3. **Funding on Blockchain**: When a lender agrees to fund a loan, the transaction is executed on the blockchain, transferring funds to the borrower and updating the loan status.

## Technical Implementation

The project uses:

- Solana blockchain for storing loan terms and handling transactions
- Phantom wallet for connecting to the Solana network
- Anchor framework for Solana program interactions
- React + Next.js for the frontend
- TailwindCSS for styling

## Getting Started

1. Clone the repository:
```
git clone <repository-url>
```

2. Install dependencies:
```
cd MicroLoanChain/client
npm install
```

3. Set up environment variables:
Create a `.env` file in the client directory with:
```
VITE_PROGRAM_ID=Transactions11111111111111111111111111111111
VITE_RECEIVER_ADDRESS=<your-platform-wallet-address>
```

4. Run the development server:
```
npm run dev
```

## How to Use

1. Connect your Phantom wallet
2. Apply for a loan as a borrower or browse available loans as a lender
3. Fund loans that meet your criteria
4. Track repayments and loan status

## Smart Contract

The Solana smart contract handles:
- Creating loan accounts
- Funding loans
- Processing repayments
- Managing defaults
- Updating borrower credit scores

## License

[MIT](LICENSE)







