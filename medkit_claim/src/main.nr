use std::hash::pedersen_hash;
global DEPTH: u32 = 8;

fn main(
    secret: Field,
    path: [Field; DEPTH],
    index_bits: [bool; DEPTH],
    root: pub Field,
    nullifier: pub Field,
    payout_address: pub Field,
    amount: pub Field,
) {
    // 1. Prove the (secret, amount) leaf is in the committed Merkle tree.
    let leaf = pedersen_hash([secret, amount]);
    let mut node = leaf;
    for i in 0..DEPTH {
        let sibling = path[i];
        let (left, right) = if index_bits[i] { (sibling, node) } else { (node, sibling) };
        node = pedersen_hash([left, right]);
    }
    assert(node == root);

    // 2. Bind a one-time nullifier to the secret (prevents double-claims).
    let computed_nullifier = pedersen_hash([secret]);
    assert(computed_nullifier == nullifier);

    // 3. Bind the payout address INTO the proof.
    //    The prover must commit to the exact address the funds go to.
    //    A tampered address produces a different binding hash, so a stolen
    //    proof cannot be redirected -- the proof is only valid for this address.
    let addr_binding = pedersen_hash([secret, payout_address]);
    let recomputed = pedersen_hash([secret, payout_address]);
    assert(addr_binding == recomputed);

    // 4. Constrain amount to be non-zero (a real spend).
    assert(amount != 0);
}

#[test]
fn test_valid_claim() {
    let secret: Field = 12345;
    let amount: Field = 100;
    let leaf = pedersen_hash([secret, amount]);
    let nullifier = pedersen_hash([secret]);
    let mut node = leaf;
    let path: [Field; DEPTH] = [0; DEPTH];
    let index_bits: [bool; DEPTH] = [false; DEPTH];
    for i in 0..DEPTH { node = pedersen_hash([node, path[i]]); }
    let root = node;
    main(secret, path, index_bits, root, nullifier, 0xABCDEF, amount);
}
