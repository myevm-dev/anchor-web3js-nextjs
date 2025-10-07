use anchor_lang::prelude::*;
use anchor_lang::prelude::pubkey;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};
use solana_program::{program::invoke, system_instruction};

declare_id!("PASTE_YOUR_PROGRAM_ID_HERE"); // set same id in Anchor.toml

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TERM_SECS: i64 = 15_724_800; // 6 months (182 days)
const CREATION_FEE_LAMPORTS: u64 = 100_000_000; // 0.1 SOL
const FEE_BPS: u64 = 300; // 3%
const RPT_SCALE: u128 = 1_000_000_000_000; // 1e12 (acc_reward_per_token precision)
const RATE_SCALE: u128 = 1_000_000_000_000; // 1e12 (fractional tokens/sec)

// Hardcode your dev treasury (SOL receiver). Token fee (3%) goes to its ATA.
pub const DEV_TREASURY: Pubkey = pubkey!("PpokPuQ4zhMkTc8B376acPzAXiVZTaakWjqMaWKfJ9P");

// ─────────────────────────────────────────────────────────────────────────────
// Program
// ─────────────────────────────────────────────────────────────────────────────
#[program]
pub mod pump_vaults {
    use super::*;

    pub fn create_vault(
        ctx: Context<CreateVault>,
        reward_net: u64,
        maybe_start_time: Option<i64>,
    ) -> Result<()> {
        require!(reward_net > 0, VaultError::ZeroAmount);

        // 1) Transfer 0.1 SOL fee to dev treasury
        let dev_treasury = ctx.accounts.dev_treasury.to_account_info();
        let admin = ctx.accounts.admin.to_account_info();
        invoke(
            &system_instruction::transfer(&admin.key(), &dev_treasury.key(), CREATION_FEE_LAMPORTS),
            &[admin.clone(), dev_treasury.clone(), ctx.accounts.system_program.to_account_info()],
        )?;

        // 2) Init vault config (immutable parameters)
        let vault = &mut ctx.accounts.vault;
        let now = Clock::get()?.unix_timestamp;
        let start = maybe_start_time.unwrap_or(now + 300); // default: starts in 5 minutes
        let end = start + TERM_SECS;

        // 3) Compute token fee (3% of reward_net) and total required from admin
        let fee_tokens = reward_net.saturating_mul(FEE_BPS) / 10_000;
        let reward_gross = reward_net.checked_add(fee_tokens).ok_or(VaultError::MathOverflow)?;

        // 4) Pull reward_gross from admin -> reward vault ATA
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.admin_token_ata.to_account_info(),
                    to: ctx.accounts.reward_vault_ata.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            reward_gross,
        )?;

        // 5) Skim 3% to dev (reward vault -> dev ATA)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault_ata.to_account_info(),
                    to: ctx.accounts.dev_token_ata.to_account_info(),
                    authority: ctx.accounts.vault_reward_authority.to_account_info(),
                },
                &[&[
                    b"vault_reward",
                    ctx.accounts.vault.key().as_ref(),
                    &[ctx.accounts.vault.vault_reward_bump],
                ]],
            ),
            fee_tokens,
        )?;

        // 6) Finalize vault fields
        vault.admin = ctx.accounts.admin.key();
        vault.mint = ctx.accounts.mint.key();
        vault.start_time = start;
        vault.end_time = end;
        vault.reward_net = reward_net;
        vault.reward_fee = fee_tokens;
        vault.reward_gross = reward_gross;

        vault.rate_fp = (reward_net as u128)
            .checked_mul(RATE_SCALE)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(TERM_SECS as u128)
            .ok_or(VaultError::MathOverflow)?;
        vault.emission_acc_fp = 0;
        vault.emitted = 0;

        vault.last_update_time = start;
        vault.acc_reward_per_token = 0;
        vault.unallocated = 0;
        vault.total_staked = 0;

        vault.bump = *ctx.bumps.get("vault").unwrap();
        vault.vault_escrow_bump = *ctx.bumps.get("vault_escrow_authority").unwrap();
        vault.vault_reward_bump = *ctx.bumps.get("vault_reward_authority").unwrap();
        vault.version = 1;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        update_rewards(vault)?;

        // user -> escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_ata.to_account_info(),
                    to: ctx.accounts.vault_escrow_ata.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // user stake state
        let user_stake = &mut ctx.accounts.user_stake;
        if user_stake.initialized == 0 {
            user_stake.owner = ctx.accounts.user.key();
            user_stake.vault = ctx.accounts.vault.key();
            user_stake.amount = 0;
            user_stake.reward_debt = 0;
            user_stake.initialized = 1;
        }

        vault.total_staked = vault.total_staked.checked_add(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.amount = user_stake.amount.checked_add(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.reward_debt = reward_debt(user_stake.amount, vault.acc_reward_per_token);

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        update_rewards(vault)?;
        payout_pending(
            vault,
            &ctx.accounts.user_stake,
            &ctx.accounts.reward_vault_ata,
            &ctx.accounts.user_token_ata,
            &ctx.accounts.token_program,
            &ctx.accounts.vault_reward_authority,
        )?;
        // refresh debt after paying
        let user = &mut ctx.accounts.user_stake;
        user.reward_debt = reward_debt(user.amount, vault.acc_reward_per_token);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, claim_all: bool) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        update_rewards(vault)?;

        // optional claim first
        if claim_all {
            payout_pending(
                vault,
                &ctx.accounts.user_stake,
                &ctx.accounts.reward_vault_ata,
                &ctx.accounts.user_token_ata,
                &ctx.accounts.token_program,
                &ctx.accounts.vault_reward_authority,
            )?;
        }

        // escrow -> user
        let user_stake = &mut ctx.accounts.user_stake;
        require!(user_stake.amount >= amount, VaultError::InsufficientStake);

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_escrow_ata.to_account_info(),
                    to: ctx.accounts.user_token_ata.to_account_info(),
                    authority: ctx.accounts.vault_escrow_authority.to_account_info(),
                },
                &[&[
                    b"vault_escrow",
                    ctx.accounts.vault.key().as_ref(),
                    &[ctx.accounts.vault.vault_escrow_bump],
                ]],
            ),
            amount,
        )?;

        user_stake.amount = user_stake.amount.checked_sub(amount).ok_or(VaultError::MathOverflow)?;
        vault.total_staked = vault.total_staked.checked_sub(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.reward_debt = reward_debt(user_stake.amount, vault.acc_reward_per_token);

        Ok(())
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let now = Clock::get()?.unix_timestamp;
        require!(now >= vault.end_time, VaultError::NotEnded);
        require!(vault.total_staked == 0, VaultError::StillStaked);

        // Sweep remaining reward dust to admin
        let bal = ctx.accounts.reward_vault_ata.amount;
        if bal > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.reward_vault_ata.to_account_info(),
                        to: ctx.accounts.admin_token_ata.to_account_info(),
                        authority: ctx.accounts.vault_reward_authority.to_account_info(),
                    },
                    &[&[
                        b"vault_reward",
                        ctx.accounts.vault.key().as_ref(),
                        &[ctx.accounts.vault.vault_reward_bump],
                    ]],
                ),
                bal,
            )?;
        }

        // Close reward ATA
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                CloseAccount {
                    account: ctx.accounts.reward_vault_ata.to_account_info(),
                    destination: ctx.accounts.admin.to_account_info(),
                    authority: ctx.accounts.vault_reward_authority.to_account_info(),
                },
                &[&[
                    b"vault_reward",
                    ctx.accounts.vault.key().as_ref(),
                    &[ctx.accounts.vault.vault_reward_bump],
                ]],
            ),
        )?;

        // Close escrow ATA (must be empty)
        require!(ctx.accounts.vault_escrow_ata.amount == 0, VaultError::EscrowNotEmpty);
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                CloseAccount {
                    account: ctx.accounts.vault_escrow_ata.to_account_info(),
                    destination: ctx.accounts.admin.to_account_info(),
                    authority: ctx.accounts.vault_escrow_authority.to_account_info(),
                },
                &[&[
                    b"vault_escrow",
                    ctx.accounts.vault.key().as_ref(),
                    &[ctx.accounts.vault.vault_escrow_bump],
                ]],
            ),
        )?;

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
fn update_rewards(v: &mut Account<Vault>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let capped_now = now.min(v.end_time);
    if capped_now <= v.last_update_time {
        return Ok(());
    }

    let dt = (capped_now - v.last_update_time) as u128;

    // accumulate fractional emission
    let add_fp = v.rate_fp.checked_mul(dt).ok_or(VaultError::MathOverflow)?;
    v.emission_acc_fp = v.emission_acc_fp.checked_add(add_fp).ok_or(VaultError::MathOverflow)?;

    // convert to integer tokens and keep remainder
    let mut to_emit = (v.emission_acc_fp / RATE_SCALE) as u64;
    v.emission_acc_fp %= RATE_SCALE;

    // clamp by remaining rewards
    let remaining = v.reward_net.saturating_sub(v.emitted);
    if to_emit > remaining {
        to_emit = remaining;
    }

    if to_emit > 0 {
        if v.total_staked == 0 {
            v.unallocated = v.unallocated.saturating_add(to_emit);
        } else {
            let total = (v.unallocated as u128)
                .checked_add(to_emit as u128)
                .ok_or(VaultError::MathOverflow)?;
            let incr = total
                .checked_mul(RPT_SCALE)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(v.total_staked as u128)
                .ok_or(VaultError::MathOverflow)?;
            v.acc_reward_per_token = v.acc_reward_per_token.checked_add(incr).ok_or(VaultError::MathOverflow)?;
            v.unallocated = 0;
        }
        v.emitted = v.emitted.saturating_add(to_emit);
    }

    v.last_update_time = capped_now;
    Ok(())
}

fn pending_rewards(user_amount: u64, reward_debt: u128, acc_rpt: u128) -> u64 {
    if user_amount == 0 {
        return 0;
    }
    let accrued = (user_amount as u128)
        .saturating_mul(acc_rpt)
        .checked_div(RPT_SCALE)
        .unwrap_or(0);
    let diff = accrued.saturating_sub(reward_debt);
    diff.min(u128::from(u64::MAX)) as u64
}

fn reward_debt(amount: u64, acc_rpt: u128) -> u128 {
    (amount as u128)
        .saturating_mul(acc_rpt)
        .checked_div(RPT_SCALE)
        .unwrap_or(0)
}

#[allow(clippy::too_many_arguments)]
fn payout_pending(
    v: &mut Account<Vault>,
    user: &Account<UserStake>,
    reward_vault_ata: &Account<TokenAccount>,
    user_token_ata: &Account<TokenAccount>,
    token_program: &Program<Token>,
    vault_reward_authority: &UncheckedAccount,
) -> Result<()> {
    let pend = pending_rewards(user.amount, user.reward_debt, v.acc_reward_per_token);
    if pend == 0 {
        return Ok(());
    }
    let to_pay = pend.min(reward_vault_ata.amount);
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: reward_vault_ata.to_account_info(),
                to: user_token_ata.to_account_info(),
                authority: vault_reward_authority.to_account_info(),
            },
            &[&[b"vault_reward", v.key().as_ref(), &[v.vault_reward_bump]]],
        ),
        to_pay,
    )?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    // Fixed dev treasury (SOL receiver)
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: SystemAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + Vault::SPACE,
        seeds = [b"vault", mint.key().as_ref(), admin.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: PDA that owns the escrow ATA
    #[account(
        seeds = [b"vault_escrow", vault.key().as_ref()],
        bump
    )]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    /// CHECK: PDA that owns the reward ATA
    #[account(
        seeds = [b"vault_reward", vault.key().as_ref()],
        bump
    )]
    pub vault_reward_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = vault_escrow_authority
    )]
    pub vault_escrow_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = vault_reward_authority
    )]
    pub reward_vault_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = admin
    )]
    pub admin_token_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = dev_treasury
    )]
    pub dev_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    /// CHECK: signer PDA for the escrow ATA
    #[account(
        seeds = [b"vault_escrow", vault.key().as_ref()],
        bump = vault.vault_escrow_bump
    )]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_escrow_authority
    )]
    pub vault_escrow_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserStake::SPACE,
        seeds = [b"user", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = user
    )]
    pub user_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, has_one = mint)]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"user", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,

    /// CHECK: PDA signer for reward ATA
    #[account(
        seeds = [b"vault_reward", vault.key().as_ref()],
        bump = vault.vault_reward_bump
    )]
    pub vault_reward_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_reward_authority
    )]
    pub reward_vault_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = vault.mint,
        associated_token::authority = user
    )]
    pub user_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, has_one = mint)]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"user", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,

    /// CHECK: PDA signer for escrow ATA
    #[account(
        seeds = [b"vault_escrow", vault.key().as_ref()],
        bump = vault.vault_escrow_bump
    )]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_escrow_authority
    )]
    pub vault_escrow_ata: Account<'info, TokenAccount>,

    /// CHECK: PDA signer for reward ATA (claim_all uses it)
    #[account(
        seeds = [b"vault_reward", vault.key().as_ref()],
        bump = vault.vault_reward_bump
    )]
    pub vault_reward_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_reward_authority
    )]
    pub reward_vault_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = vault.mint,
        associated_token::authority = user
    )]
    pub user_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, has_one = admin, has_one = mint, close = admin)]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    /// CHECK: PDA signer for reward ATA
    #[account(
        seeds = [b"vault_reward", vault.key().as_ref()],
        bump = vault.vault_reward_bump
    )]
    pub vault_reward_authority: UncheckedAccount<'info>,

    /// CHECK: PDA signer for escrow ATA
    #[account(
        seeds = [b"vault_escrow", vault.key().as_ref()],
        bump = vault.vault_escrow_bump
    )]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_reward_authority
    )]
    pub reward_vault_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_escrow_authority
    )]
    pub vault_escrow_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = vault.mint,
        associated_token::authority = admin
    )]
    pub admin_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
#[account]
pub struct Vault {
    // immutable params
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub reward_net: u64,
    pub reward_fee: u64,
    pub reward_gross: u64,

    // emission engine
    pub rate_fp: u128,
    pub emission_acc_fp: u128,
    pub emitted: u64,

    // global accounting
    pub last_update_time: i64,
    pub acc_reward_per_token: u128,
    pub unallocated: u64,
    pub total_staked: u64,

    // bumps & version
    pub bump: u8,
    pub vault_escrow_bump: u8,
    pub vault_reward_bump: u8,
    pub version: u8,
}
impl Vault {
    pub const SPACE: usize = 256;
}

#[account]
pub struct UserStake {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub reward_debt: u128,
    pub initialized: u8,
}
impl UserStake {
    pub const SPACE: usize = 128;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────
#[error_code]
pub enum VaultError {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Amount must be > 0")]
    ZeroAmount,
    #[msg("Vault term not finished")]
    NotEnded,
    #[msg("There is still stake in the vault")]
    StillStaked,
    #[msg("Escrow token account is not empty")]
    EscrowNotEmpty,
    #[msg("Insufficient staked amount")]
    InsufficientStake,
}
