import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MarscatToken", function () {
  async function deploy() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MarscatToken");
    const token = await Token.deploy(owner.address);
    return { token, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("sets name, symbol, decimals", async function () {
      const { token } = await loadFixture(deploy);
      expect(await token.name()).to.equal("Marscat Token");
      expect(await token.symbol()).to.equal("MCAT");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints TOTAL_SUPPLY to owner", async function () {
      const { token, owner } = await loadFixture(deploy);
      const supply = await token.TOTAL_SUPPLY();
      expect(await token.totalSupply()).to.equal(supply);
      expect(await token.balanceOf(owner.address)).to.equal(supply);
    });
  });

  describe("Pause", function () {
    it("owner can pause and unpause", async function () {
      const { token } = await loadFixture(deploy);
      await token.pause();
      expect(await token.paused()).to.be.true;
      await token.unpause();
      expect(await token.paused()).to.be.false;
    });

    it("non-owner cannot pause", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await expect(token.connect(user1).pause()).to.be.reverted;
    });

    it("transfers blocked when paused", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.pause();
      await expect(token.transfer(user1.address, 1)).to.be.reverted;
    });

    it("approve blocked when paused", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.pause();
      await expect(token.approve(user1.address, 1)).to.be.reverted;
    });

    it("transferFrom blocked when paused", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deploy);
      await token.approve(user1.address, 100);
      await token.pause();
      await expect(
        token.connect(user1).transferFrom(owner.address, user2.address, 1)
      ).to.be.reverted;
    });
  });

  describe("addBlacklist", function () {
    it("adds single address", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      expect(await token.isBlacklisted(user1.address)).to.be.true;
    });

    it("adds multiple addresses in batch", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address, user2.address]);
      expect(await token.isBlacklisted(user1.address)).to.be.true;
      expect(await token.isBlacklisted(user2.address)).to.be.true;
    });

    it("non-owner cannot blacklist", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await expect(token.connect(user1).addBlacklist([user2.address])).to.be.reverted;
    });

    it("reverts on zero address", async function () {
      const { token } = await loadFixture(deploy);
      await expect(
        token.addBlacklist([ethers.ZeroAddress])
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts on owner address", async function () {
      const { token, owner } = await loadFixture(deploy);
      await expect(
        token.addBlacklist([owner.address])
      ).to.be.revertedWithCustomError(token, "CannotBlacklistOwner");
    });

    it("reverts on duplicate in batch", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await expect(
        token.addBlacklist([user1.address])
      ).to.be.revertedWithCustomError(token, "AlreadyBlacklisted");
    });

    it("emits BlacklistAdded per address", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await expect(token.addBlacklist([user1.address, user2.address]))
        .to.emit(token, "BlacklistAdded").withArgs(user1.address)
        .and.to.emit(token, "BlacklistAdded").withArgs(user2.address);
    });
  });

  describe("removeBlacklist", function () {
    it("removes single address", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await token.removeBlacklist([user1.address]);
      expect(await token.isBlacklisted(user1.address)).to.be.false;
    });

    it("removes multiple addresses in batch", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address, user2.address]);
      await token.removeBlacklist([user1.address, user2.address]);
      expect(await token.isBlacklisted(user1.address)).to.be.false;
      expect(await token.isBlacklisted(user2.address)).to.be.false;
    });

    it("reverts if address not blacklisted", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await expect(
        token.removeBlacklist([user1.address])
      ).to.be.revertedWithCustomError(token, "NotBlacklisted");
    });

    it("emits BlacklistRemoved per address", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address, user2.address]);
      await expect(token.removeBlacklist([user1.address, user2.address]))
        .to.emit(token, "BlacklistRemoved").withArgs(user1.address)
        .and.to.emit(token, "BlacklistRemoved").withArgs(user2.address);
    });
  });

  describe("Blacklist transfer guards", function () {
    it("blacklisted address cannot send tokens", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.transfer(user1.address, 100);
      await token.addBlacklist([user1.address]);
      await expect(token.connect(user1).transfer(user2.address, 1)).to.be.reverted;
    });

    it("blacklisted address cannot receive tokens", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await expect(token.transfer(user1.address, 1)).to.be.reverted;
    });
  });

  describe("transferBlackFunds", function () {
    it("transfers funds from single blacklisted address", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.transfer(user1.address, 500);
      await token.addBlacklist([user1.address]);
      await token.transferBlackFunds([user1.address], user2.address);
      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await token.balanceOf(user2.address)).to.equal(500);
    });

    it("transfers funds from multiple blacklisted addresses", async function () {
      const { token, user1, user2, user3 } = await loadFixture(deploy);
      await token.transfer(user1.address, 300);
      await token.transfer(user2.address, 200);
      await token.addBlacklist([user1.address, user2.address]);
      await token.transferBlackFunds([user1.address, user2.address], user3.address);
      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await token.balanceOf(user2.address)).to.equal(0);
      expect(await token.balanceOf(user3.address)).to.equal(500);
    });

    it("emits BlackFundsTransferred per address", async function () {
      const { token, user1, user2, user3 } = await loadFixture(deploy);
      await token.transfer(user1.address, 300);
      await token.transfer(user2.address, 200);
      await token.addBlacklist([user1.address, user2.address]);
      await expect(token.transferBlackFunds([user1.address, user2.address], user3.address))
        .to.emit(token, "BlackFundsTransferred").withArgs(user1.address, user3.address, 300)
        .and.to.emit(token, "BlackFundsTransferred").withArgs(user2.address, user3.address, 200);
    });

    it("reverts if address not blacklisted", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await expect(
        token.transferBlackFunds([user1.address], user2.address)
      ).to.be.revertedWithCustomError(token, "NotBlacklisted");
    });

    it("reverts if recipient is zero address", async function () {
      const { token, user1 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await expect(
        token.transferBlackFunds([user1.address], ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts if recipient is blacklisted", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address, user2.address]);
      await expect(
        token.transferBlackFunds([user1.address], user2.address)
      ).to.be.revertedWithCustomError(token, "RecipientBlacklisted");
    });

    it("skips blacklisted address with zero balance", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await token.transferBlackFunds([user1.address], user2.address);
      expect(await token.balanceOf(user2.address)).to.equal(0);
    });

    it("works when contract is paused", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.transfer(user1.address, 500);
      await token.addBlacklist([user1.address]);
      await token.pause();
      await token.transferBlackFunds([user1.address], user2.address);
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("non-owner cannot call", async function () {
      const { token, user1, user2 } = await loadFixture(deploy);
      await token.addBlacklist([user1.address]);
      await expect(
        token.connect(user2).transferBlackFunds([user1.address], user2.address)
      ).to.be.reverted;
    });
  });

  describe("renounceOwnership", function () {
    it("always reverts", async function () {
      const { token } = await loadFixture(deploy);
      await expect(token.renounceOwnership()).to.be.revertedWithCustomError(
        token, "RenounceNotAllowed"
      );
    });
  });
});
