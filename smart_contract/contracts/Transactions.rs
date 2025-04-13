use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod transactions {
    use super::*;

    // Initialize transaction storage
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let transactions = &mut ctx.accounts.transactions;
        transactions.count = 0;
        Ok(())
    }

    // Add transaction to storage
    pub fn add_transaction(
        ctx: Context<AddTransaction>,
        amount: u64,
        message: String,
        keyword: String,
    ) -> Result<()> {
        let transactions = &mut ctx.accounts.transactions;
        
        transactions.transactions.push(TransferStruct {
            sender: ctx.accounts.sender.key(),
            receiver: ctx.accounts.receiver.key(),
            amount,
            message: message.clone(),
            timestamp: Clock::get()?.unix_timestamp,
            keyword: keyword.clone(),
        });
        
        transactions.count += 1;
        Ok(())
    }

    // Get transaction count (read via account data)
}

// Data Structures
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct TransferStruct {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub message: String,
    pub timestamp: i64,
    pub keyword: String,
}

#[account]
#[derive(Default)]
pub struct TransactionStorage {
    pub count: u64,
    pub transactions: Vec<TransferStruct>,
}

// Contexts
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 9000)]
    pub transactions: Account<'info, TransactionStorage>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddTransaction<'info> {
    #[account(mut)]
    pub transactions: Account<'info, TransactionStorage>,
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: Receiver account (not modified)
    pub receiver: AccountInfo<'info>,
}