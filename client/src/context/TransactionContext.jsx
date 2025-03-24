import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

// Get environment variables for loan funding using Vite's import.meta.env
const SENDER_ADDRESS = import.meta.env.VITE_SENDER_ADDRESS;
const RECEIVER_ADDRESS = import.meta.env.VITE_RECEIVER_ADDRESS;
const LOAN_AMOUNT = import.meta.env.VITE_LOAN_AMOUNT;

const createEthereumContract = async () => {
  try {
    if (!ethereum) return alert("Please install MetaMask!");

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const transactionsContract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer,
    );

    return transactionsContract;
  } catch (error) {
    console.log("Error creating contract:", error);
    return null;
  }
};

export const TransactionsProvider = ({ children }) => {
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [currentAccount, setCurrentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount"),
  );
  const [transactions, setTransactions] = useState([]);

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask!");

      const contract = await createEthereumContract();
      if (!contract) return;

      console.log("Fetching transactions from contract...");
      if (typeof contract.getAllTransactions !== "function") {
        console.error(
          "getAllTransactions method doesn't exist on the contract",
        );
        return;
      }

      const availableTransactions = await contract.getAllTransactions();
      console.log("Contract:", contract);
      console.log("Raw transactions:", availableTransactions);

      if (!availableTransactions || availableTransactions.length === 0) {
        console.log("No transactions returned");
        setTransactions([]);
        return;
      }
      const txArray = Array.from(availableTransactions);

      const structuredTransactions = txArray.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(
          Number(transaction.timestamp) * 1000,
        ).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: ethers.formatEther(transaction.amount),
      }));

      console.log("Structured transactions:", structuredTransactions);
      setTransactions(structuredTransactions);
    } catch (error) {
      console.error("Error getting transactions:", error?.message || error);
      setTransactions([]);
    }
  };

  const checkIfWalletIsConnect = async () => {
    try {
      if (!ethereum) {
        console.log("No MetaMask detected");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_accounts" });
      console.log("Connected accounts:", accounts);

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        console.log("Fetching transactions...");
        await getAllTransactions();
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask!");

      const contract = await createEthereumContract();
      if (!contract) return;

      console.log("Available contract methods:", Object.keys(contract));

      const count = await contract.getAllTransactionCount();

      if (count) {
        window.localStorage.setItem("transactionCount", count.toString());
        setTransactionCount(count.toString());
      }
    } catch (error) {
      console.log("Error checking transactions:", error?.message || error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask.");

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
      window.location.reload();
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask.");

      const { addressTo, amount, keyword, message } = formData;
      const transactionsContract = await createEthereumContract();
      if (!transactionsContract) return;
      const parsedAmount = ethers.parseEther(amount);
      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: parsedAmount.toString(),
          },
        ],
      });
      const transactionHash = await transactionsContract.addToBlockchain(
        addressTo,
        parsedAmount,
        message,
        keyword,
      );

      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);
      const transactionsCount =
        await transactionsContract.getAllTransactionCount();
      setTransactionCount(transactionsCount.toString());
    } catch (error) {
      console.error("Transaction error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const fundLoan = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask.");

      setIsLoading(true);
      
      // Use hardcoded addresses from environment variables
      const addressTo = RECEIVER_ADDRESS;
      const addressFrom = currentAccount; // Use connected wallet instead of SENDER_ADDRESS
      const amount = LOAN_AMOUNT;
      
      const transactionsContract = await createEthereumContract();
      if (!transactionsContract) {
        setIsLoading(false);
        return;
      }
      
      const parsedAmount = ethers.parseEther(amount);
      
      // Make the transaction request
      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: addressFrom,
            to: addressTo,
            gas: "0x5208", // 21000 GWEI
            value: parsedAmount.toString(),
          },
        ],
      });
      
      // Add transaction to blockchain through smart contract
      const transactionHash = await transactionsContract.addToBlockchain(
        addressTo,
        parsedAmount,
        "Loan Funding", // message
        "loan", // keyword
      );

      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      
      setIsLoading(false);
      
      // Update transaction count
      const transactionsCount = await transactionsContract.getAllTransactionCount();
      setTransactionCount(transactionsCount.toString());
      
      return transactionHash;
    } catch (error) {
      console.error("Loan funding error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkIfWalletIsConnect();
      await checkIfTransactionsExists();
    };
    init();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getAllTransactions();
    }
  }, [currentAccount, transactionCount]);

  useEffect(() => {
    console.log("Transactions updated:", transactions);
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        connectWallet,
        transactions,
        currentAccount,
        isLoading,
        sendTransaction,
        handleChange,
        formData,
        fundLoan,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
