use anchor_lang::prelude::*;
use solana_program::pubkey;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::token::accessor;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};

declare_id!("DzDtMwhFDexPAkwRRZVYf9YjArbokm2V8aRghWZMYa8S");

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TERM_SECS: i64 = 15_724_800; // 6 months (182 days)
const CREATION_FEE_LAMPORTS: u64 = 100_000_000; // 0.1 SOL
const FEE_BPS: u64 = 300; // 3%
const RPT_SCALE: u128 = 1_000_000_000_000; // 1e12 (acc_reward_per_token precision)
const RATE_SCALE: u128 = 1_000_000_000_000; // 1e12 (fractional tokens/sec)
const THREE_YEARS_SECS: i64 = 31_536_000 * 3; // 3 years in seconds
pub const DEV_TREASURY: Pubkey = pubkey!("6Vf19AT2sKunpBS7kvPA1Tqw9QZE9UGso3Pc1jg2nYj5");

// ─────────────────────────────────────────────────────────────────────────────
// Program
// ─────────────────────────────────────────────────────────────────────────────
#[program]
pub mod driplet_vaults {
    use super::*;

    pub fn disable_new_vaults(ctx: Context<DisableNewVaults>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        require!(
            ctx.accounts.dev_treasury.key() == state.admin,
            VaultError::Unauthorized
        );
        state.new_vaults_disabled = true;
        Ok(())
    }

    pub fn init_global_state(ctx: Context<InitGlobalState>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        state.new_vaults_disabled = false;
        state.admin = ctx.accounts.dev_treasury.key();
        Ok(())
    }

    pub fn create_vault(
        ctx: Context<CreateVault>,
        reward_net: u64,
        maybe_start_time: Option<i64>,
        vault_id: u64,                    // NEW
    ) -> Result<()> {
        // Enforce no new vaults if disabled
        require!(
            !ctx.accounts.global_state.new_vaults_disabled,
            VaultError::VaultCreationDisabled
        );
        require!(reward_net > 0, VaultError::ZeroAmount);

        // 0) Creation fee (SOL) -> dev treasury
        let dev_treasury = ctx.accounts.dev_treasury.to_account_info();
        let creator = ctx.accounts.creator.to_account_info();
        invoke(
            &system_instruction::transfer(&creator.key(), &dev_treasury.key(), CREATION_FEE_LAMPORTS),
            &[
                creator.clone(),
                dev_treasury.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 1) Times
        let now = Clock::get()?.unix_timestamp;
        let start = maybe_start_time.unwrap_or(now + 300);
        let end = start + TERM_SECS;

        // 2) Fees & totals
        let fee_tokens = reward_net.saturating_mul(FEE_BPS) / 10_000;
        let reward_gross = reward_net
            .checked_add(fee_tokens)
            .ok_or(VaultError::MathOverflow)?;

        // 3) Cache keys/bumps BEFORE mutable borrow
        let vault_key = ctx.accounts.vault.key();
        let reward_bump = ctx.bumps.vault_reward_authority;
        let escrow_bump = ctx.bumps.vault_escrow_authority;
        let mint_key = ctx.accounts.mint.key();

        // --- SANITY CHECKS (before any CPI) ---
        require!(
            accessor::mint(&ctx.accounts.creator_token_ata.to_account_info())? == mint_key,
            VaultError::BadMint
        );
        require!(
            accessor::mint(&ctx.accounts.reward_vault_ata.to_account_info())? == mint_key,
            VaultError::BadMint
        );
        require!(
            accessor::mint(&ctx.accounts.dev_token_ata.to_account_info())? == mint_key,
            VaultError::BadMint
        );
        require!(
            accessor::mint(&ctx.accounts.vault_escrow_ata.to_account_info())? == mint_key,
            VaultError::BadMint
        );
        require!(
            accessor::authority(&ctx.accounts.reward_vault_ata.to_account_info())?
                == ctx.accounts.vault_reward_authority.key(),
            VaultError::BadMint
        );
        require!(
            accessor::authority(&ctx.accounts.vault_escrow_ata.to_account_info())?
                == ctx.accounts.vault_escrow_authority.key(),
            VaultError::BadMint
        );
        require!(
            accessor::authority(&ctx.accounts.creator_token_ata.to_account_info())?
                == ctx.accounts.creator.key(),
            VaultError::BadMint
        );
        require!(
            accessor::authority(&ctx.accounts.dev_token_ata.to_account_info())?
                == ctx.accounts.dev_treasury.key(),
            VaultError::BadMint
        );

        // 4) creator sends gross rewards to vault reward ATA
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_ata.to_account_info(),
                    to: ctx.accounts.reward_vault_ata.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            reward_gross,
        )?;

        // 5) Skim 3% fee to dev ATA (signed by reward PDA)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault_ata.to_account_info(),
                    to: ctx.accounts.dev_token_ata.to_account_info(),
                    authority: ctx.accounts.vault_reward_authority.to_account_info(),
                },
                &[&[b"vault_reward", vault_key.as_ref(), &[reward_bump]]],
            ),
            fee_tokens,
        )?;

        // 6) Write vault state
        let vault = &mut ctx.accounts.vault;
        vault.id = vault_id;                          // NEW: persist the id
        vault.creator = ctx.accounts.creator.key();
        vault.mint = ctx.accounts.mint.key();
        vault.start_time = start;
        vault.end_time = end;
        vault.reward_net = reward_net;
        vault.reward_fee = fee_tokens;
        vault.reward_gross = reward_gross;
        vault.rate_fp = (reward_net as u128)
            .checked_mul(RATE_SCALE).ok_or(VaultError::MathOverflow)?
            .checked_div(TERM_SECS as u128).ok_or(VaultError::MathOverflow)?;
        vault.emission_acc_fp = 0;
        vault.emitted = 0;
        vault.last_update_time = start;
        vault.acc_reward_per_token = 0;
        vault.unallocated = 0;
        vault.total_staked = 0;
        vault.bump = ctx.bumps.vault;
        vault.vault_escrow_bump = escrow_bump;
        vault.vault_reward_bump = reward_bump;
        vault.version = 1;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        let v = &mut ctx.accounts.vault;

        // Allow deposits only within [start_time, end_time]
        let now = Clock::get()?.unix_timestamp;
        require!(now >= v.start_time && now <= v.end_time, VaultError::VaultEnded);

        update_rewards(v)?;

        let vault_key = v.key();

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

        let user_stake = &mut ctx.accounts.user_stake;
        if user_stake.initialized == 0 {
            user_stake.owner = ctx.accounts.user.key();
            user_stake.vault = vault_key;
            user_stake.amount = 0;
            user_stake.reward_debt = 0;
            user_stake.initialized = 1;
        }

        v.total_staked = v.total_staked.checked_add(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.amount = user_stake.amount.checked_add(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.reward_debt = reward_debt(user_stake.amount, v.acc_reward_per_token);

        Ok(())
    }



    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        update_rewards(vault)?;

        payout_pending(
            vault,
            &ctx.accounts.user_stake,
            ctx.accounts.reward_vault_ata.to_account_info(),
            ctx.accounts.user_token_ata.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.vault_reward_authority.to_account_info(),
        )?;

        let user = &mut ctx.accounts.user_stake;
        user.reward_debt = reward_debt(user.amount, vault.acc_reward_per_token);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, claim_all: bool) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault_key = ctx.accounts.vault.key();
        let escrow_bump = ctx.accounts.vault.vault_escrow_bump;
        let vault = &mut ctx.accounts.vault;
        update_rewards(vault)?;

        if claim_all {
            payout_pending(
                vault,
                &ctx.accounts.user_stake,
                ctx.accounts.reward_vault_ata.to_account_info(),
                ctx.accounts.user_token_ata.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.vault_reward_authority.to_account_info(),
            )?;
        }

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
                &[&[b"vault_escrow", vault_key.as_ref(), &[escrow_bump]]],
            ),
            amount,
        )?;

        user_stake.amount =
            user_stake.amount.checked_sub(amount).ok_or(VaultError::MathOverflow)?;
        vault.total_staked =
            vault.total_staked.checked_sub(amount).ok_or(VaultError::MathOverflow)?;
        user_stake.reward_debt = reward_debt(user_stake.amount, vault.acc_reward_per_token);
        Ok(())
    }

    pub fn close_vault(ctx: Context<CloseVaultTreasuryOnly>) -> Result<()> {
    let vault_key = ctx.accounts.vault.key();
    let reward_bump = ctx.accounts.vault.vault_reward_bump;
    let escrow_bump = ctx.accounts.vault.vault_escrow_bump;
    let vault = &mut ctx.accounts.vault;
    let now = Clock::get()?.unix_timestamp;

    // Enforce 3-year grace period after the vault term ends
    require!(
        now >= vault.end_time + THREE_YEARS_SECS,
        VaultError::GraceNotElapsed
    );

    // ── Sweep remaining rewards -> dev token ATA
    let rewards_left = ctx.accounts.reward_vault_ata.amount;
    if rewards_left > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault_ata.to_account_info(),
                    to: ctx.accounts.dev_token_ata.to_account_info(),
                    authority: ctx.accounts.vault_reward_authority.to_account_info(),
                },
                &[&[b"vault_reward", vault_key.as_ref(), &[reward_bump]]],
            ),
            rewards_left,
        )?;
    }

    // ── Sweep remaining escrow (unwithdrawn deposits) -> dev token ATA
    let escrow_left = ctx.accounts.vault_escrow_ata.amount;
    if escrow_left > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_escrow_ata.to_account_info(),
                    to: ctx.accounts.dev_token_ata.to_account_info(),
                    authority: ctx.accounts.vault_escrow_authority.to_account_info(),
                },
                &[&[b"vault_escrow", vault_key.as_ref(), &[escrow_bump]]],
            ),
            escrow_left,
        )?;
        // reset global accounting since all deposits were swept
        vault.total_staked = 0;
    }

    // Ensure both ATAs are empty before closing
    ctx.accounts.reward_vault_ata.reload()?;
    ctx.accounts.vault_escrow_ata.reload()?;
    require!(ctx.accounts.reward_vault_ata.amount == 0, VaultError::RewardNotEmpty);
    require!(ctx.accounts.vault_escrow_ata.amount == 0, VaultError::EscrowNotEmpty);

    // Close reward ATA (lamports to dev treasury)
    token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.reward_vault_ata.to_account_info(),
                destination: ctx.accounts.dev_treasury.to_account_info(),
                authority: ctx.accounts.vault_reward_authority.to_account_info(),
            },
            &[&[b"vault_reward", vault_key.as_ref(), &[reward_bump]]],
        ),
    )?;

    // Close escrow ATA (lamports to dev treasury)
    token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.vault_escrow_ata.to_account_info(),
                destination: ctx.accounts.dev_treasury.to_account_info(),
                authority: ctx.accounts.vault_escrow_authority.to_account_info(),
            },
            &[&[b"vault_escrow", vault_key.as_ref(), &[escrow_bump]]],
        ),
    )?;

    Ok(())
}
pub fn admin_close_expired_stake(_ctx: Context<AdminCloseExpiredStake>) -> Result<()> {
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

    // Accumulate fractional emission
    let add_fp = v.rate_fp.checked_mul(dt).ok_or(VaultError::MathOverflow)?;
    v.emission_acc_fp = v.emission_acc_fp.checked_add(add_fp).ok_or(VaultError::MathOverflow)?;

    // Convert to integer tokens and keep remainder
    let mut to_emit = (v.emission_acc_fp / RATE_SCALE) as u64;
    v.emission_acc_fp %= RATE_SCALE;

    // Clamp to remaining
    let remaining = v.reward_net.saturating_sub(v.emitted);
    if to_emit > remaining {
        to_emit = remaining;
    }

    if to_emit > 0 {
        if v.total_staked == 0 {
            v.unallocated = v.unallocated.saturating_add(to_emit);
        } else {
            let total = (v.unallocated as u128)
                .checked_add(to_emit as u128).ok_or(VaultError::MathOverflow)?;
            let incr = total
                .checked_mul(RPT_SCALE).ok_or(VaultError::MathOverflow)?
                .checked_div(v.total_staked as u128).ok_or(VaultError::MathOverflow)?;
            v.acc_reward_per_token = v.acc_reward_per_token
                .checked_add(incr).ok_or(VaultError::MathOverflow)?;
            v.unallocated = 0;
        }
        v.emitted = v.emitted.saturating_add(to_emit);
    } else {
        // NEW: If the term is over (or no fresh emission this tick), but there are stakers
        // and unallocated rewards, flush the backlog now so late-but-still-in-term stakers
        // receive prior empty-time emissions.
        if v.total_staked > 0 && v.unallocated > 0 {
            let incr = (v.unallocated as u128)
                .checked_mul(RPT_SCALE).ok_or(VaultError::MathOverflow)?
                .checked_div(v.total_staked as u128).ok_or(VaultError::MathOverflow)?;
            v.acc_reward_per_token = v.acc_reward_per_token
                .checked_add(incr).ok_or(VaultError::MathOverflow)?;
            v.unallocated = 0;
        }
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
fn payout_pending<'info>(
    v: &mut Account<'info, Vault>,
    user: &Account<'info, UserStake>,
    reward_vault_ata: AccountInfo<'info>,
    user_token_ata: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    vault_reward_authority: AccountInfo<'info>,
) -> Result<()> {
    let pend = pending_rewards(user.amount, user.reward_debt, v.acc_reward_per_token);
    if pend == 0 {
        return Ok(());
    }

    let reward_balance = accessor::amount(&reward_vault_ata)?;
    let to_pay = pend.min(reward_balance);

    token::transfer(
        CpiContext::new_with_signer(
            token_program,
            Transfer {
                from: reward_vault_ata,
                to: user_token_ata,
                authority: vault_reward_authority,
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
#[instruction(vault_id: u64)] // allow using the instruction arg in PDA seeds
pub struct CreateVault<'info> {
    #[account(
        seeds = [b"state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub creator: Signer<'info>,

    // Fixed dev treasury (SOL receiver for the creation fee)
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: SystemAccount<'info>,

    pub mint: Account<'info, Mint>,

    // The vault state. Bump captured in `ctx.bumps.vault`.
    #[account(
        init,
        payer = creator,
        space = 8 + Vault::SPACE,
        seeds = [
            b"vault",
            mint.key().as_ref(),
            creator.key().as_ref(),
            &vault_id.to_le_bytes()         // NEW: allow multiple vaults per (mint, creator)
        ],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: PDA authority for escrow (no lamports held here)
    #[account(seeds = [b"vault_escrow", vault.key().as_ref()], bump)]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    /// CHECK: PDA authority for reward (no lamports held here)
    #[account(seeds = [b"vault_reward", vault.key().as_ref()], bump)]
    pub vault_reward_authority: UncheckedAccount<'info>,

    /// CHECK: pre-created vault escrow ATA (must match escrow mint/authority)
    #[account(mut)]
    pub vault_escrow_ata: UncheckedAccount<'info>,

    /// CHECK: pre-created reward vault ATA (must match reward mint/authority)
    #[account(mut)]
    pub reward_vault_ata: UncheckedAccount<'info>,

    /// CHECK: creator’s funding ATA (must exist)
    #[account(mut)]
    pub creator_token_ata: UncheckedAccount<'info>,

    /// CHECK: dev treasury’s ATA (pre-created)
    #[account(mut)]
    pub dev_token_ata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    // intentionally dropping associated_token_program + rent to reduce stack
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
        associated_token::mint = mint,
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

    /// CHECK: PDA signer for reward ATA (if claim_all)
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
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminCloseExpiredStake<'info> {
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: Signer<'info>,

    /// Close the UserStake PDA to the dev treasury after grace
    #[account(
        mut,
        close = dev_treasury,
        constraint = user_stake.vault == vault.key(),
        // 3-year grace after vault term
        constraint = Clock::get()?.unix_timestamp >= vault.end_time + THREE_YEARS_SECS @ VaultError::GraceNotElapsed,
    )]
    pub user_stake: Account<'info, UserStake>,

    /// Needed for end_time; must be typed to pass constraint above
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct CloseVaultTreasuryOnly<'info> {
    /// Treasury must sign and be the fixed DEV_TREASURY
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: Signer<'info>,

    /// Vault state is closed to treasury
    #[account(
        mut,
        has_one = mint,
        close = dev_treasury
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    /// CHECK: Reward PDA signer
    #[account(
        seeds = [b"vault_reward", vault.key().as_ref()],
        bump = vault.vault_reward_bump
    )]
    pub vault_reward_authority: UncheckedAccount<'info>,

    /// CHECK: Escrow PDA signer
    #[account(
        seeds = [b"vault_escrow", vault.key().as_ref()],
        bump = vault.vault_escrow_bump
    )]
    pub vault_escrow_authority: UncheckedAccount<'info>,

    // Vault reward ATA (owned by reward PDA)
    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_reward_authority
    )]
    pub reward_vault_ata: Account<'info, TokenAccount>,

    // Vault escrow ATA (owned by escrow PDA)
    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault_escrow_authority
    )]
    pub vault_escrow_ata: Account<'info, TokenAccount>,

    // Treasury ATA (recipient of leftovers; create if missing)
    #[account(
        init_if_needed,
        payer = dev_treasury,
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
pub struct InitConfig<'info> {
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: Signer<'info>,

    #[account(
        init,
        payer = dev_treasury,
        // Anchor adds the 8-byte discriminator; you add your raw struct size.
        space = 8 + Config::SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitGlobalState<'info> {
    #[account(
        init,
        payer = dev_treasury,
        space = 8 + GlobalState::SPACE,
        seeds = [b"state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisableNewVaults<'info> {
    #[account(mut, address = DEV_TREASURY)]
    pub dev_treasury: Signer<'info>,

    #[account(mut, seeds = [b"state"], bump)]
    pub global_state: Account<'info, GlobalState>,
}
// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
#[account]
pub struct Vault {
    // immutable params
    pub id: u64,
    pub creator: Pubkey,
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
    pub const SPACE: usize = 264;
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

#[account]
pub struct GlobalState {
    pub new_vaults_disabled: bool,
    pub admin: Pubkey, // hardcoded as DEV_TREASURY on init
}
impl GlobalState {
    pub const SPACE: usize = 40;
}

#[account]
pub struct Config {
    pub new_vaults_disabled: u8, // 1 byte
    pub retired_at: i64,         // 8 bytes
}
impl Config {
    // raw struct size ONLY (no discriminator here)
    pub const SPACE: usize = 1 + 8;
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
    #[msg("Reward token account is not empty after sweep")]
    RewardNotEmpty,
    #[msg("Provided token account does not match vault mint")]
    BadMint,
     #[msg("Program is retired. New vaults are disabled.")]
    ProgramRetired,
    #[msg("Only dev treasury may retire.")]
    NotTreasury,
    #[msg("Already retired.")]
    AlreadyRetired,
    #[msg("Grace period not yet elapsed.")]
    GraceNotElapsed,
    #[msg("Vault creation has been disabled")]
    VaultCreationDisabled,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Deposits are closed for this vault")]
    VaultEnded,

}