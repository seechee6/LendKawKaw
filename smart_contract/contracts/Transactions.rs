use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::convert::TryFrom;

declare_id!("Transactions11111111111111111111111111111111");

#[program]
pub mod microloan_transactions {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let program_data = &mut ctx.accounts.program_data;
        program_data.authority = ctx.accounts.authority.key();
        program_data.transaction_count = 0;
        Ok(())
    }

    pub fn create_loan(
        ctx: Context<CreateLoan>,
        amount: u64,
        interest_rate: u16,
        duration: u64,
        description: String,
    ) -> Result<()> {
        let program_data = &mut ctx.accounts.program_data;
        let loan = &mut ctx.accounts.loan;
        let borrower = &ctx.accounts.borrower;
        
        loan.id = program_data.transaction_count;
        loan.borrower = borrower.key();
        loan.lender = Pubkey::default();
        loan.amount = amount;
        loan.interest_rate = interest_rate;
        loan.duration = duration;
        loan.description = description;
        loan.start_date = 0;
        loan.total_repaid = 0;
        loan.is_active = false;
        loan.is_completed = false;
        
        program_data.transaction_count += 1;
        
        emit!(LoanCreatedEvent {
            loan_id: loan.id,
            borrower: borrower.key(),
            amount,
            interest_rate,
            duration,
        });
        
        Ok(())
    }

    pub fn fund_loan(ctx: Context<FundLoan>, amount: u64) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let lender = &ctx.accounts.lender;
        
        require!(!loan.is_active, MicroLoanError::LoanAlreadyActive);
        require!(loan.borrower != lender.key(), MicroLoanError::CannotFundOwnLoan);
        require!(amount == loan.amount, MicroLoanError::IncorrectAmount);
        
        loan.lender = lender.key();
        loan.is_active = true;
        loan.start_date = Clock::get()?.unix_timestamp as u64;
        
        // Transfer SOL from lender to borrower
        let cpi_accounts = Transfer {
            from: ctx.accounts.lender_token_account.to_account_info(),
            to: ctx.accounts.borrower_token_account.to_account_info(),
            authority: ctx.accounts.lender.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;
        
        emit!(LoanFundedEvent {
            loan_id: loan.id,
            lender: lender.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn repay_loan(ctx: Context<RepayLoan>, amount: u64, is_platform_fee: bool) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let borrower = &ctx.accounts.borrower;
        
        require!(loan.is_active, MicroLoanError::LoanNotActive);
        require!(!loan.is_completed, MicroLoanError::LoanAlreadyCompleted);
        
        // Transfer SOL from borrower to either lender or platform
        let destination = if is_platform_fee {
            ctx.accounts.platform_account.to_account_info()
        } else {
            ctx.accounts.lender_token_account.to_account_info()
        };
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.borrower_token_account.to_account_info(),
            to: destination,
            authority: ctx.accounts.borrower.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;
        
        loan.total_repaid += amount;
        
        // Check if loan is fully repaid
        let interest_amount = (loan.amount as u128)
            .checked_mul(loan.interest_rate as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);
            
        let total_to_repay = (loan.amount as u128).checked_add(interest_amount).unwrap_or(0);
        
        if loan.total_repaid >= u64::try_from(total_to_repay).unwrap_or(u64::MAX) {
            loan.is_completed = true;
            loan.is_active = false;
            
            // Update credit score (in a real app, this would be more complex)
            let borrower_stats = &mut ctx.accounts.borrower_stats;
            borrower_stats.credit_score += 1;
        }
        
        emit!(RepaymentEvent {
            loan_id: loan.id,
            borrower: borrower.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
            is_platform_fee,
        });
        
        Ok(())
    }

    pub fn handle_default(ctx: Context<HandleDefault>) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        
        require!(loan.is_active, MicroLoanError::LoanNotActive);
        
        // In a real app, check if enough time has passed since last payment
        loan.is_active = false;
        
        // Update credit score (in a real app, this would be more complex)
        let borrower_stats = &mut ctx.accounts.borrower_stats;
        borrower_stats.credit_score -= 2;
        
        // Additional logic would handle deposit refund to lender, etc.
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 // discriminator + pubkey + u64
    )]
    pub program_data: Account<'info, ProgramData>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateLoan<'info> {
    #[account(mut)]
    pub program_data: Account<'info, ProgramData>,
    #[account(
        init,
        payer = borrower,
        space = 8 + 32 + 32 + 8 + 2 + 8 + 200 + 8 + 8 + 1 + 1 // discriminator + pubkeys*2 + u64*4 + string + bool*2
    )]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(
        mut,
        constraint = lender_token_account.owner == lender.key()
    )]
    pub lender_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = borrower_token_account.owner == loan.borrower
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        mut,
        constraint = borrower_token_account.owner == borrower.key(),
        constraint = borrower.key() == loan.borrower
    )]
    pub borrower_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = lender_token_account.owner == loan.lender
    )]
    pub lender_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [borrower.key().as_ref()],
        bump
    )]
    pub borrower_stats: Account<'info, BorrowerStats>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HandleDefault<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        seeds = [loan.borrower.as_ref()],
        bump
    )]
    pub borrower_stats: Account<'info, BorrowerStats>,
    pub authority: Signer<'info>,
}

#[account]
pub struct ProgramData {
    pub authority: Pubkey,
    pub transaction_count: u64,
}

#[account]
pub struct Loan {
    pub id: u64,
    pub borrower: Pubkey,
    pub lender: Pubkey,
    pub amount: u64,
    pub interest_rate: u16, // basis points
    pub duration: u64, // in seconds
    pub description: String,
    pub start_date: u64,
    pub total_repaid: u64,
    pub is_active: bool,
    pub is_completed: bool,
}

#[account]
pub struct BorrowerStats {
    pub borrower: Pubkey,
    pub credit_score: i64,
    pub loans_taken: u32,
    pub loans_repaid: u32,
}

#[event]
pub struct LoanCreatedEvent {
    pub loan_id: u64,
    pub borrower: Pubkey,
    pub amount: u64,
    pub interest_rate: u16,
    pub duration: u64,
}

#[event]
pub struct LoanFundedEvent {
    pub loan_id: u64,
    pub lender: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RepaymentEvent {
    pub loan_id: u64,
    pub borrower: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub is_platform_fee: bool,
}

#[error_code]
pub enum MicroLoanError {
    #[msg("Loan is already active")]
    LoanAlreadyActive,
    #[msg("Cannot fund your own loan")]
    CannotFundOwnLoan,
    #[msg("Incorrect amount")]
    IncorrectAmount,
    #[msg("Loan is not active")]
    LoanNotActive,
    #[msg("Loan is already completed")]
    LoanAlreadyCompleted,
}
