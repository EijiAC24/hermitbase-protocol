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

        // Warm factor: more txs = warmer palette (blue/green -> ochre/sienna)
        uint256 w = _min(255, s.txCount * 12);

        string memory svg = string(abi.encodePacked(
            _svgHead(),
            _svgFacets(w),
            _svgEyeAndClaws(w),
            _svgText(shellId, s.txCount, lifespanH, lifespanM)
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

    // ===== SVG Builder (Cubist Shell) =====

    function _svgHead() internal pure returns (string memory) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
            '<rect width="200" height="200" fill="#0e1117"/>'
            '<polygon points="10,10 30,10 10,30" fill="#1a2744" opacity="0.6"/>'
            '<polygon points="190,190 170,190 190,170" fill="#1a2744" opacity="0.6"/>';
    }

    function _svgFacets(uint256 w) internal pure returns (string memory) {
        return string(abi.encodePacked(
            // Large frame triangle
            _poly("35,165 100,30 165,165", 26, 39, 68, 50),
            // Shell facets — angular cubist composition
            _poly("100,38 138,82 112,98 78,68",
                _min(255, 30 + w/3), _min(255, 50 + w/6), _min(255, 120 - w/4), 85),
            _poly("138,82 162,142 128,132 112,98",
                _min(255, w * 3/4), _min(255, 100 - w/5), _min(255, 60 + w/8), 80),
            _poly("78,68 112,98 92,142 48,128",
                _min(255, 45 + w/4), _min(255, 90 + w/5), _min(255, 80 - w/6), 80),
            _polyInner(w)
        ));
    }

    function _polyInner(uint256 w) internal pure returns (string memory) {
        return string(abi.encodePacked(
            // Center facets
            _poly("112,98 128,132 114,152 92,142",
                _min(255, 180 + w/4), _min(255, 140 - w/3), _min(255, 40 + w/5), 75),
            // Inner spiral core
            _poly("108,94 124,118 112,132 96,114",
                _min(255, w/2 + 80), _min(255, w/3 + 60), 30, 70),
            // Tiny inner accent
            _poly("110,108 118,122 108,126 102,116",
                _min(255, 200 + w/5), _min(255, 160 - w/4), _min(255, 50 + w/3), 60)
        ));
    }

    function _svgEyeAndClaws(uint256 w) internal pure returns (string memory) {
        return string(abi.encodePacked(
            // Eye — golden ring with dark pupil
            '<circle cx="88" cy="72" r="10" fill="none" stroke="rgb(',
            _toString(_min(255, 200 + w/5)), ',', _toString(_min(255, 160 - w/8)), ',74)" stroke-width="2.5"/>',
            '<circle cx="87" cy="71" r="4" fill="#0e1117"/>',
            '<circle cx="88" cy="70" r="1.5" fill="rgb(',
            _toString(_min(255, 200 + w/5)), ',', _toString(_min(255, 160 - w/8)), ',74)"/>',
            // Claw lines
            '<line x1="48" y1="150" x2="28" y2="178" stroke="rgb(',
            _toString(_min(255, w/2 + 60)), ',', _toString(_min(255, 80 - w/6)), ',50)" stroke-width="2.5" stroke-linecap="round"/>',
            '<line x1="58" y1="155" x2="42" y2="180" stroke="rgb(',
            _toString(_min(255, w/2 + 40)), ',', _toString(_min(255, 70 - w/6)), ',45)" stroke-width="2" stroke-linecap="round"/>'
        ));
    }

    function _svgText(uint256 id, uint256 txs, uint256 h, uint256 m) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="100" y="16" text-anchor="middle" fill="#c8a04a" font-size="10" font-family="monospace" letter-spacing="2">SHELL #',
            _toString(id), '</text>'
            '<text x="100" y="192" text-anchor="middle" fill="#6b6560" font-size="8" font-family="monospace">',
            _toString(txs), ' txs  |  ', _toString(h), 'h ', _toString(m), 'm</text>'
            '</svg>'
        ));
    }

    function _poly(string memory pts, uint256 r, uint256 g, uint256 b, uint256 op) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<polygon points="', pts, '" fill="rgb(',
            _toString(r), ',', _toString(g), ',', _toString(b),
            ')" stroke="#111" stroke-width="1.5" opacity="0.',
            _toString(op), '"/>'
        ));
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
