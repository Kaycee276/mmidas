const merchantWalletService = require('../services/merchant-wallet.service');
const bachsService = require('../services/bachs.service');
const { successResponse } = require('../utils/responseFormatter');

class MerchantWalletController {
  async fundWalletCheckout(req, res, next) {
    try {
      const origin = req.get('origin') || req.get('referer');
      const session = await bachsService.createMerchantWalletFundingCheckout({
        merchantId: req.user.id,
        amount: req.validatedData.amount,
        origin,
      });
      successResponse(res, session, 'Merchant wallet checkout session created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getWalletInfo(req, res, next) {
    try {
      const walletInfo = await merchantWalletService.getWalletInfo(req.user.id);
      successResponse(res, walletInfo, 'Wallet info retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async withdrawFunds(req, res, next) {
    try {
      const transaction = await merchantWalletService.withdrawFunds(
        req.user.id,
        req.validatedData.amount
      );
      successResponse(res, { transaction }, 'Withdrawal successful');
    } catch (error) {
      next(error);
    }
  }

  async getTransactionHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await merchantWalletService.getTransactionHistory(req.user.id, page, limit);
      successResponse(res, result, 'Transaction history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MerchantWalletController();
