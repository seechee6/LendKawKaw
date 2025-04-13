import React, { useEffect, useState } from "react";
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  SystemProgram, 
  Transaction, 
  PublicKey,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

export const TransactionContext = React.createContext();

// Get environment variables for loan funding using Vite's import.meta.env
const RECEIVER_ADDRESS = import.meta.env.VITE_RECEIVER_ADDRESS;

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
  
  const { connection } = useConnection();
  const { publicKey, sendTransaction: solanaSendTransaction } = useWallet();
  
  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  // Initialize transaction storage - simplified version without Anchor
  const initializeTransactionStorage = async () => {
    try {
      if (!publicKey) throw new WalletNotConnectedError();
      
      setIsLoading(true);
      
      // Instead of creating an actual storage account on-chain,
      // we'll just use localStorage to track transactions for simplicity
      localStorage.setItem('transactionStorageInitialized', 'true');
      localStorage.setItem('transactions', JSON.stringify([]));
      
      setIsLoading(false);
      console.log("Transaction storage initialized in local storage");
      
      return 'local-storage';
    } catch (error) {
      console.error("Error initializing transaction storage:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Add a transaction - simplified version without Anchor
  const addTransaction = async (receiverAddress, amount, message, keyword) => {
    try {
      if (!publicKey) throw new WalletNotConnectedError();
      
      setIsLoading(true);
      
      // Check if storage is initialized
      const storageInitialized = localStorage.getItem('transactionStorageInitialized');
      if (!storageInitialized) {
        await initializeTransactionStorage();
      }
      
      const receiverPubkey = new PublicKey(receiverAddress);
      
      // Convert amount from SOL to lamports (Solana's smallest unit)
      const lamports = amount * LAMPORTS_PER_SOL;
      
      // Create and send the SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: receiverPubkey,
          lamports,
        })
      );
      
      const signature = await solanaSendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Store transaction in local storage
      const timestamp = Date.now() / 1000; // Unix timestamp in seconds
      const newTransaction = {
        sender: publicKey.toString(),
        receiver: receiverPubkey.toString(),
        amount: lamports,
        message,
        keyword,
        timestamp,
        signature
      };
      
      // Get existing transactions
      const existingTransactionsStr = localStorage.getItem('transactions') || '[]';
      const existingTransactions = JSON.parse(existingTransactionsStr);
      
      // Add new transaction
      existingTransactions.push(newTransaction);
      localStorage.setItem('transactions', JSON.stringify(existingTransactions));
      
      console.log("Transaction added and SOL transferred:", signature);
      
      setIsLoading(false);
      
      // Increase transaction count
      const newCount = (parseInt(transactionCount || "0") + 1).toString();
      setTransactionCount(newCount);
      localStorage.setItem("transactionCount", newCount);
      
      // Refresh transactions list
      await getAllTransactions();
      
      return signature;
    } catch (error) {
      console.error("Error adding transaction:", error);
      setIsLoading(false);
      throw error;
    }
  };

  // Get all transactions - simplified version without Anchor
  const getAllTransactions = async () => {
    try {
      // Check if storage is initialized
      const storageInitialized = localStorage.getItem('transactionStorageInitialized');
      if (!storageInitialized) {
        console.log("No transaction storage initialized yet");
        setTransactions([]);
        return;
      }
      
      // Get transactions from local storage
      const transactionsStr = localStorage.getItem('transactions') || '[]';
      const transactionsData = JSON.parse(transactionsStr);
      
      if (!transactionsData || transactionsData.length === 0) {
        console.log("No transactions found");
        setTransactions([]);
        return;
      }
      
      // Format transactions
      const structuredTransactions = transactionsData.map((tx) => ({
        addressTo: tx.receiver,
        addressFrom: tx.sender,
        timestamp: new Date(tx.timestamp * 1000).toLocaleString(),
        message: tx.message,
        keyword: tx.keyword,
        amount: (tx.amount / LAMPORTS_PER_SOL).toString(),
        signature: tx.signature
      }));
      
      console.log("Structured transactions:", structuredTransactions);
      setTransactions(structuredTransactions);
    } catch (error) {
      console.error("Error getting transactions:", error);
      setTransactions([]);
    }
  };

  // Use the addTransaction function for the main sendTransaction functionality
  const sendTransaction = async () => {
    try {
      if (!publicKey) throw new WalletNotConnectedError();
      
      const { addressTo, amount, keyword, message } = formData;
      if (!addressTo || !amount || !keyword || !message) {
        alert("Please fill all fields");
        return;
      }
      
      return await addTransaction(addressTo, parseFloat(amount), message, keyword);
    } catch (error) {
      console.error("Send transaction error:", error);
      throw error;
    }
  };

  const fundLoan = async () => {
    try {
      if (!publicKey) throw new WalletNotConnectedError();
      
      setIsLoading(true);
      
      // Get receiver address
      const receiverPublicKey = new PublicKey(RECEIVER_ADDRESS);
      
      // Set default loan amount
      const lamports = 1_500_000; // Adjust as needed
      
      // Create a transaction to transfer SOL
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: receiverPublicKey,
          lamports,
        })
      );
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      const signature = await solanaSendTransaction(transaction, connection);
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });
      
      console.log("Loan funded successfully:", signature);
      setIsLoading(false);
      
      return signature;
    } catch (error) {
      console.error("Loan funding error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  useEffect(() => {
    if (publicKey) {
      setCurrentAccount(publicKey.toString());
      getAllTransactions();
    }
  }, [publicKey]);

  return (
    <TransactionContext.Provider
      value={{
        connectWallet: () => {}, // This is handled by the wallet adapter
        currentAccount,
        formData,
        setformData,
        handleChange,
        sendTransaction,
        fundLoan,
        transactions,
        isLoading,
        initializeTransactionStorage,
        getAllTransactions
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
