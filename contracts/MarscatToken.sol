// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MarscatToken is ERC20, Ownable, Pausable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    mapping(address => bool) public isBlacklisted;

    event BlacklistAdded(address indexed account);
    event BlacklistRemoved(address indexed account);
    event BlackFundsTransferred(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    error ZeroAddress();
    error AlreadyBlacklisted(address account);
    error NotBlacklisted(address account);
    error RecipientBlacklisted(address account);
    error RenounceNotAllowed();
    error CannotBlacklistOwner();

    constructor(address mintTo_) ERC20("Marscat Token", "MCAT") Ownable(mintTo_) {
        _mint(mintTo_, TOTAL_SUPPLY);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addBlacklist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            if (account == address(0)) revert ZeroAddress();
            if (account == owner()) revert CannotBlacklistOwner();
            if (isBlacklisted[account]) revert AlreadyBlacklisted(account);
            isBlacklisted[account] = true;
            emit BlacklistAdded(account);
        }
    }

    function removeBlacklist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            if (!isBlacklisted[account]) revert NotBlacklisted(account);
            isBlacklisted[account] = false;
            emit BlacklistRemoved(account);
        }
    }

    function transferBlackFunds(
        address[] calldata blacklisted,
        address recipient
    ) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (isBlacklisted[recipient]) revert RecipientBlacklisted(recipient);
        for (uint256 i = 0; i < blacklisted.length; i++) {
            address from = blacklisted[i];
            if (!isBlacklisted[from]) revert NotBlacklisted(from);
            uint256 amount = balanceOf(from);
            if (amount == 0) continue;
            super._update(from, recipient, amount);
            emit BlackFundsTransferred(from, recipient, amount);
        }
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceNotAllowed();
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        if (isBlacklisted[newOwner]) revert CannotBlacklistOwner();
        super.transferOwnership(newOwner);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        _requireNotPaused();
        if (from != address(0) && isBlacklisted[from]) revert ERC20InvalidSender(from);
        if (to != address(0) && isBlacklisted[to]) revert ERC20InvalidReceiver(to);
        if (from != msg.sender && isBlacklisted[msg.sender]) revert ERC20InvalidSender(msg.sender);
        super._update(from, to, value);
    }

    function _approve(
        address owner_,
        address spender,
        uint256 value,
        bool emitEvent
    ) internal override whenNotPaused {
        if (isBlacklisted[owner_]) revert ERC20InvalidApprover(owner_);
        if (isBlacklisted[spender]) revert ERC20InvalidSpender(spender);
        super._approve(owner_, spender, value, emitEvent);
    }
}
