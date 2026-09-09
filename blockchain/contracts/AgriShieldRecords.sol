// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgriShieldRecords {
    address public owner;

    struct Record {
        uint256 timestamp;
        address recordedBy;
        bool exists;
    }

    // Mapping from canonical hash string to Record
    mapping(string => Record) public records;

    event RecordAdded(string indexed canonicalHash, uint256 timestamp, address recordedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addRecord(string memory canonicalHash) external onlyOwner {
        require(!records[canonicalHash].exists, "Record already exists");

        records[canonicalHash] = Record({
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            exists: true
        });

        emit RecordAdded(canonicalHash, block.timestamp, msg.sender);
    }

    function verifyRecord(string memory canonicalHash) external view returns (bool, uint256, address) {
        Record memory rec = records[canonicalHash];
        return (rec.exists, rec.timestamp, rec.recordedBy);
    }
}
