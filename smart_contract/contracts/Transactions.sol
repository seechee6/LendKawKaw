//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Transactions {
    uint256 public transactionCount;
    
    // Events
    event Transfer(address from, address receiver, uint amount, string message, uint256 timestamp, string keyword);
    event LoanCreated(address borrower, uint loanId, uint amount, uint duration, uint interestRate);
    event LoanFunded(address lender, uint loanId, uint amount, uint timestamp);
    event RepaymentMade(address borrower, uint loanId, uint amount, uint timestamp);
    
    // Structs
    struct TransferStruct {
        address sender;
        address receiver;
        uint amount;
        string message;
        uint256 timestamp;
        string keyword;  
    }
    
    struct Loan {
        uint id;
        address borrower;
        address lender;
        uint amount;
        uint interestRate; // in basis points (e.g., 800 = 8%)
        uint duration; // in days
        uint startDate;
        uint totalRepaid;
        bool isActive;
        bool isCompleted;
    }
    
    struct LoanRepayment {
        uint loanId;
        uint amount;
        uint timestamp;
        bool isPlatformFee;
    }
    
    // State variables
    TransferStruct[] public transactions;
    Loan[] public loans;
    mapping(uint => LoanRepayment[]) public loanRepayments;
    mapping(address => uint[]) public borrowerLoans;
    mapping(address => uint[]) public lenderLoans;
    mapping(address => int) public creditScores; // can be positive or negative
    
    // Main transfer function
    function addToBlockchain(address payable receiver, uint amount, string memory message, string memory keyword) public {
        transactionCount += 1;
        transactions.push(TransferStruct(
            msg.sender,
            receiver,
            amount,
            message,
            block.timestamp,
            keyword
        ));
        
        emit Transfer(msg.sender, receiver, amount, message, block.timestamp, keyword);
    }
    
    // Create a new loan request
    function createLoan(uint amount, uint interestRate, uint durationDays) public returns (uint) {
        uint loanId = loans.length;
        
        Loan memory newLoan = Loan({
            id: loanId,
            borrower: msg.sender,
            lender: address(0), // will be set when funded
            amount: amount,
            interestRate: interestRate,
            duration: durationDays,
            startDate: 0, // will be set when funded
            totalRepaid: 0,
            isActive: false,
            isCompleted: false
        });
        
        loans.push(newLoan);
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanCreated(msg.sender, loanId, amount, durationDays, interestRate);
        
        return loanId;
    }
    
    // Fund a loan
    function fundLoan(uint loanId) public payable {
        require(loanId < loans.length, "Loan does not exist");
        Loan storage loan = loans[loanId];
        
        require(!loan.isActive, "Loan is already active");
        require(loan.borrower != msg.sender, "Cannot fund your own loan");
        require(msg.value == loan.amount, "Must send exact loan amount");
        
        loan.lender = msg.sender;
        loan.isActive = true;
        loan.startDate = block.timestamp;
        
        lenderLoans[msg.sender].push(loanId);
        
        // Transfer funds to borrower
        payable(loan.borrower).transfer(msg.value);
        
        emit LoanFunded(msg.sender, loanId, msg.value, block.timestamp);
    }
    
    // Make a loan repayment
    function repayLoan(uint loanId, bool isPlatformFee) public payable {
        require(loanId < loans.length, "Loan does not exist");
        Loan storage loan = loans[loanId];
        
        require(loan.isActive, "Loan is not active");
        require(!loan.isCompleted, "Loan is already completed");
        
        if (isPlatformFee) {
            // Platform fee goes to contract owner or designated platform wallet
            // In a production app, you'd have a platform wallet address
            address platformWallet = address(this); // Replace with your platform wallet
            payable(platformWallet).transfer(msg.value);
        } else {
            // Regular payment goes to lender
            payable(loan.lender).transfer(msg.value);
        }
        
        loan.totalRepaid += msg.value;
        
        // Record the repayment
        loanRepayments[loanId].push(LoanRepayment({
            loanId: loanId,
            amount: msg.value,
            timestamp: block.timestamp,
            isPlatformFee: isPlatformFee
        }));
        
        // Check if loan is fully repaid (implementation would be more complex in real app)
        if (loan.totalRepaid >= loan.amount + ((loan.amount * loan.interestRate) / 10000)) {
            loan.isCompleted = true;
            loan.isActive = false;
            
            // Improve borrower's credit score on successful repayment
            creditScores[loan.borrower] += 1;
        }
        
        emit RepaymentMade(msg.sender, loanId, msg.value, block.timestamp);
    }
    
    // Get all transactions
    function getAllTransactions() public view returns (TransferStruct[] memory) {
        return transactions;
    }
    
    // Get transaction count
    function getTransactionCount() public view returns (uint256) {
        return transactionCount;
    }
    
    // Get loans by borrower
    function getLoansByBorrower(address borrower) public view returns (uint[] memory) {
        return borrowerLoans[borrower];
    }
    
    // Get loans by lender
    function getLoansByLender(address lender) public view returns (uint[] memory) {
        return lenderLoans[lender];
    }
    
    // Get loan details
    function getLoan(uint loanId) public view returns (Loan memory) {
        require(loanId < loans.length, "Loan does not exist");
        return loans[loanId];
    }
    
    // Get repayments for a loan
    function getLoanRepayments(uint loanId) public view returns (LoanRepayment[] memory) {
        return loanRepayments[loanId];
    }
    
    // Get user credit score
    function getCreditScore(address user) public view returns (int) {
        return creditScores[user];
    }
    
    // Handle borrower default (in a real app, this would be triggered by time-based checks)
    function handleLoanDefault(uint loanId) public {
        require(loanId < loans.length, "Loan does not exist");
        Loan storage loan = loans[loanId];
        
        // In a real app, check if enough time has passed since last payment
        // For now, we'll just allow manual triggering (would be admin-only in production)
        
        loan.isActive = false;
        
        // Decrease borrower's credit score
        creditScores[loan.borrower] -= 2;
        
        // Additional logic would handle deposit refund to lender, etc.
    }
}