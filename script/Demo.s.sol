// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShellNFT.sol";

contract DemoShellNFT is Script {
    function run() external {
        address shellNFT = vm.envAddress("SHELL_NFT_ADDRESS");
        vm.startBroadcast();

        ShellNFT nft = ShellNFT(shellNFT);

        // Shell #0: A quiet wallet that lived briefly
        uint256 id0 = nft.mintShell(
            address(0xdead000000000000000000000000000000000001),
            block.timestamp - 7200, // born 2h ago
            5,
            0.01 ether,
            "A quiet shell. Sent a few offerings to the void."
        );
        console.log("Minted Shell #", id0);

        // Shell #1: An active wallet
        uint256 id1 = nft.mintShell(
            address(0xdEaD000000000000000000000000000000000002),
            block.timestamp - 14400, // born 4h ago
            25,
            0.05 ether,
            "An adventurous shell. Explored many reefs on Base."
        );
        console.log("Minted Shell #", id1);

        // Shell #2: A very active wallet
        uint256 id2 = nft.mintShell(
            address(0xDeaD000000000000000000000000000000000003),
            block.timestamp - 3600, // born 1h ago
            50,
            0.1 ether,
            "A fierce shell. Burned bright and fast."
        );
        console.log("Minted Shell #", id2);

        console.log("Total shells:", nft.totalShells());
        vm.stopBroadcast();
    }
}
