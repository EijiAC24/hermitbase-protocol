// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ShellNFT {
    // ===== ERC-721 Core (minimal inline) =====
    string public name = "HermitBase Shells";
    string public symbol = "SHELL";

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ShellShed(uint256 indexed shellId, address indexed walletAddress, uint256 txCount, uint256 lifespan);

    // ===== Shell Data =====
    struct Shell {
        address walletAddress;
        uint256 bornAt;
        uint256 shedAt;
        uint256 txCount;
        uint256 totalValueMoved;
        string  lifeSummary;
    }

    mapping(uint256 => Shell) public shells;
    uint256 public nextShellId;
    address public immutable agent;

    constructor(address _agent) {
        agent = _agent;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Only agent can call");
        _;
    }

    // ===== Shell Functions =====

    function mintShell(
        address walletAddress,
        uint256 bornAt,
        uint256 txCount,
        uint256 totalValueMoved,
        string calldata lifeSummary
    ) external onlyAgent returns (uint256 shellId) {
        shellId = nextShellId++;
        shells[shellId] = Shell({
            walletAddress: walletAddress,
            bornAt: bornAt,
            shedAt: block.timestamp,
            txCount: txCount,
            totalValueMoved: totalValueMoved,
            lifeSummary: lifeSummary
        });

        _mint(agent, shellId);
        uint256 lifespan = block.timestamp - bornAt;
        emit ShellShed(shellId, walletAddress, txCount, lifespan);
    }

    function getShell(uint256 shellId) external view returns (Shell memory) {
        require(_owners[shellId] != address(0), "Shell does not exist");
        return shells[shellId];
    }

    function totalShells() external view returns (uint256) {
        return nextShellId;
    }

    function tokenURI(uint256 shellId) external view returns (string memory) {
        require(_owners[shellId] != address(0), "Shell does not exist");
        Shell memory s = shells[shellId];
        uint256 lifespan = s.shedAt - s.bornAt;
        uint256 lifespanH = lifespan / 3600;
        uint256 lifespanM = (lifespan % 3600) / 60;

        // Color: more txs = warmer
        uint256 r = _min(255, s.txCount * 15);
        uint256 g = s.txCount * 10 > 200 ? 0 : 200 - s.txCount * 10;
        uint256 b = s.txCount * 12 > 255 ? 0 : 255 - s.txCount * 12;
        uint256 sz = 30 + _min(70, s.totalValueMoved / 1e15);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
            '<rect width="200" height="200" fill="#0a1628"/>',
            _circle(100, 100, sz, r, g, b, 80),
            _circle(90 + sz/4, 90 + sz/4, sz/2, _min(255,r+30), _min(255,g+30), _min(255,b+30), 60),
            _circle(95 + sz/3, 95 + sz/3, sz/4, _min(255,r+60), _min(255,g+60), _min(255,b+60), 40),
            '<text x="100" y="22" text-anchor="middle" fill="white" font-size="12" font-family="monospace">Shell #',
            _toString(shellId), '</text>'
            '<text x="100" y="185" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">',
            _toString(s.txCount), ' txs | ', _toString(lifespanH), 'h ', _toString(lifespanM), 'm</text>'
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"Shell #', _toString(shellId),
            '","description":"', s.lifeSummary,
            '","image":"data:image/svg+xml;base64,', _base64(bytes(svg)),
            '","attributes":[{"trait_type":"txCount","value":', _toString(s.txCount),
            '},{"trait_type":"lifespanHours","value":', _toString(lifespanH),
            '},{"trait_type":"totalValueMoved","value":', _toString(s.totalValueMoved),
            '}]}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", _base64(bytes(json))));
    }

    // ===== ERC-721 Implementation =====

    function balanceOf(address owner) external view returns (uint256) { return _balances[owner]; }
    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId]; require(o != address(0), "Token does not exist"); return o;
    }

    function approve(address to, uint256 tokenId) external {
        address owner = _owners[tokenId];
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) external view returns (address) { return _tokenApprovals[tokenId]; }
    function isApprovedForAll(address owner, address operator) external view returns (bool) { return _operatorApprovals[owner][operator]; }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f || interfaceId == 0x01ffc9a7;
    }

    // ===== Internal =====

    function _mint(address to, uint256 tokenId) internal {
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(_owners[tokenId] == from, "Not owner");
        require(to != address(0), "Zero address");
        delete _tokenApprovals[tokenId];
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = _owners[tokenId];
        return spender == owner || _tokenApprovals[tokenId] == spender || _operatorApprovals[owner][spender];
    }

    // ===== Utilities =====

    function _circle(uint256 cx, uint256 cy, uint256 r, uint256 cr, uint256 cg, uint256 cb, uint256 op) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<circle cx="', _toString(cx), '" cy="', _toString(cy), '" r="', _toString(r),
            '" fill="rgb(', _toString(cr), ',', _toString(cg), ',', _toString(cb),
            ')" opacity="0.', _toString(op), '"/>'
        ));
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) { digits--; buffer[digits] = bytes1(uint8(48 + value % 10)); value /= 10; }
        return string(buffer);
    }

    function _base64(bytes memory data) internal pure returns (string memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        if (data.length == 0) return "";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);
        assembly {
            let tablePtr := add(TABLE, 1)
            let resultPtr := add(result, 32)
            let dataPtr := data
            let endPtr := add(data, mload(data))
            for {} lt(dataPtr, endPtr) {} {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            switch mod(mload(data), 3)
            case 1 { mstore8(sub(resultPtr, 1), 0x3d) mstore8(sub(resultPtr, 2), 0x3d) }
            case 2 { mstore8(sub(resultPtr, 1), 0x3d) }
        }
        assembly { mstore(result, encodedLen) }
        return string(result);
    }
}
