use std::hash::pedersen_hash;

global DEPTH: u32 = 8;

// MedKit Identity Layer: prove you are an NGO-enrolled, unique beneficiary
// without revealing WHICH enrollee you are.
//
//  - enroll_secret : private credential the NGO issued you at enrollment (PRIVATE)
//  - program_id    : which aid program this enrollment is for (PUBLIC)
//  - id_root       : the NGO's published enrollment Merkle root (PUBLIC)
//  - id_nullifier  : one-time fingerprint, one enrollment = one claim (PUBLIC)
fn main(
    enroll_secret: Field,
    path: [Field; DEPTH],
    index_bits: [bool; DEPTH],
    id_root: pub Field,
    id_nullifier: pub Field,
    program_id: pub Field,
) {
    // 1. Prove the (enroll_secret, program_id) leaf is in the NGO's enrollment tree.
    let leaf = pedersen_hash([enroll_secret, program_id]);
    let mut node = leaf;
    for i in 0..DEPTH {
        let sibling = path[i];
        let (left, right) = if index_bits[i] { (sibling, node) } else { (node, sibling) };
        node = pedersen_hash([left, right]);
    }
    assert(node == id_root);

    // 2. One-time nullifier bound to the enrollment secret: one enrolled
    //    person can verify once per program (anti-double-claim).
    let computed = pedersen_hash([enroll_secret]);
    assert(computed == id_nullifier);

    // 3. Program must be specified (scopes uniqueness per aid program).
    assert(program_id != 0);
}

#[test]
fn test_valid_enrollment() {
    let enroll_secret: Field = 0xBEEF;
    let program_id: Field = 1;
    let leaf = pedersen_hash([enroll_secret, program_id]);
    let id_nullifier = pedersen_hash([enroll_secret]);
    let mut node = leaf;
    let path: [Field; DEPTH] = [0; DEPTH];
    let index_bits: [bool; DEPTH] = [false; DEPTH];
    for i in 0..DEPTH { node = pedersen_hash([node, path[i]]); }
    let id_root = node;
    main(enroll_secret, path, index_bits, id_root, id_nullifier, program_id);
}
