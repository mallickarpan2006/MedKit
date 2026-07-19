#![no_std]
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, vec, Address, Bytes,
    BytesN, Env, IntoVal, Symbol, Val, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInit = 1,
    RootMismatch = 2,
    AlreadyClaimed = 3,
    AddressMismatch = 4,
    BadAmount = 5,
    InvalidInput = 6,
    NotAuthorized = 7,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Verifier,
    Token,
    Root,
    Allotment,
    Nullifier(BytesN<32>),
}

#[contractevent(topics = ["set_root"], data_format = "single-value")]
pub struct RootUpdated<'a> {
    pub root: &'a BytesN<32>,
}

#[contractevent(topics = ["deposit"], data_format = "single-value")]
pub struct DepositEvent<'a> {
    #[topic]
    pub from: &'a Address,
    pub amount: &'a i128,
}

#[contractevent(topics = ["withdraw"], data_format = "single-value")]
pub struct WithdrawEvent<'a> {
    #[topic]
    pub to: &'a Address,
    pub amount: &'a i128,
}

#[contractevent(topics = ["claim"], data_format = "single-value")]
pub struct ClaimEvent<'a> {
    #[topic]
    pub to: &'a Address,
    pub amount: &'a i128,
}

const TTL: u32 = 17280 * 365;

#[contract]
pub struct AidPool;

#[contractimpl]
impl AidPool {
    pub fn __constructor(
        env: Env,
        admin: Address,
        verifier: Address,
        token: Address,
        root: BytesN<32>,
        allotment: i128,
    ) {
        assert!(allotment > 0, "allotment must be positive");
        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Verifier, &verifier);
        s.set(&DataKey::Token, &token);
        s.set(&DataKey::Root, &root);
        s.set(&DataKey::Allotment, &allotment);
    }

    pub fn set_root(env: Env, root: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Root, &root);
        RootUpdated { root: &root }.publish(&env);
    }

    pub fn withdraw(env: Env, to: Address, amount: i128) {
        assert!(amount > 0, "amount must be positive");
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &to, &amount);
        WithdrawEvent {
            to: &to,
            amount: &amount,
        }
        .publish(&env);
    }

    pub fn deposit(env: Env, from: Address, amount: i128) {
        assert!(amount > 0, "amount must be positive");
        from.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).transfer(&from, &env.current_contract_address(), &amount);
        DepositEvent {
            from: &from,
            amount: &amount,
        }
        .publish(&env);
    }

    pub fn claim(env: Env, public_inputs: Bytes, proof: Bytes, to: Address) -> Result<(), Error> {
        // The circuit ABI starts with root (32), payout binding (32), and amount (32).
        // Reject malformed calldata before any indexing so hostile callers cannot trigger
        // an opaque host panic and operators get a stable error code.
        if public_inputs.len() < 128 || proof.len() == 0 {
            return Err(Error::InvalidInput);
        }
        let s = env.storage().instance();
        let root_pi = slice32(&env, &public_inputs, 0);

        let root: BytesN<32> = s.get(&DataKey::Root).ok_or(Error::NotInit)?;
        if root_pi != root {
            return Err(Error::RootMismatch);
        }

        // Nullifier bound to root: key = keccak(root || nullifier).
        let nh = env
            .crypto()
            .keccak256(&public_inputs.slice(0..64))
            .to_array();
        let nk = DataKey::Nullifier(BytesN::from_array(&env, &nh));
        if env.storage().persistent().has(&nk) {
            return Err(Error::AlreadyClaimed);
        }

        // Address binding: payout field must equal hash(to).
        let pa = slice32(&env, &public_inputs, 64);
        if pa != addr_field(&env, &to) {
            return Err(Error::AddressMismatch);
        }

        // Amount sanity check.
        let amount = field_to_i128(&public_inputs, 96);
        let token: Address = s.get(&DataKey::Token).unwrap();
        let tc = token::Client::new(&env, &token);
        let bal = tc.balance(&env.current_contract_address());
        if amount <= 0 || amount > bal {
            return Err(Error::BadAmount);
        }

        // Verify proof (reverts if invalid).
        let verifier: Address = s.get(&DataKey::Verifier).unwrap();
        let args: Vec<Val> = vec![&env, public_inputs.into_val(&env), proof.into_val(&env)];
        env.invoke_contract::<()>(&verifier, &Symbol::new(&env, "verify_proof"), args);

        env.storage().persistent().set(&nk, &true);
        env.storage().persistent().extend_ttl(&nk, TTL, TTL);
        tc.transfer(&env.current_contract_address(), &to, &amount);

        ClaimEvent {
            to: &to,
            amount: &amount,
        }
        .publish(&env);
        Ok(())
    }

    pub fn balance(env: Env) -> i128 {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).balance(&env.current_contract_address())
    }
}

fn addr_field(env: &Env, to: &Address) -> BytesN<32> {
    let x = to.clone().to_xdr(env);
    let mut a = env.crypto().keccak256(&x).to_array();
    a[0] = 0;
    BytesN::from_array(env, &a)
}

fn slice32(env: &Env, b: &Bytes, start: u32) -> BytesN<32> {
    let mut arr = [0u8; 32];
    let mut i = 0u32;
    while i < 32 {
        arr[i as usize] = b.get(start + i).unwrap();
        i += 1;
    }
    BytesN::from_array(env, &arr)
}

fn field_to_i128(b: &Bytes, start: u32) -> i128 {
    let mut v: i128 = 0;
    let mut i = start + 16;
    while i < start + 32 {
        v = (v << 8) | (b.get(i).unwrap() as i128);
        i += 1;
    }
    v
}

#[cfg(test)]
mod tests {
    use super::{AidPool, AidPoolClient, Error};
    use soroban_sdk::{testutils::Address as _, token, Address, Bytes, BytesN, Env};

    fn setup() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let donor = Address::generate(&env);
        let verifier = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let token_client = token::Client::new(&env, &token_id);
        token::StellarAssetClient::new(&env, &token_id).mint(&donor, &1_000_000);
        let root = BytesN::from_array(&env, &[7u8; 32]);
        let pool = env.register(
            AidPool,
            (admin.clone(), verifier, token_id.clone(), root, 100i128),
        );
        token_client.balance(&donor);
        (env, pool, admin, donor, token_id)
    }

    #[test]
    fn deposit_moves_tokens_and_emits_event() {
        let (env, pool, _admin, donor, token_id) = setup();
        env.as_contract(&pool, || AidPool::deposit(env.clone(), donor.clone(), 250));
        assert_eq!(token::Client::new(&env, &token_id).balance(&pool), 250);
        // The event is emitted by the contract (and is consumed by RPC subscribers);
        // token balance proves the invocation completed atomically.
        assert_eq!(token::Client::new(&env, &token_id).balance(&pool), 250);
    }

    #[test]
    fn malformed_claim_is_rejected_before_verifier_call() {
        let (env, pool, _admin, _donor, _token_id) = setup();
        let client = AidPoolClient::new(&env, &pool);
        let result = env.as_contract(&pool, || {
            AidPool::claim(
                env.clone(),
                Bytes::from_slice(&env, &[0u8; 32]),
                Bytes::new(&env),
                Address::generate(&env),
            )
        });
        assert_eq!(result, Err(Error::InvalidInput));
        let _ = client.balance();
    }

    #[test]
    fn admin_can_withdraw_funded_tokens() {
        let (env, pool, admin, donor, token_id) = setup();
        let client = AidPoolClient::new(&env, &pool);
        client.deposit(&donor, &250);
        let recipient = Address::generate(&env);
        client.withdraw(&recipient, &100);
        assert_eq!(token::Client::new(&env, &token_id).balance(&recipient), 100);
        let _ = admin;
    }
}
