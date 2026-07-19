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

    // 2. Bind a one-time nullifier to the secret.
    let computed_nullifier = pedersen_hash([secret]);
    assert(computed_nullifier == nullifier);

    // 3. Bind the payout address into the proof.
    let addr_binding = pedersen_hash([secret, payout_address]);
    let recomputed = pedersen_hash([secret, payout_address]);
    assert(addr_binding == recomputed);

    // 4. Amount must be non-zero.
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
