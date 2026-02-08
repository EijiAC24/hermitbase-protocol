// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ShellNFT.sol";

contract ShellNFTTest is Test {
    event ShellShed(uint256 indexed shellId, address indexed walletAddress, uint256 txCount, uint256 lifespan);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    ShellNFT nft;
    address agent = makeAddr("agent");
    address notAgent = makeAddr("notAgent");
    address shell0Wallet = makeAddr("shell0");

    function setUp() public {
        nft = new ShellNFT(agent);
    }

    // ===== Constructor =====

    function test_constructor() public view {
        assertEq(nft.agent(), agent);
        assertEq(nft.name(), "HermitBase Shells");
        assertEq(nft.symbol(), "SHELL");
        assertEq(nft.nextShellId(), 0);
    }

    // ===== Minting =====

    function test_mintShell() public {
        vm.warp(1000);
        vm.prank(agent);
        uint256 id = nft.mintShell(shell0Wallet, 100, 17, 5e16, "A brave little shell");

        assertEq(id, 0);
        assertEq(nft.nextShellId(), 1);

        ShellNFT.Shell memory s = nft.getShell(0);
        assertEq(s.walletAddress, shell0Wallet);
        assertEq(s.bornAt, 100);
        assertEq(s.shedAt, 1000);
        assertEq(s.txCount, 17);
        assertEq(s.totalValueMoved, 5e16);
        assertEq(keccak256(bytes(s.lifeSummary)), keccak256(bytes("A brave little shell")));
    }

    function test_mintShell_ownerIsAgent() public {
        vm.warp(500);
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 100, 5, 1e16, "test");
        assertEq(nft.ownerOf(0), agent);
        assertEq(nft.balanceOf(agent), 1);
    }

    function test_mintShell_emitsEvents() public {
        vm.warp(1000);
        vm.prank(agent);

        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), agent, 0);

        vm.expectEmit(true, true, false, true);
        emit ShellShed(0, shell0Wallet, 17, 900);

        nft.mintShell(shell0Wallet, 100, 17, 5e16, "test shell");
    }

    function test_mintShell_incrementsId() public {
        vm.warp(1000);
        vm.startPrank(agent);
        uint256 id0 = nft.mintShell(makeAddr("w0"), 0, 5, 1e16, "shell 0");
        uint256 id1 = nft.mintShell(makeAddr("w1"), 100, 10, 2e16, "shell 1");
        uint256 id2 = nft.mintShell(makeAddr("w2"), 200, 15, 3e16, "shell 2");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(nft.nextShellId(), 3);
        assertEq(nft.balanceOf(agent), 3);
    }

    function test_mintShell_revertNotAgent() public {
        vm.prank(notAgent);
        vm.expectRevert("Only agent can call");
        nft.mintShell(shell0Wallet, 100, 5, 1e16, "should fail");
    }

    // ===== Token URI / SVG =====

    function test_tokenURI_returnsDataURI() public {
        vm.warp(7300);
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 100, 17, 5e16, "A brave shell");

        string memory uri = nft.tokenURI(0);
        bytes memory uriBytes = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
        assertTrue(uriBytes.length > prefix.length + 50);
    }

    function test_tokenURI_revertNonExistent() public {
        vm.expectRevert("Shell does not exist");
        nft.tokenURI(999);
    }

    function test_tokenURI_differentShellsDifferentURIs() public {
        vm.startPrank(agent);
        vm.warp(1000);
        nft.mintShell(makeAddr("w0"), 0, 5, 1e16, "quiet shell");
        vm.warp(2000);
        nft.mintShell(makeAddr("w1"), 1000, 50, 1e18, "active shell");
        vm.stopPrank();

        string memory uri0 = nft.tokenURI(0);
        string memory uri1 = nft.tokenURI(1);
        assertTrue(keccak256(bytes(uri0)) != keccak256(bytes(uri1)));
    }

    // ===== getShell =====

    function test_getShell_revertNonExistent() public {
        vm.expectRevert("Shell does not exist");
        nft.getShell(999);
    }

    // ===== totalShells =====

    function test_totalShells() public {
        assertEq(nft.totalShells(), 0);
        vm.startPrank(agent);
        nft.mintShell(makeAddr("w0"), 0, 1, 0, "s0");
        assertEq(nft.totalShells(), 1);
        nft.mintShell(makeAddr("w1"), 0, 1, 0, "s1");
        assertEq(nft.totalShells(), 2);
        vm.stopPrank();
    }

    // ===== ERC-721 Basics =====

    function test_transferFrom() public {
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 0, 5, 1e16, "test");

        address receiver = makeAddr("receiver");
        vm.prank(agent);
        nft.transferFrom(agent, receiver, 0);

        assertEq(nft.ownerOf(0), receiver);
        assertEq(nft.balanceOf(agent), 0);
        assertEq(nft.balanceOf(receiver), 1);
    }

    function test_transferFrom_revertNotOwner() public {
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 0, 5, 1e16, "test");

        vm.prank(notAgent);
        vm.expectRevert("Not authorized");
        nft.transferFrom(agent, notAgent, 0);
    }

    function test_approve_and_transfer() public {
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 0, 5, 1e16, "test");

        address spender = makeAddr("spender");
        vm.prank(agent);
        nft.approve(spender, 0);
        assertEq(nft.getApproved(0), spender);

        vm.prank(spender);
        nft.transferFrom(agent, spender, 0);
        assertEq(nft.ownerOf(0), spender);
    }

    function test_supportsInterface() public view {
        assertTrue(nft.supportsInterface(0x80ac58cd));
        assertTrue(nft.supportsInterface(0x5b5e139f));
        assertTrue(nft.supportsInterface(0x01ffc9a7));
        assertFalse(nft.supportsInterface(0xdeadbeef));
    }

    // ===== Edge Cases =====

    function test_mintShell_zeroTxCount() public {
        vm.warp(500);
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 0, 0, 0, "Empty shell");
        ShellNFT.Shell memory s = nft.getShell(0);
        assertEq(s.txCount, 0);
        assertEq(s.totalValueMoved, 0);
        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
    }

    function test_mintShell_highTxCount() public {
        vm.warp(100000);
        vm.prank(agent);
        nft.mintShell(shell0Wallet, 0, 1000, 100e18, "Very active shell");
        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 0);
    }
}
