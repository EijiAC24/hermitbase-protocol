// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShellNFT.sol";

contract DeployShellNFT is Script {
    function run() external {
        address agent = vm.envAddress("AGENT_ADDRESS");
        vm.startBroadcast();
        ShellNFT nft = new ShellNFT(agent);
        vm.stopBroadcast();
        console.log("ShellNFT deployed at:", address(nft));
        console.log("Agent:", agent);
    }
}
