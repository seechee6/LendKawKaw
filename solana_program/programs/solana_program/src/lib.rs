use anchor_lang::prelude::*;
use solana_program::system_instruction;

declare_id!("DAyqZYocAeQd8ApqkoyYQuLG8dcYv3JDwehxbaxmwZ1n");

#[program]
pub mod microloan_transactions {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
            let user = &mut ctx.accounts.user;
            user.authority = ctx.accounts.authority.key();
            user.credit_score = 0;
        user.loans_taken = 0;
        user.loans_repaid = 0;
        Ok(())
    }

    pub fn create_loan(
        ctx: Context<CreateLoan>,
        amount: u64,
        interest_rate: u16,
        duration: u64,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let loan = &mut ctx.accounts.loan;
        let borrower = &ctx.accounts.borrower;

        loan.id = user.loans_taken;
        loan.borrower = borrower.key();
        loan.lender = Pubkey::default();
        loan.amount = amount;
        loan.interest_rate = interest_rate;
        loan.duration = duration;
        loan.start_date = 0;
        loan.total_repaid = 0;
        loan.is_active = false;
        loan.is_completed = false;

        user.loans_taken += 1;

        emit!(LoanCreatedEvent {
            loan_id: loan.id,
            borrower: borrower.key(),
            amount,
            interest_rate,
        });

        emit!(TransactionEvent {
            tx_type: "create".to_string(),
            user: borrower.key(),
            loan_id: loan.id,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn fund_loan(ctx: Context<FundLoan>, amount: u64) -> Result<()> {
        require!(
            amount == ctx.accounts.loan.amount,
            MicroLoanError::IncorrectAmount
        );

        let transfer_instruction = solana_program::system_instruction::transfer(
            ctx.accounts.lender.key,
            ctx.accounts.borrower.key,
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.lender.to_account_info(),
                ctx.accounts.borrower.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let loan = &mut ctx.accounts.loan;
        loan.lender = ctx.accounts.lender.key();
        loan.is_active = true;
        loan.start_date = ctx.accounts.clock.unix_timestamp as u64;

        emit!(LoanFundedEvent {
            loan_id: loan.id,
            lender: ctx.accounts.lender.key(),
            timestamp: ctx.accounts.clock.unix_timestamp,
        });

        emit!(TransactionEvent {
            tx_type: "fund".to_string(),
            user: ctx.accounts.lender.key(),
            loan_id: loan.id,
            amount,
            timestamp: ctx.accounts.clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn repay_loan(ctx: Context<RepayLoan>, amount: u64, is_platform_fee: bool) -> Result<()> {
        let loan = &mut ctx.accounts.loan;
        let borrower = &ctx.accounts.borrower;

        require!(loan.is_active, MicroLoanError::LoanNotActive);
        require!(!loan.is_completed, MicroLoanError::LoanAlreadyCompleted);

        let destination = if is_platform_fee {
            ctx.accounts.platform_account.to_account_info()
        } else {
            ctx.accounts.lender.to_account_info()
        };

        let transfer_instruction = system_instruction::transfer(
            &borrower.key(),
            &destination.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.borrower.to_account_info(),
                destination,
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        loan.total_repaid += amount;

        let interest_amount = (loan.amount as u128)
            .checked_mul(loan.interest_rate as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);

        let total_to_repay = (loan.amount as u128)
            .checked_add(interest_amount)
            .unwrap_or(0);

        if loan.total_repaid as u128 >= total_to_repay {
            loan.is_completed = true;
            loan.is_active = false;
            let user = &mut ctx.accounts.user;
            user.credit_score += 1;
            user.loans_repaid += 1;
        }

        emit!(RepaymentEvent {
            loan_id: loan.id,
            borrower: borrower.key(),
            amount,
            timestamp: ctx.accounts.clock.unix_timestamp,
            is_platform_fee,
        });

        emit!(TransactionEvent {
            tx_type: "repay".to_string(),
            user: borrower.key(),
            loan_id: loan.id,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 4,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateLoan<'info> {
    #[account(mut, seeds = [b"user", borrower.key().as_ref()], bump)]
    pub user: Account<'info, User>,
    #[account(
        init,
        payer = borrower,
        space = 116,
        seeds = [
            b"loan", 
            borrower.key().as_ref(), 
            &user.loans_taken.to_le_bytes()
        ],
        bump
    )]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundLoan<'info> {
    #[account(mut, signer)]
    pub lender: AccountInfo<'info>,
    #[account(mut)]
    pub borrower: AccountInfo<'info>,
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut)]
    pub lender: AccountInfo<'info>,
    #[account(mut)]
    pub platform_account: AccountInfo<'info>,
    #[account(mut)]
    pub user: Account<'info, User>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[account]
pub struct User {
    pub authority: Pubkey,
    pub credit_score: i64,
    pub loans_taken: u64,
    pub loans_repaid: u32,
}

#[account]
pub struct Loan {
    pub id: u64,
    pub borrower: Pubkey,
    pub lender: Pubkey,
    pub amount: u64,
    pub interest_rate: u16,
    pub duration: u64,
    pub start_date: u64,
    pub total_repaid: u64,
    pub is_active: bool,
    pub is_completed: bool,
}

#[event]
pub struct LoanCreatedEvent {
    pub loan_id: u64,
    pub borrower: Pubkey,
    pub amount: u64,
    pub interest_rate: u16,
}

#[event]
pub struct LoanFundedEvent {
    pub loan_id: u64,
    pub lender: Pubkey,
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

#[event]
pub struct TransactionEvent {
    pub tx_type: String,
    pub user: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub timestamp: i64,
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