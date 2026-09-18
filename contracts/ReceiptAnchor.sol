// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReceiptAnchor — onchain anchors for Cense verdict receipts.
/// Every paid check produces a receiptHash (sha256 of the canonical verdict).
/// Anchoring makes each verdict curl-able: anyone can verify a receipt existed
/// at a block. The attribution tag rides the transaction calldata (ERC-8021).
contract ReceiptAnchor {
    mapping(bytes32 => uint256) public anchoredAt;
    uint256 public total;

    event Anchored(bytes32 indexed receiptHash, uint256 indexed blockNumber);

    function anchor(bytes32 receiptHash) external {
        require(anchoredAt[receiptHash] == 0, "already anchored");
        anchoredAt[receiptHash] = block.number;
        total += 1;
        emit Anchored(receiptHash, block.number);
    }

    function anchorBatch(bytes32[] calldata hashes) external {
        for (uint256 i = 0; i < hashes.length; i++) {
            if (anchoredAt[hashes[i]] == 0) {
                anchoredAt[hashes[i]] = block.number;
                total += 1;
                emit Anchored(hashes[i], block.number);
            }
        }
    }
}
